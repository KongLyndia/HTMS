using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HTMS_API.Models
{
    [Table("Attachment")]
    public class Attachment
    {
        [Key]
        public Guid AttachmentId { get; set; } = Guid.NewGuid();
        public Guid TaskId { get; set; }
        [Required]
        [MaxLength(255)]
        public string FileName { get; set; } = null!;
        [Required]
        public string FileUrl { get; set; } = null!;
        public Guid UploadedById { get; set; }
        public bool IsEvidence { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}