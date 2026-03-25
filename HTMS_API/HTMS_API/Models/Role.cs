using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HTMS_API.Models
{
    [Table("Role")]
    public class Role
    {
        [Key]
        public Guid RoleId { get; set; } = Guid.NewGuid();
        [Required]
        [MaxLength(50)]
        public string RoleName { get; set; } = null!;
    }
}