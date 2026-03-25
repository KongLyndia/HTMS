using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HTMS_API.Models
{
    [Table("Project")]
    public class Project
    {
        [Key]
        public Guid ProjectId { get; set; } = Guid.NewGuid();
        [Required]
        [MaxLength(200)]
        public string ProjectName { get; set; } = null!;
        public string? Description { get; set; }
        public Guid OwnerId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime? DeletedAt { get; set; }
    }
}