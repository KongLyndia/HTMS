using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HTMS_API.Models
{
    [Table("TaskActivityLog")]
    public class TaskActivityLog
    {
        [Key]
        public Guid LogId { get; set; } = Guid.NewGuid();

        [Required]
        public Guid TaskId { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [Required]
        [MaxLength(50)]
        public string ActionType { get; set; } = null!; // 'SUBMIT', 'APPROVE', 'REJECT', 'STATUS_CHANGE'

        [MaxLength(20)]
        public string? OldStatus { get; set; }

        [MaxLength(20)]
        public string? NewStatus { get; set; }

        public string? Note { get; set; } // Lý do nếu Reject hoặc ghi chú thêm

        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}