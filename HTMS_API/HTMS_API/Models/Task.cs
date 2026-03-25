using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HTMS_API.Models
{
    [Table("Task")]
    public class Task
    {
        [Key]
        public Guid TaskId { get; set; } = Guid.NewGuid();
        public Guid ColumnId { get; set; }
        [Required]
        [MaxLength(255)]
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        [MaxLength(20)]
        public string? Priority { get; set; }
        public DateTime? DueDate { get; set; }

        public Guid? AssigneeId { get; set; }
        public Guid CreatorId { get; set; }

        // Duyệt công việc
        [MaxLength(20)]
        public string TaskStatus { get; set; } = "Todo";
        public bool IsApproved { get; set; } = false;
        public Guid? ApprovedById { get; set; }
        public DateTime? ApprovedAt { get; set; }

        public int Position { get; set; } = 0;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime? UpdatedAt { get; set; }
    }
}