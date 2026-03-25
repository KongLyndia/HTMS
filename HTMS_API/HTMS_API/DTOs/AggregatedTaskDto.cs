using System.ComponentModel.DataAnnotations;

namespace HTMS_API.DTOs.MyTasks
{
    /// <summary>
    /// DTO thống nhất cho cả PersonalTask và Task dự án,
    /// trả về endpoint GET /api/my-tasks
    /// </summary>
    public class AggregatedTaskDto
    {
        public Guid Id { get; set; }

        /// <summary>"personal" hoặc "project"</summary>
        public string Type { get; set; } = "personal";

        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public DateTime? DueDate { get; set; }

        // Chỉ có với Task dự án
        public string? Priority { get; set; }      // Urgent | High | Medium | Low
        public string? TaskStatus { get; set; }    // Todo | In Progress | Pending | Rejected
        public Guid? ProjectId { get; set; }
        public string? ProjectName { get; set; }
        public string? ColumnName { get; set; }

        // Chỉ có với PersonalTask
        public bool IsCompleted { get; set; }

        public DateTime CreatedAt { get; set; }
    }

    public class CompletePersonalTaskRequest
    {
        // Body rỗng – chỉ dùng Id trên URL
    }

    public class CreatePersonalTaskRequest
    {
        [Required]
        [MaxLength(255)]
        public string Title { get; set; } = null!;

        public string? Description { get; set; }

        public DateTime? DueDate { get; set; }
    }
}