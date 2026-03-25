using HTMS_API.DTOs;

namespace HTMS_API.Services.Interfaces
{
    public interface INotificationService
    {
        System.Threading.Tasks.Task<NotificationSummaryDto> GetSummaryAsync(Guid userId, int page = 1, int pageSize = 20);
        System.Threading.Tasks.Task MarkReadAsync(Guid userId, Guid notificationId);
        System.Threading.Tasks.Task MarkAllReadAsync(Guid userId);
        System.Threading.Tasks.Task DeleteAsync(Guid userId, Guid notificationId);

        // Tạo notification + push realtime qua SignalR
        System.Threading.Tasks.Task<Guid> CreateAsync(CreateNotificationDto dto);

        // Push riêng (dùng khi không cần lưu DB, ví dụ: thông báo tạm thời)
        System.Threading.Tasks.Task PushAsync(Guid receiverUserId, NotificationDto payload);

        // Push event MyTasksUpdated đến user cụ thể qua NotificationHub
        // FE lắng nghe để invalidate my-tasks cache
        System.Threading.Tasks.Task PushMyTasksUpdatedAsync(Guid userId);
    }
}