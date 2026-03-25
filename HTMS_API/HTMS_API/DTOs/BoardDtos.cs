namespace HTMS_API.DTOs.Board
{
    // ═══════════════════════════════════════════════════════
    // TaskStatus flow: Todo → In Progress → Pending → Completed
    //                                    ↘ Rejected → In Progress
    // ═══════════════════════════════════════════════════════

    public class BoardMemberDto
    {
        public Guid UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }
        public string Role { get; set; } = "Member";
    }

    public class BoardAssigneeDto
    {
        public Guid UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }
    }

    public class AttachmentDto
    {
        public Guid AttachmentId { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string FileUrl { get; set; } = string.Empty;
        public bool IsEvidence { get; set; }
        public Guid UploadedById { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class TaskCommentDto
    {
        public Guid CommentId { get; set; }
        public string Content { get; set; } = string.Empty;
        public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string? UserAvatar { get; set; }
        public DateTime CreatedAt { get; set; }
        // File đính kèm trong comment (từ bảng Attachment)
        public string? AttachmentUrl { get; set; }
        public string? AttachmentName { get; set; }
        public Guid? AttachmentId { get; set; }
    }

    public class ActivityLogDto
    {
        public Guid LogId { get; set; }
        public string ActionType { get; set; } = string.Empty;
        public string? OldStatus { get; set; }
        public string? NewStatus { get; set; }
        public string? Note { get; set; }
        public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string? UserAvatar { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class BoardTaskDto
    {
        public Guid TaskId { get; set; }
        public Guid ColumnId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Priority { get; set; }
        public DateTime? DueDate { get; set; }
        public Guid? AssigneeId { get; set; }
        public BoardAssigneeDto? Assignee { get; set; }
        public Guid CreatorId { get; set; }
        public string TaskStatus { get; set; } = "Todo";
        public bool IsApproved { get; set; }
        public Guid? ApprovedById { get; set; }
        public int Position { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public List<AttachmentDto> Attachments { get; set; } = [];
        public List<TaskCommentDto> Comments { get; set; } = [];
        public List<ActivityLogDto> ActivityLogs { get; set; } = [];
    }

    public class BoardColumnDto
    {
        public Guid ColumnId { get; set; }
        public string ColumnName { get; set; } = string.Empty;
        public int Position { get; set; }
        public List<BoardTaskDto> Tasks { get; set; } = [];
    }

    public class BoardDataDto
    {
        public Guid ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public string MyRole { get; set; } = "Member";
        public Guid MyUserId { get; set; }
        public List<BoardMemberDto> Members { get; set; } = [];
        public List<BoardColumnDto> Columns { get; set; } = [];
    }

    // ── Request bodies ────────────────────────────────────────────────

    // Manager tạo task trong cột Todo
    public class CreateTaskRequest
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Priority { get; set; } // Low | Medium | High | Urgent
        public DateTime? DueDate { get; set; }
        public Guid? AssigneeId { get; set; }
    }

    // Manager chỉnh sửa task (chỉ Manager)
    public class UpdateTaskRequest
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public string? Priority { get; set; }
        public DateTime? DueDate { get; set; }
        public Guid? AssigneeId { get; set; }
        public bool ClearAssignee { get; set; } = false;
    }

    // Assignee kéo sang In Progress (POST /tasks/{id}/start) — không cần body
    // Assignee submit minh chứng (POST /tasks/{id}/submit) — multipart file

    // Manager duyệt hoặc từ chối
    public class ReviewTaskRequest
    {
        public bool Approve { get; set; }
        public string? Reason { get; set; } // Bắt buộc khi Approve = false
    }

    public class AddCommentRequest
    {
        public string Content { get; set; } = string.Empty;
    }

    public class DeleteCommentRequest { } // placeholder — dùng route param
}