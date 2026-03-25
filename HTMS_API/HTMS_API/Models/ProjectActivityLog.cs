using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HTMS_API.Models
{
    [Table("ProjectActivityLog")]
    public class ProjectActivityLog
    {
        [Key]
        public Guid LogId { get; set; } = Guid.NewGuid();
        public Guid ProjectId { get; set; }
        public Guid UserId { get; set; }

        // CREATE_TASK | UPDATE_TASK | DELETE_TASK
        // STATUS_CHANGE | SUBMIT | APPROVE | REJECT
        // COMMENT | DELETE_COMMENT
        // ATTACH | DELETE_ATTACH
        // ADD_MEMBER | REMOVE_MEMBER | CHANGE_ROLE
        [MaxLength(50)]
        public string ActionType { get; set; } = null!;

        // Task | Comment | Attachment | Member
        [MaxLength(20)]
        public string EntityType { get; set; } = null!;

        // Tên task / preview comment / tên file / tên người
        [MaxLength(255)]
        public string? EntityName { get; set; }

        // Giá trị cũ (status cũ, role cũ, deadline cũ...)
        [MaxLength(255)]
        public string? OldValue { get; set; }

        // Giá trị mới
        [MaxLength(255)]
        public string? NewValue { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}