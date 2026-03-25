using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HTMS_API.Models
{
    [Table("Comment")]
    public class Comment
    {
        [Key]
        public Guid CommentId { get; set; } = Guid.NewGuid();

        [Required]
        public Guid TaskId { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [Required]
        public string Content { get; set; } = null!;

        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}