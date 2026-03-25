namespace HTMS_API.DTOs.Dashboard;

// ── StatCards ──────────────────────────────────────────────────────────
public class DashboardStatsDto
{
    public int TasksToday { get; set; }  // Task được assign hôm nay
    public int TasksInProgress { get; set; }  // Status = "In Progress"
    public int TasksCompletedThisWeek { get; set; }
    public int ProjectCount { get; set; }  // Số dự án đang tham gia
    public double CompletionRate { get; set; } // % đúng hạn tuần này
}

// ── StatsChart — 7 ngày qua ───────────────────────────────────────────
public class ChartDataPointDto
{
    public string Day { get; set; } = string.Empty; // "T2", "T3"...
    public int Completed { get; set; }
    public int Total { get; set; }
}

// ── TaskList — Assigned to Me ──────────────────────────────────────────
public class AssignedTaskDto
{
    public Guid TaskId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string ProjectName { get; set; } = string.Empty;
    public string TaskStatus { get; set; } = string.Empty;
    public string? Priority { get; set; }
    public DateTime? DueDate { get; set; }
}

// ── PersonalTask — TodoList ────────────────────────────────────────────
public class PersonalTaskDto
{
    public Guid PersonalTaskId { get; set; }
    public string Title { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
    public DateTime? DueDate { get; set; }
}

public class CreatePersonalTaskDto
{
    public string Title { get; set; } = string.Empty;
    public DateTime? DueDate { get; set; }
}

// ── ProjectProgress ────────────────────────────────────────────────────
public class ProjectProgressDto
{
    public Guid ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public int TotalTasks { get; set; }
    public int DoneTasks { get; set; }
    public double Percentage { get; set; }
}

// ── MyTasks — Full AssignedTask với ProjectId ────────────────────────
public class MyAssignedTaskDto
{
    public Guid TaskId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string TaskStatus { get; set; } = string.Empty;
    public string? Priority { get; set; }
    public DateTime? DueDate { get; set; }
}