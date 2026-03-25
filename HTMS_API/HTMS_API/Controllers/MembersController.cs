using System.Security.Claims;
using HTMS_API.Data;
using HTMS_API.Hubs;
using HTMS_API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace HTMS_API.Controllers
{
    [Authorize]
    [Route("api/project/{projectId}/members")]
    [ApiController]
    public class MembersController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly INotificationService _notif;
        private readonly IHubContext<BoardHub> _hub;

        public MembersController(AppDbContext db, INotificationService notif, IHubContext<BoardHub> hub)
        {
            _db = db;
            _notif = notif;
            _hub = hub;
        }

        private async System.Threading.Tasks.Task BroadcastMembersUpdated(Guid projectId)
        {
            await _hub.Clients.Group($"board-{projectId}").SendAsync("MembersUpdated");
        }

        private Guid Me => Guid.Parse(
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException());

        private async Task<string?> GetRoleAsync(Guid userId, Guid projectId)
        {
            var pm = await _db.ProjectMembers
                .FirstOrDefaultAsync(x => x.ProjectId == projectId && x.UserId == userId);
            if (pm == null) return null;
            var role = await _db.Roles.FindAsync(pm.RoleId);
            return role?.RoleName;
        }

        // ════════════════════════════════════════════════════════════
        // GET /api/project/{projectId}/members
        // Danh sách thành viên + task stats
        // ════════════════════════════════════════════════════════════
        [HttpGet]
        public async Task<IActionResult> GetMembers(Guid projectId)
        {
            var myRole = await GetRoleAsync(Me, projectId);
            if (myRole == null) return Forbid();

            var project = await _db.Projects
                .FirstOrDefaultAsync(p => p.ProjectId == projectId && p.DeletedAt == null);
            if (project == null) return NotFound(new { message = "Dự án không tồn tại" });

            var roleMap = await _db.Roles.ToDictionaryAsync(r => r.RoleId, r => r.RoleName);

            var members = await (
                from pm in _db.ProjectMembers
                join u in _db.Users on pm.UserId equals u.UserId
                where pm.ProjectId == projectId
                orderby pm.JoinedAt
                select new
                {
                    u.UserId,
                    u.FullName,
                    u.Email,
                    u.AvatarUrl,
                    pm.RoleId,
                    pm.JoinedAt,
                    IsOwner = u.UserId == project.OwnerId,
                }
            ).ToListAsync();

            // Task stats per member
            var colIds = await _db.TaskColumns
                .Where(c => c.ProjectId == projectId)
                .Select(c => c.ColumnId).ToListAsync();

            var allTasks = await _db.Tasks
                .Where(t => colIds.Contains(t.ColumnId))
                .Select(t => new { t.AssigneeId, t.TaskStatus })
                .ToListAsync();

            var result = members.Select(m =>
            {
                var myTasks = allTasks.Where(t => t.AssigneeId == m.UserId).ToList();
                var total = myTasks.Count;
                var completed = myTasks.Count(t => t.TaskStatus == "Completed");
                var inProgress = myTasks.Count(t => t.TaskStatus == "In Progress");
                var pending = myTasks.Count(t => t.TaskStatus == "Pending");
                var todo = myTasks.Count(t => t.TaskStatus == "Todo");
                var rate = total > 0 ? Math.Round((double)completed / total * 100, 1) : 0;

                return new
                {
                    m.UserId,
                    m.FullName,
                    m.Email,
                    m.AvatarUrl,
                    Role = roleMap.GetValueOrDefault(m.RoleId, "Member"),
                    m.JoinedAt,
                    m.IsOwner,
                    TaskStats = new { total, completed, inProgress, pending, todo, completionRate = rate },
                };
            }).ToList();

            return Ok(new { message = "OK", data = new { myRole, members = result } });
        }

        // ════════════════════════════════════════════════════════════
        // GET /api/project/{projectId}/stats
        // Thống kê tổng quan dự án
        // ════════════════════════════════════════════════════════════
        [HttpGet("/api/project/{projectId}/stats")]
        public async Task<IActionResult> GetStats(Guid projectId)
        {
            var myRole = await GetRoleAsync(Me, projectId);
            if (myRole == null) return Forbid();

            var project = await _db.Projects
                .FirstOrDefaultAsync(p => p.ProjectId == projectId && p.DeletedAt == null);
            if (project == null) return NotFound(new { message = "Dự án không tồn tại" });

            var colIds = await _db.TaskColumns
                .Where(c => c.ProjectId == projectId)
                .Select(c => c.ColumnId).ToListAsync();

            var allTasks = await _db.Tasks
                .Where(t => colIds.Contains(t.ColumnId))
                .Select(t => new { t.AssigneeId, t.TaskStatus, t.DueDate, t.Priority })
                .ToListAsync();

            var now = DateTime.Now;
            var total = allTasks.Count;
            var completed = allTasks.Count(t => t.TaskStatus == "Completed");
            var inProg = allTasks.Count(t => t.TaskStatus == "In Progress");
            var pending = allTasks.Count(t => t.TaskStatus == "Pending");
            var todo = allTasks.Count(t => t.TaskStatus == "Todo");
            var overdue = allTasks.Count(t =>
                t.TaskStatus != "Completed" &&
                t.DueDate.HasValue && t.DueDate.Value < now);
            var progress = total > 0 ? Math.Round((double)completed / total * 100, 1) : 0;
            var memberCount = await _db.ProjectMembers
                .CountAsync(pm => pm.ProjectId == projectId);

            // Stats theo priority
            var byPriority = new[] { "Urgent", "High", "Medium", "Low" }
                .Select(p => new {
                    priority = p,
                    count = allTasks.Count(t => t.Priority == p)
                }).ToList();

            // Member performance
            var roleMap = await _db.Roles.ToDictionaryAsync(r => r.RoleId, r => r.RoleName);
            var members = await (
                from pm in _db.ProjectMembers
                join u in _db.Users on pm.UserId equals u.UserId
                where pm.ProjectId == projectId
                select new { u.UserId, u.FullName, u.AvatarUrl, pm.RoleId }
            ).ToListAsync();

            var memberStats = members.Select(m => {
                var mt = allTasks.Where(t => t.AssigneeId == m.UserId).ToList();
                var mc = mt.Count(t => t.TaskStatus == "Completed");
                var rate = mt.Count > 0 ? Math.Round((double)mc / mt.Count * 100, 1) : 0.0;
                return new
                {
                    m.UserId,
                    m.FullName,
                    m.AvatarUrl,
                    role = roleMap.GetValueOrDefault(m.RoleId, "Member"),
                    total = mt.Count,
                    completed = mc,
                    inProgress = mt.Count(t => t.TaskStatus == "In Progress"),
                    pending = mt.Count(t => t.TaskStatus == "Pending"),
                    todo = mt.Count(t => t.TaskStatus == "Todo"),
                    completionRate = rate,
                };
            }).OrderByDescending(m => m.total).ToList();

            return Ok(new
            {
                message = "OK",
                data = new
                {
                    myRole,
                    summary = new { total, completed, inProgress = inProg, pending, todo, overdue, progress, memberCount },
                    byStatus = new[] {
                    new { status = "Todo",        count = todo     },
                    new { status = "In Progress", count = inProg   },
                    new { status = "Pending",     count = pending  },
                    new { status = "Completed",   count = completed},
                },
                    byPriority,
                    memberStats,
                }
            });
        }

        // ════════════════════════════════════════════════════════════
        // GET /api/project/{projectId}/members/activity
        // Lịch sử hoạt động dự án (ProjectActivityLog)
        // ════════════════════════════════════════════════════════════
        [HttpGet("activity")]
        public async Task<IActionResult> GetActivity(
            Guid projectId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 30,
            [FromQuery] string? entity = null,  // filter: Task | Comment | Attachment | Member
            [FromQuery] string? action = null)  // filter: CREATE_TASK | APPROVE | ...
        {
            var myRole = await GetRoleAsync(Me, projectId);
            if (myRole == null) return Forbid();

            var query = _db.ProjectActivityLogs
                .Where(l => l.ProjectId == projectId);

            if (!string.IsNullOrWhiteSpace(entity))
                query = query.Where(l => l.EntityType == entity);
            if (!string.IsNullOrWhiteSpace(action))
                query = query.Where(l => l.ActionType == action);

            var total = await query.CountAsync();

            var logs = await (
                from log in query
                join user in _db.Users on log.UserId equals user.UserId
                orderby log.CreatedAt descending
                select new
                {
                    log.LogId,
                    log.ActionType,
                    log.EntityType,
                    log.EntityName,
                    log.OldValue,
                    log.NewValue,
                    log.CreatedAt,
                    UserName = user.FullName ?? user.Email,
                    UserAvatar = user.AvatarUrl,
                    UserId = user.UserId,
                }
            )
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

            return Ok(new { message = "OK", data = new { total, page, pageSize, logs } });
        }

        // ════════════════════════════════════════════════════════════
        // GET /api/project/{projectId}/report
        // Dữ liệu đầy đủ để xuất báo cáo Excel/PDF
        // ════════════════════════════════════════════════════════════
        [HttpGet("/api/project/{projectId}/report")]
        public async Task<IActionResult> GetReport(Guid projectId)
        {
            var myRole = await GetRoleAsync(Me, projectId);
            if (myRole == null) return Forbid();

            var project = await _db.Projects
                .FirstOrDefaultAsync(p => p.ProjectId == projectId && p.DeletedAt == null);
            if (project == null) return NotFound(new { message = "Dự án không tồn tại" });

            var roleMap = await _db.Roles.ToDictionaryAsync(r => r.RoleId, r => r.RoleName);

            var colIds = await _db.TaskColumns
                .Where(c => c.ProjectId == projectId)
                .Select(c => c.ColumnId).ToListAsync();

            // Lấy tất cả task kể cả Completed
            var tasks = await (
                from t in _db.Tasks
                where colIds.Contains(t.ColumnId)
                join assignee in _db.Users on t.AssigneeId equals assignee.UserId into ag
                from assignee in ag.DefaultIfEmpty()
                join creator in _db.Users on t.CreatorId equals creator.UserId into cg
                from creator in cg.DefaultIfEmpty()
                select new
                {
                    t.TaskId,
                    t.Title,
                    t.Description,
                    t.TaskStatus,
                    t.Priority,
                    t.DueDate,
                    t.CreatedAt,
                    t.UpdatedAt,
                    AssigneeName = assignee != null ? assignee.FullName : "Chưa giao",
                    AssigneeEmail = assignee != null ? assignee.Email : "",
                    CreatorName = creator != null ? creator.FullName : "",
                }
            ).OrderBy(t => t.CreatedAt).ToListAsync();

            // Members + stats
            var members = await (
                from pm in _db.ProjectMembers
                join u in _db.Users on pm.UserId equals u.UserId
                where pm.ProjectId == projectId
                select new { u.UserId, u.FullName, u.Email, pm.RoleId, pm.JoinedAt }
            ).ToListAsync();

            var memberReport = members.Select(m => {
                var mt = tasks.Where(t => t.AssigneeName == m.FullName).ToList();
                return new
                {
                    m.FullName,
                    m.Email,
                    Role = roleMap.GetValueOrDefault(m.RoleId, "Member"),
                    m.JoinedAt,
                    Total = mt.Count,
                    Completed = mt.Count(t => t.TaskStatus == "Completed"),
                    InProgress = mt.Count(t => t.TaskStatus == "In Progress"),
                    Pending = mt.Count(t => t.TaskStatus == "Pending"),
                    Todo = mt.Count(t => t.TaskStatus == "Todo"),
                    CompletionRate = mt.Count > 0
                        ? Math.Round((double)mt.Count(t => t.TaskStatus == "Completed") / mt.Count * 100, 1)
                        : 0.0,
                };
            }).OrderByDescending(m => m.Total).ToList();

            var now = DateTime.Now;
            var total = tasks.Count;
            var completed = tasks.Count(t => t.TaskStatus == "Completed");
            var overdue = tasks.Count(t =>
                t.TaskStatus != "Completed" &&
                t.DueDate.HasValue && t.DueDate.Value < now);

            return Ok(new
            {
                message = "OK",
                data = new
                {
                    projectName = project.ProjectName,
                    exportedAt = now,
                    summary = new
                    {
                        total,
                        completed,
                        overdue,
                        progress = total > 0 ? Math.Round((double)completed / total * 100, 1) : 0.0,
                        memberCount = members.Count,
                    },
                    tasks,
                    members = memberReport,
                }
            });
        }


    }
}