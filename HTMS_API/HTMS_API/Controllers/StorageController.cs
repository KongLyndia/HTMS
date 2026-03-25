using System.Security.Claims;
using HTMS_API.Data;
using HTMS_API.Hubs;
using HTMS_API.Models;
using HTMS_API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace HTMS_API.Controllers
{
    [Authorize]
    [Route("api/project/{projectId}/files")]
    [ApiController]
    public class StorageController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly ICloudinaryService _cloudinary;
        private readonly IHubContext<BoardHub> _hub;

        public StorageController(
            AppDbContext db,
            ICloudinaryService cloudinary,
            IHubContext<BoardHub> hub)
        {
            _db = db;
            _cloudinary = cloudinary;
            _hub = hub;
        }

        private Guid Me => Guid.Parse(
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException());

        private async Task<string?> GetRoleAsync(Guid userId, Guid projectId)
        {
            var pm = await _db.ProjectMembers
                .FirstOrDefaultAsync(x => x.ProjectId == projectId && x.UserId == userId);
            if (pm == null) return null;
            var role = await _db.Roles.FindAsync(pm.RoleId);
            return role?.RoleName;
        }

        // ── GET /api/project/{projectId}/files ────────────────────────
        [HttpGet]
        public async Task<IActionResult> GetFiles(Guid projectId)
        {
            var role = await GetRoleAsync(Me, projectId);
            if (role == null) return Forbid();

            var files = await (
                from f in _db.ProjectFiles
                join u in _db.Users on f.UploadedById equals u.UserId
                where f.ProjectId == projectId
                orderby f.CreatedAt descending
                select new
                {
                    f.FileId,
                    f.FileName,
                    f.FileUrl,
                    f.FileType,
                    f.FileSize,
                    f.CreatedAt,
                    UploaderName = u.FullName ?? u.Email,
                    UploaderAvatar = u.AvatarUrl,
                    UploadedById = f.UploadedById,
                    CanDelete = role == "Manager" || f.UploadedById == Me,
                }
            ).ToListAsync();

            return Ok(new { message = "OK", data = files });
        }

        // ── POST /api/project/{projectId}/files ───────────────────────
        [HttpPost]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadFile(
            Guid projectId, IFormFile file)
        {
            var role = await GetRoleAsync(Me, projectId);
            if (role == null) return Forbid();

            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Vui lòng chọn file" });

            if (file.Length > 50 * 1024 * 1024)
                return BadRequest(new { message = "File quá lớn (tối đa 50MB)" });

            var result = await _cloudinary.UploadAsync(file);
            if (!result.Success)
                return StatusCode(500, new { message = "Upload thất bại: " + result.Error });

            var ext = Path.GetExtension(file.FileName).ToLower().TrimStart('.');
            var fileType = file.ContentType?.Split('/')[0] switch
            {
                "image" => "image",
                "video" => "video",
                _ => ext switch
                {
                    "pdf" => "pdf",
                    "doc" or "docx" => "word",
                    "xls" or "xlsx" => "excel",
                    "ppt" or "pptx" => "powerpoint",
                    "zip" or "rar" or "7z" => "archive",
                    _ => "other",
                }
            };

            var pf = new ProjectFile
            {
                FileId = Guid.NewGuid(),
                ProjectId = projectId,
                UploadedById = Me,
                FileName = file.FileName,
                FileUrl = result.Url,
                FileType = fileType,
                FileSize = file.Length,
                CreatedAt = DateTime.Now,
            };

            _db.ProjectFiles.Add(pf);
            await _db.SaveChangesAsync();

            // Broadcast realtime
            var uploader = await _db.Users.FindAsync(Me);
            var dto = new
            {
                pf.FileId,
                pf.FileName,
                pf.FileUrl,
                pf.FileType,
                pf.FileSize,
                pf.CreatedAt,
                UploaderName = uploader?.FullName ?? uploader?.Email,
                UploaderAvatar = uploader?.AvatarUrl,
                UploadedById = pf.UploadedById,
                CanDelete = true,
            };
            await _hub.Clients.Group($"board-{projectId}").SendAsync("FileUploaded", dto);

            return Ok(new { message = "Upload thành công", data = dto });
        }

        // ── DELETE /api/project/{projectId}/files/{fileId} ────────────
        [HttpDelete("{fileId:guid}")]
        public async Task<IActionResult> DeleteFile(Guid projectId, Guid fileId)
        {
            var role = await GetRoleAsync(Me, projectId);
            if (role == null) return Forbid();

            var file = await _db.ProjectFiles
                .FirstOrDefaultAsync(f => f.FileId == fileId && f.ProjectId == projectId);
            if (file == null) return NotFound(new { message = "File không tồn tại" });

            if (role != "Manager" && file.UploadedById != Me)
                return StatusCode(403, new { message = "Bạn không có quyền xóa file này" });

            _db.ProjectFiles.Remove(file);
            await _db.SaveChangesAsync();

            await _hub.Clients.Group($"board-{projectId}").SendAsync("FileDeleted", fileId);

            return Ok(new { message = "Đã xóa file" });
        }
    }
}