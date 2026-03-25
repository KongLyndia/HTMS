using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HTMS_API.Models
{
    [Table("ProjectFile")]
    public class ProjectFile
    {
        [Key]
        public Guid FileId { get; set; } = Guid.NewGuid();
        public Guid ProjectId { get; set; }
        public Guid UploadedById { get; set; }

        [MaxLength(255)]
        public string FileName { get; set; } = null!;

        [MaxLength(500)]
        public string FileUrl { get; set; } = null!;

        [MaxLength(100)]
        public string? FileType { get; set; } // image/pdf/doc/xlsx/...

        public long FileSize { get; set; } // bytes

        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}