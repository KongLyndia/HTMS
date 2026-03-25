using HTMS_API.Data;
using HTMS_API.DTOs;
using HTMS_API.Hubs;
using HTMS_API.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace HTMS_API.Services
{
    public class NotificationService : INotificationService
    {
        private readonly AppDbContext _db;
        private readonly IHubContext<NotificationHub> _hub;

        public NotificationService(
            AppDbContext db,
            IHubContext<NotificationHub> hub)
        {
            _db = db;
            _hub = hub;
        }

        // ── Lấy danh sách + unread count ─────────────────────────────
        public async System.Threading.Tasks.Task<NotificationSummaryDto> GetSummaryAsync(
            Guid userId, int page = 1, int pageSize = 20)
        {
            var unreadCount = await _db.Notifications
                .CountAsync(n => n.UserId == userId && !n.IsRead);

            var items = await (
                from n in _db.Notifications
                join sender in _db.Users
                    on n.SenderId equals sender.UserId into sg
                from s in sg.DefaultIfEmpty()
                where n.UserId == userId
                orderby n.CreatedAt descending
                select new NotificationDto
                {
                    NotificationId = n.NotificationId,
                    Title = n.Title,
                    Message = n.Message,
                    IsRead = n.IsRead,
                    LinkUrl = n.LinkUrl,
                    SenderName = s != null ? s.FullName : "Hệ thống",
                    SenderAvatar = s != null ? s.AvatarUrl : null,
                    CreatedAt = n.CreatedAt,
                }
            )
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

            return new NotificationSummaryDto { UnreadCount = unreadCount, Items = items };
        }

        // ── Đánh dấu 1 đã đọc ────────────────────────────────────────
        public async System.Threading.Tasks.Task MarkReadAsync(Guid userId, Guid notificationId)
        {
            var n = await _db.Notifications
                .FirstOrDefaultAsync(x => x.NotificationId == notificationId && x.UserId == userId)
                ?? throw new Exception("Không tìm thấy thông báo");

            if (!n.IsRead)
            {
                n.IsRead = true;
                await _db.SaveChangesAsync();
            }
        }

        // ── Đánh dấu tất cả đã đọc ───────────────────────────────────
        public async System.Threading.Tasks.Task MarkAllReadAsync(Guid userId)
        {
            var unread = await _db.Notifications
                .Where(n => n.UserId == userId && !n.IsRead)
                .ToListAsync();

            if (unread.Count == 0) return;
            unread.ForEach(n => n.IsRead = true);
            await _db.SaveChangesAsync();
        }

        // ── Xóa ──────────────────────────────────────────────────────
        public async System.Threading.Tasks.Task DeleteAsync(Guid userId, Guid notificationId)
        {
            var n = await _db.Notifications
                .FirstOrDefaultAsync(x => x.NotificationId == notificationId && x.UserId == userId)
                ?? throw new Exception("Không tìm thấy thông báo");

            _db.Notifications.Remove(n);
            await _db.SaveChangesAsync();
        }

        // ── Tạo + push realtime ───────────────────────────────────────
        public async System.Threading.Tasks.Task<Guid> CreateAsync(CreateNotificationDto dto)
        {
            // 1. Lưu vào DB
            var entity = new Models.Notification
            {
                NotificationId = Guid.NewGuid(),
                UserId = dto.UserId,
                SenderId = dto.SenderId,
                Title = dto.Title,
                Message = dto.Message,
                LinkUrl = dto.LinkUrl,
                IsRead = false,
                CreatedAt = DateTime.Now,
            };
            _db.Notifications.Add(entity);
            await _db.SaveChangesAsync();

            // 2. Lấy tên sender để push
            string senderName = "Hệ thống";
            string? senderAvatar = null;
            if (dto.SenderId.HasValue)
            {
                var sender = await _db.Users.FindAsync(dto.SenderId.Value);
                if (sender != null)
                {
                    senderName = sender.FullName ?? sender.Email;
                    senderAvatar = sender.AvatarUrl;
                }
            }

            // 3. Push SignalR đến group = userId người nhận
            var payload = new NotificationDto
            {
                NotificationId = entity.NotificationId,
                Title = entity.Title,
                Message = entity.Message,
                IsRead = false,
                LinkUrl = entity.LinkUrl,
                SenderName = senderName,
                SenderAvatar = senderAvatar,
                CreatedAt = entity.CreatedAt,
            };
            await PushAsync(dto.UserId, payload);

            return entity.NotificationId;
        }

        // ── Push-only (không lưu DB) ──────────────────────────────────
        public async System.Threading.Tasks.Task PushAsync(Guid receiverUserId, NotificationDto payload)
        {
            await _hub.Clients
                .Group(receiverUserId.ToString())
                .SendAsync("ReceiveNotification", payload);
        }

        // ── Push MyTasksUpdated ────────────────────────────────────────
        // Gửi tới đúng user để FE invalidate my-tasks query
        public async System.Threading.Tasks.Task PushMyTasksUpdatedAsync(Guid userId)
        {
            await _hub.Clients
                .Group(userId.ToString())
                .SendAsync("MyTasksUpdated");
        }
    }
}