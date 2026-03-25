using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HTMS_API.Models
{
    [Table("User")]
    public class User
    {
        [Key]
        public Guid UserId { get; set; } = Guid.NewGuid();
        [Required]
        [MaxLength(255)]
        public string Email { get; set; } = null!;
        [Required]
        public string PasswordHash { get; set; } = null!;
        [MaxLength(150)]
        public string? FullName { get; set; }
        public string? AvatarUrl { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public bool IsActive { get; set; } = true;
    }
}