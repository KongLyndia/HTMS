namespace HTMS_API.DTOs
{
    // ════════════════════════════════════════
    // REQUEST
    // ════════════════════════════════════════

    public class CreateProjectRequest
    {
        public string ProjectName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public List<ColumnInputDto> Columns { get; set; } = [];
        public List<InviteMemberDto> Members { get; set; } = [];
    }

    public class ColumnInputDto
    {
        public string Name { get; set; } = string.Empty;
        public int Position { get; set; }
    }

    public class InviteMemberDto
    {
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = "Member"; // "Manager" | "Member" | "Viewer"
    }

    public class UpdateProjectRequest
    {
        public string? ProjectName { get; set; }
        public string? Description { get; set; }
    }

    // ════════════════════════════════════════
    // RESPONSE
    // ════════════════════════════════════════

    public class ProjectCreatedDto
    {
        public Guid ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<string> Columns { get; set; } = [];
        public List<MemberResultDto> Members { get; set; } = [];
    }

    public class MemberResultDto
    {
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public bool Success { get; set; }
        public string? Error { get; set; }
    }

    public class ProjectListItemDto
    {
        public Guid ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string OwnerName { get; set; } = string.Empty;
        public string MyRole { get; set; } = string.Empty;
        public int MemberCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class ProjectDetailDto
    {
        public Guid ProjectId { get; set; }
        public string ProjectName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string OwnerName { get; set; } = string.Empty;
        public string MyRole { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public List<ProjectColumnDto> Columns { get; set; } = [];
        public List<ProjectMemberDto> Members { get; set; } = [];
    }

    public class ProjectColumnDto
    {
        public Guid ColumnId { get; set; }
        public string ColumnName { get; set; } = string.Empty;
        public int Position { get; set; }
        public int TaskCount { get; set; }
    }

    public class ProjectMemberDto
    {
        public Guid UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }
        public string Role { get; set; } = string.Empty;
        public DateTime JoinedAt { get; set; }
    }
}