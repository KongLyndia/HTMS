using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using HTMS_API.Data; // Đổi lại theo namespace Context của bạn
using HTMS_API.DTOs;
using HTMS_API.Models; // Đổi lại theo namespace Model của bạn
using HTMS_API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace HTMS_API.Services
{
    public class AuthService : IAuthService
    {
        private readonly AppDbContext _context; // Đảm bảo tên DbContext trùng với của bạn
        private readonly IConfiguration _configuration;

        public AuthService(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request)
        {
            // 1. Kiểm tra Email đã tồn tại chưa
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (existingUser != null)
            {
                throw new Exception("Email này đã được sử dụng!");
            }

            // 2. Hash mật khẩu bằng BCrypt
            string passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            // 3. Tạo User mới
            var newUser = new User // Tên Model User của bạn
            {
                UserId = Guid.NewGuid(),
                Email = request.Email,
                PasswordHash = passwordHash,
                FullName = request.FullName,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            // 4. Trả về Token luôn để đăng nhập ngay sau khi đăng ký
            string token = GenerateJwtToken(newUser);

            return new AuthResponseDto
            {
                Token = token,
                UserId = newUser.UserId,
                Email = newUser.Email,
                FullName = newUser.FullName,
                AvatarUrl = newUser.AvatarUrl
            };
        }

        public async Task<AuthResponseDto> LoginAsync(LoginRequestDto request)
        {
            // 1. Tìm user theo Email
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (user == null || !user.IsActive)
            {
                throw new Exception("Email không tồn tại hoặc tài khoản bị khóa!");
            }

            // 2. Kiểm tra mật khẩu
            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
            if (!isPasswordValid)
            {
                throw new Exception("Sai mật khẩu!");
            }

            // 3. Tạo JWT Token
            string token = GenerateJwtToken(user);

            return new AuthResponseDto
            {
                Token = token,
                UserId = user.UserId,
                Email = user.Email,
                FullName = user.FullName,
                AvatarUrl = user.AvatarUrl
            };
        }

        // Hàm Private: Tạo chuỗi JWT
        private string GenerateJwtToken(User user)
        {
            var jwtSettings = _configuration.GetSection("Jwt");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            // Dữ liệu nhét vào Token (Claims)
            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim("FullName", user.FullName)
                // Lưu ý: Project này quy định Role theo từng Project (bảng ProjectMember)
                // Nên Token tạm thời không nhét Role hệ thống vào đây, trừ khi bạn có Admin tổng.
            };

            var token = new JwtSecurityToken(
                issuer: jwtSettings["Issuer"],
                audience: jwtSettings["Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddDays(double.Parse(jwtSettings["ExpireDays"]!)),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}