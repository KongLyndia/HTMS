namespace HTMS_API.DTOs
{
    public class NotificationDto
    {
        public Guid NotificationId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public bool IsRead { get; set; }
        public string? LinkUrl { get; set; }
        public string? SenderName { get; set; }
        public string? SenderAvatar { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class NotificationSummaryDto
    {
        public int UnreadCount { get; set; }
        public List<NotificationDto> Items { get; set; } = [];
    }

    public class CreateNotificationDto
    {
        public Guid UserId { get; set; }
        public Guid? SenderId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string? LinkUrl { get; set; }
    }
}