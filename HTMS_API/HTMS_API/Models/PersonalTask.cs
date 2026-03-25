using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HTMS_API.Models
{
    [Table("PersonalTask")]
    public class PersonalTask
    {
        [Key]
        public Guid PersonalTaskId { get; set; } = Guid.NewGuid();

        [Required]
        public Guid UserId { get; set; }

        [Required]
        [MaxLength(255)]
        public string Title { get; set; } = null!;

        public string? Description { get; set; }

        public bool IsCompleted { get; set; } = false;

        public DateTime? DueDate { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}