using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using HTMS_API.Services.Interfaces;

namespace HTMS_API.Services
{
    public class CloudinaryService : ICloudinaryService
    {
        private readonly Cloudinary _cloudinary;

        // Extensions được Cloudinary hỗ trợ xem trực tiếp (không phải raw)
        private static readonly string[] IMAGE_EXTS =
            { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg" };

        private static readonly string[] VIDEO_EXTS =
            { ".mp4", ".mov", ".avi", ".mkv", ".webm" };

        // PDF + Office → upload dưới dạng "auto" để Cloudinary xử lý
        // Sẽ được lưu dưới resource_type phù hợp và URL dùng được

        public CloudinaryService(IConfiguration config)
        {
            var cloudName = config["Cloudinary:CloudName"]?.Trim();
            var apiKey = config["Cloudinary:ApiKey"]?.Trim();
            var apiSecret = config["Cloudinary:ApiSecret"]?.Trim();

            if (string.IsNullOrWhiteSpace(cloudName) ||
                string.IsNullOrWhiteSpace(apiKey) ||
                string.IsNullOrWhiteSpace(apiSecret))
                throw new Exception("Cloudinary chưa được cấu hình trong appsettings.json!");

            var account = new Account(cloudName, apiKey, apiSecret);
            _cloudinary = new Cloudinary(account) { Api = { Secure = true } };
        }

        public async Task<CloudinaryUploadResult> UploadAsync(IFormFile file)
        {
            try
            {
                await using var stream = file.OpenReadStream();
                var ext = Path.GetExtension(file.FileName).ToLowerInvariant();

                string url;

                if (IMAGE_EXTS.Contains(ext))
                {
                    // Ảnh → ImageUploadParams
                    var p = new ImageUploadParams
                    {
                        File = new FileDescription(file.FileName, stream),
                        Folder = "htms/files",
                        UniqueFilename = true,
                    };
                    var r = await _cloudinary.UploadAsync(p);
                    if (r.Error != null)
                        return new CloudinaryUploadResult { Success = false, Error = r.Error.Message };
                    url = r.SecureUrl.ToString();
                }
                else if (VIDEO_EXTS.Contains(ext))
                {
                    // Video → VideoUploadParams
                    var p = new VideoUploadParams
                    {
                        File = new FileDescription(file.FileName, stream),
                        Folder = "htms/files",
                        UniqueFilename = true,
                    };
                    var r = await _cloudinary.UploadAsync(p);
                    if (r.Error != null)
                        return new CloudinaryUploadResult { Success = false, Error = r.Error.Message };
                    url = r.SecureUrl.ToString();
                }
                else
                {
                    // PDF, Office, ZIP, v.v. → RawUploadParams
                    // Thêm fl_attachment vào URL để browser download thay vì block
                    var p = new RawUploadParams
                    {
                        File = new FileDescription(file.FileName, stream),
                        Folder = "htms/files",
                        UniqueFilename = true,
                    };
                    var r = await _cloudinary.UploadAsync(p);
                    if (r.Error != null)
                        return new CloudinaryUploadResult { Success = false, Error = r.Error.Message };

                    // Chèn fl_attachment vào URL → browser download thay vì mở inline
                    url = r.SecureUrl.ToString()
                           .Replace("/raw/upload/", "/raw/upload/fl_attachment/");
                }

                Console.WriteLine($"[Cloudinary] ✅ Uploaded: {url}");
                return new CloudinaryUploadResult { Success = true, Url = url };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Cloudinary] ❌ {ex.Message}");
                return new CloudinaryUploadResult { Success = false, Error = ex.Message };
            }
        }
    }
}