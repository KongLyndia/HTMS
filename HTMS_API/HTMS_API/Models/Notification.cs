using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HTMS_API.Models
{
    [Table("Notification")]
    public class Notification
    {
        [Key]
        public Guid NotificationId { get; set; } = Guid.NewGuid();

        [Required]
        public Guid UserId { get; set; } // Người nhận thông báo

        public Guid? SenderId { get; set; } // Người gửi (có thể null)

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = null!;

        [Required]
        [MaxLength(500)]
        public string Message { get; set; } = null!;

        public bool IsRead { get; set; } = false;

        public string? LinkUrl { get; set; } // Đường dẫn để click vào xem task/project

        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}