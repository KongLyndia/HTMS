namespace HTMS_API.Services.Interfaces
{
    public class CloudinaryUploadResult
    {
        public bool Success { get; set; }
        public string Url { get; set; } = string.Empty;
        public string? Error { get; set; }
    }

    public interface ICloudinaryService
    {
        Task<CloudinaryUploadResult> UploadAsync(IFormFile file);
    }
}