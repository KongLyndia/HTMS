using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using HTMS_API.Services.Interfaces;

namespace HTMS_API.Services
{
    public class CloudinaryService : ICloudinaryService
    {
        private readonly Cloudinary _cloudinary;

        public CloudinaryService(IConfiguration config)
        {
            var cloudName = config["Cloudinary:CloudName"]?.Trim();
            var apiKey    = config["Cloudinary:ApiKey"]?.Trim();
            var apiSecret = config["Cloudinary:ApiSecret"]?.Trim();

            Console.WriteLine($"[Cloudinary INIT] CloudName='{cloudName}' ApiKey='{apiKey}'");

            if (string.IsNullOrWhiteSpace(cloudName) || string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(apiSecret))
                throw new Exception("Cloudinary chưa được cấu hình trong appsettings.json!");

            var account  = new Account(cloudName, apiKey, apiSecret);
            _cloudinary  = new Cloudinary(account) { Api = { Secure = true } };

            Console.WriteLine("[Cloudinary INIT] Khởi tạo thành công!");
        }

        public async Task<CloudinaryUploadResult> UploadAsync(IFormFile file)
        {
            try
            {
                await using var stream = file.OpenReadStream();
                var ext     = Path.GetExtension(file.FileName).ToLowerInvariant();
                var isImage = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp" }.Contains(ext);

                if (isImage)
                {
                    var p = new ImageUploadParams
                    {
                        File           = new FileDescription(file.FileName, stream),
                        Folder         = "htms/task-evidence",
                        UniqueFilename = true,
                    };
                    var r = await _cloudinary.UploadAsync(p);
                    Console.WriteLine($"[Cloudinary UPLOAD] {(r.Error != null ? " fail" + r.Error.Message : "oke " + r.SecureUrl)}");
                    return r.Error != null
                        ? new CloudinaryUploadResult { Success = false, Error = r.Error.Message }
                        : new CloudinaryUploadResult { Success = true,  Url   = r.SecureUrl.ToString() };
                }
                else
                {
                    var p = new RawUploadParams
                    {
                        File           = new FileDescription(file.FileName, stream),
                        Folder         = "htms/task-evidence",
                        UniqueFilename = true,
                    };
                    var r = await _cloudinary.UploadAsync(p);
                    Console.WriteLine($"[Cloudinary UPLOAD] {(r.Error != null ? "fail " + r.Error.Message : "oke" + r.SecureUrl)}");
                    return r.Error != null
                        ? new CloudinaryUploadResult { Success = false, Error = r.Error.Message }
                        : new CloudinaryUploadResult { Success = true,  Url   = r.SecureUrl.ToString() };
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Cloudinary UPLOAD] fail Exception: {ex.Message}");
                return new CloudinaryUploadResult { Success = false, Error = ex.Message };
            }
        }
    }
}