using HTMS_API.Data;
using HTMS_API.DTOs.Dashboard;
using HTMS_API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

// Dùng alias để tránh conflict với System.Threading.Tasks.Task
using TaskModel = HTMS_API.Models.Task;

namespace HTMS_API.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly AppDbContext _db;
        public DashboardService(AppDbContext db) { _db = db; }

        // ── 1. StatCards ──────────────────────────────────────────────
        public async System.Threading.Tasks.Task<DashboardStatsDto> GetStatsAsync(Guid userId)
        {
            var today = DateTime.Now.Date;
            var weekStart = today.AddDays(-(int)today.DayOfWeek + 1); // Thứ Hai
            var weekEnd = weekStart.AddDays(7);

            var weekTasks = await _db.Tasks
                .Where(t => t.AssigneeId == userId
                         && t.CreatedAt >= weekStart
                         && t.CreatedAt < weekEnd)
                .ToListAsync();

            var inProgress = await _db.Tasks.CountAsync(t => t.AssigneeId == userId && t.TaskStatus == "In Progress");
            var projectCount = await _db.ProjectMembers.CountAsync(pm => pm.UserId == userId);

            var completedOnTime = weekTasks.Count(t =>
                t.TaskStatus == "Completed" &&
                (t.DueDate == null || t.UpdatedAt <= t.DueDate));

            var rate = weekTasks.Count > 0
                ? Math.Round((double)completedOnTime / weekTasks.Count * 100, 1)
                : 0;

            return new DashboardStatsDto
            {
                TasksToday = weekTasks.Count(t => t.CreatedAt.Date == today),
                TasksInProgress = inProgress,
                TasksCompletedThisWeek = weekTasks.Count(t => t.TaskStatus == "Completed"),
                ProjectCount = projectCount,
                CompletionRate = rate,
            };
        }

        // ── 2. Chart — 7 ngày qua ────────────────────────────────────
        public async System.Threading.Tasks.Task<List<ChartDataPointDto>> GetChartDataAsync(Guid userId)
        {
            var result = new List<ChartDataPointDto>();
            var dayNames = new[] { "CN", "T2", "T3", "T4", "T5", "T6", "T7" };

            for (int i = 6; i >= 0; i--)
            {
                var date = DateTime.Now.Date.AddDays(-i);
                var tasks = await _db.Tasks
                    .Where(t => t.AssigneeId == userId && t.CreatedAt.Date == date)
                    .ToListAsync();

                result.Add(new ChartDataPointDto
                {
                    Day = dayNames[(int)date.DayOfWeek],
                    Total = tasks.Count,
                    Completed = tasks.Count(t => t.TaskStatus == "Completed"),
                });
            }
            return result;
        }

        // ── 3. Assigned Tasks — join Column → Project ─────────────────
        public async System.Threading.Tasks.Task<List<AssignedTaskDto>> GetAssignedTasksAsync(Guid userId)
        {
            var query =
                from t in _db.Tasks
                join col in _db.TaskColumns on t.ColumnId equals col.ColumnId
                join p in _db.Projects on col.ProjectId equals p.ProjectId
                where t.AssigneeId == userId && t.TaskStatus != "Completed"
                orderby t.DueDate
                select new AssignedTaskDto
                {
                    TaskId = t.TaskId,
                    Title = t.Title,
                    ProjectName = p.ProjectName,
                    TaskStatus = t.TaskStatus,
                    Priority = t.Priority,
                    DueDate = t.DueDate,
                };

            return await query.Take(10).ToListAsync();
        }

        // ── 4. Personal Tasks ─────────────────────────────────────────
        public async System.Threading.Tasks.Task<List<PersonalTaskDto>> GetPersonalTasksAsync(Guid userId)
        {
            return await _db.PersonalTasks
                .Where(pt => pt.UserId == userId)
                .OrderBy(pt => pt.IsCompleted)
                .ThenBy(pt => pt.CreatedAt)
                .Select(pt => new PersonalTaskDto
                {
                    PersonalTaskId = pt.PersonalTaskId,
                    Title = pt.Title,
                    IsCompleted = pt.IsCompleted,
                    DueDate = pt.DueDate,
                })
                .ToListAsync();
        }

        public async System.Threading.Tasks.Task<PersonalTaskDto> CreatePersonalTaskAsync(Guid userId, CreatePersonalTaskDto dto)
        {
            var task = new HTMS_API.Models.PersonalTask
            {
                PersonalTaskId = Guid.NewGuid(),
                UserId = userId,
                Title = dto.Title,
                DueDate = dto.DueDate,
                IsCompleted = false,
                CreatedAt = DateTime.Now,
            };
            _db.PersonalTasks.Add(task);
            await _db.SaveChangesAsync();

            return new PersonalTaskDto
            {
                PersonalTaskId = task.PersonalTaskId,
                Title = task.Title,
                IsCompleted = task.IsCompleted,
                DueDate = task.DueDate,
            };
        }

        public async System.Threading.Tasks.Task TogglePersonalTaskAsync(Guid userId, Guid taskId)
        {
            var task = await _db.PersonalTasks
                .FirstOrDefaultAsync(pt => pt.PersonalTaskId == taskId && pt.UserId == userId)
                ?? throw new Exception("Task không tồn tại hoặc không có quyền");

            task.IsCompleted = !task.IsCompleted;
            await _db.SaveChangesAsync();
        }

        // ── 5. Project Progress ───────────────────────────────────────
        public async System.Threading.Tasks.Task<List<ProjectProgressDto>> GetProjectProgressAsync(Guid userId)
        {
            var projectIds = await _db.ProjectMembers
                .Where(pm => pm.UserId == userId)
                .Select(pm => pm.ProjectId)
                .ToListAsync();

            var projects = await _db.Projects
                .Where(p => projectIds.Contains(p.ProjectId) && p.DeletedAt == null)
                .ToListAsync();

            var result = new List<ProjectProgressDto>();

            foreach (var project in projects)
            {
                var columnIds = await _db.TaskColumns
                    .Where(c => c.ProjectId == project.ProjectId)
                    .Select(c => c.ColumnId)
                    .ToListAsync();

                var total = await _db.Tasks.CountAsync(t => columnIds.Contains(t.ColumnId));
                var done = await _db.Tasks.CountAsync(t => columnIds.Contains(t.ColumnId) && t.TaskStatus == "Completed");
                var pct = total > 0 ? Math.Round((double)done / total * 100, 1) : 0;

                result.Add(new ProjectProgressDto
                {
                    ProjectId = project.ProjectId,
                    ProjectName = project.ProjectName,
                    TotalTasks = total,
                    DoneTasks = done,
                    Percentage = pct,
                });
            }

            return result;
        }
    }
}