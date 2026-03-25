using System.Security.Claims;
using HTMS_API.Data;
using HTMS_API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HTMS_API.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly ICloudinaryService _cloudinary;

        public UserController(AppDbContext db, ICloudinaryService cloudinary)
        {
            _db = db;
            _cloudinary = cloudinary;
        }

        private Guid Me => Guid.Parse(
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException());

        // ── GET /api/user/me ──────────────────────────────────────────
        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            var user = await _db.Users.FindAsync(Me);
            if (user == null) return NotFound();
            return Ok(new
            {
                message = "OK",
                data = new
                {
                    user.UserId,
                    user.FullName,
                    user.Email,
                    user.AvatarUrl,
                    user.CreatedAt,
                }
            });
        }

        // ── PATCH /api/user/profile ───────────────────────────────────
        // Cập nhật FullName + Avatar
        [HttpPatch("profile")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UpdateProfile(
            [FromForm] string? fullName,
            IFormFile? avatar)
        {
            var user = await _db.Users.FindAsync(Me);
            if (user == null) return NotFound();

            if (!string.IsNullOrWhiteSpace(fullName))
                user.FullName = fullName.Trim();

            if (avatar != null && avatar.Length > 0)
            {
                if (avatar.Length > 5 * 1024 * 1024)
                    return BadRequest(new { message = "Ảnh quá lớn (tối đa 5MB)" });

                var ext = Path.GetExtension(avatar.FileName).ToLower();
                var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
                if (!allowed.Contains(ext))
                    return BadRequest(new { message = "Chỉ hỗ trợ ảnh JPG, PNG, WEBP, GIF" });

                var result = await _cloudinary.UploadAsync(avatar);
                if (!result.Success)
                    return StatusCode(500, new { message = "Upload ảnh thất bại: " + result.Error });

                user.AvatarUrl = result.Url;
            }

            await _db.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật thành công",
                data = new
                {
                    user.UserId,
                    user.FullName,
                    user.Email,
                    user.AvatarUrl,
                    user.CreatedAt,
                }
            });
        }

        // ── PATCH /api/user/password ──────────────────────────────────
        [HttpPatch("password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.OldPassword) ||
                string.IsNullOrWhiteSpace(req.NewPassword))
                return BadRequest(new { message = "Vui lòng nhập đầy đủ thông tin" });

            if (req.NewPassword.Length < 6)
                return BadRequest(new { message = "Mật khẩu mới phải có ít nhất 6 ký tự" });

            if (req.NewPassword == req.OldPassword)
                return BadRequest(new { message = "Mật khẩu mới phải khác mật khẩu cũ" });

            var user = await _db.Users.FindAsync(Me);
            if (user == null) return NotFound();

            // Verify mật khẩu cũ
            if (!BCrypt.Net.BCrypt.Verify(req.OldPassword, user.PasswordHash))
                return BadRequest(new { message = "Mật khẩu hiện tại không đúng" });

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Đổi mật khẩu thành công" });
        }

        // ── GET /api/user/search?email=... ────────────────────────────
        [HttpGet("search")]
        public async Task<IActionResult> SearchByEmail([FromQuery] string email)
        {
            if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
                return BadRequest(new { message = "Email không hợp lệ" });

            var normalized = email.Trim().ToLower();
            var user = await _db.Users
                .Where(u => u.Email.ToLower() == normalized && u.IsActive)
                .Select(u => new { u.UserId, u.FullName, u.Email, u.AvatarUrl })
                .FirstOrDefaultAsync();

            if (user == null) return NotFound(new { message = "Không tìm thấy tài khoản" });
            if (user.UserId == Me) return BadRequest(new { message = "Không thể mời chính mình" });

            return Ok(new { message = "OK", data = user });
        }
    }

    public class ChangePasswordRequest
    {
        public string OldPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}