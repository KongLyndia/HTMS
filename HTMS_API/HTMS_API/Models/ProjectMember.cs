using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace HTMS_API.Models
{
    [Table("ProjectMember")]
    public class ProjectMember
    {
        public Guid ProjectId { get; set; }
        public Guid UserId { get; set; }
        public Guid RoleId { get; set; }
        public DateTime JoinedAt { get; set; } = DateTime.Now;
    }
}