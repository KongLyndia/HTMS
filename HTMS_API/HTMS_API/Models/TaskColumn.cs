using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HTMS_API.Models
{
    [Table("TaskColumn")]
    public class TaskColumn
    {
        [Key]
        public Guid ColumnId { get; set; } = Guid.NewGuid();
        public Guid ProjectId { get; set; }
        [Required]
        [MaxLength(100)]
        public string ColumnName { get; set; } = null!;
        public int Position { get; set; }
    }
}