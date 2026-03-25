using System.Security.Claims;
using HTMS_API.Data;
using HTMS_API.DTOs;
using HTMS_API.DTOs.Board;
using HTMS_API.Hubs;
using HTMS_API.Models;
using HTMS_API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SysTask = System.Threading.Tasks.Task;
using TaskModel = HTMS_API.Models.Task;
using HTMS_API.Services.Interfaces;

namespace HTMS_API.Controllers
{
    [Authorize]
    [Route("api/project/{projectId}")]
    [ApiController]
    public class BoardController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IHubContext<BoardHub> _boardHub;
        private readonly INotificationService _notif;
        private readonly ICloudinaryService _cloudinary;
        private readonly IProjectActivityService _activity;

        public BoardController(
            AppDbContext db,
            IHubContext<BoardHub> boardHub,
            INotificationService notif,
            ICloudinaryService cloudinary,
            IProjectActivityService activity)
        {
            _db = db;
            _boardHub = boardHub;
            _notif = notif;
            _cloudinary = cloudinary;
            _activity = activity;
        }

        // ════════════════════════════════════════════════════════════
        // HELPERS
        // ════════════════════════════════════════════════════════════

        private Guid Me => Guid.Parse(
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? throw new UnauthorizedAccessException());

        private async System.Threading.Tasks.Task<string?> GetRoleAsync(Guid userId, Guid projectId)
        {
            var pm = await _db.ProjectMembers
                .FirstOrDefaultAsync(x => x.ProjectId == projectId && x.UserId == userId);
            if (pm == null) return null;
            var role = await _db.Roles.FindAsync(pm.RoleId);
            return role?.RoleName;
        }

        // Ghi log (sync — SaveChanges gọi bên ngoài)
        private SysTask LogAsync(Guid taskId, string action,
            string? oldStatus, string? newStatus, string? note = null)
        {
            _db.TaskActivityLogs.Add(new TaskActivityLog
            {
                LogId = Guid.NewGuid(),
                TaskId = taskId,
                UserId = Me,
                ActionType = action,
                OldStatus = oldStatus,
                NewStatus = newStatus,
                Note = note,
                CreatedAt = DateTime.Now,
            });
            return SysTask.CompletedTask;
        }

        // Gửi notification realtime
        private async SysTask NotifyAsync(Guid toUserId, string title, string message, string? link = null)
        {
            await _notif.CreateAsync(new CreateNotificationDto
            {
                UserId = toUserId,
                SenderId = Me,
                Title = title,
                Message = message,
                LinkUrl = link,
            });
        }

        // Push MyTasksUpdated tới assignee (nếu có) để FE invalidate my-tasks
        private async SysTask PushMyTasksAsync(Guid? assigneeId)
        {
            if (assigneeId.HasValue)
                await _notif.PushMyTasksUpdatedAsync(assigneeId.Value);
        }

        // Build BoardTaskDto — tránh N+1
        private static BoardTaskDto MapTask(
            TaskModel t,
            Dictionary<Guid, User> users,
            ILookup<Guid, Attachment> attachLookup,
            ILookup<Guid, Comment> commentLookup,
            ILookup<Guid, TaskActivityLog> logLookup)
        {
            BoardAssigneeDto? assignee = null;
            if (t.AssigneeId.HasValue && users.TryGetValue(t.AssigneeId.Value, out var au))
                assignee = new BoardAssigneeDto
                {
                    UserId = au.UserId,
                    FullName = au.FullName ?? au.Email,
                    AvatarUrl = au.AvatarUrl,
                };

            var attachments = attachLookup[t.TaskId]
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => new AttachmentDto
                {
                    AttachmentId = a.AttachmentId,
                    FileName = a.FileName,
                    FileUrl = a.FileUrl,
                    IsEvidence = a.IsEvidence,
                    UploadedById = a.UploadedById,
                    CreatedAt = a.CreatedAt,
                }).ToList();

            var comments = commentLookup[t.TaskId]
                .OrderBy(c => c.CreatedAt)
                .Select(c => new TaskCommentDto
                {
                    CommentId = c.CommentId,
                    Content = c.Content,
                    UserId = c.UserId,
                    UserName = users.TryGetValue(c.UserId, out var cu) ? (cu.FullName ?? cu.Email) : "?",
                    UserAvatar = users.TryGetValue(c.UserId, out var cu2) ? cu2.AvatarUrl : null,
                    CreatedAt = c.CreatedAt,
                }).ToList();

            var logs = logLookup[t.TaskId]
                .OrderByDescending(l => l.CreatedAt)
                .Select(l => new ActivityLogDto
                {
                    LogId = l.LogId,
                    ActionType = l.ActionType,
                    OldStatus = l.OldStatus,
                    NewStatus = l.NewStatus,
                    Note = l.Note,
                    UserId = l.UserId,
                    UserName = users.TryGetValue(l.UserId, out var lu) ? (lu.FullName ?? lu.Email) : "?",
                    UserAvatar = users.TryGetValue(l.UserId, out var lu2) ? lu2.AvatarUrl : null,
                    CreatedAt = l.CreatedAt,
                }).ToList();

            return new BoardTaskDto
            {
                TaskId = t.TaskId,
                ColumnId = t.ColumnId,
                Title = t.Title,
                Description = t.Description,
                Priority = t.Priority,
                DueDate = t.DueDate,
                AssigneeId = t.AssigneeId,
                Assignee = assignee,
                CreatorId = t.CreatorId,
                TaskStatus = t.TaskStatus,
                IsApproved = t.IsApproved,
                ApprovedById = t.ApprovedById,
                Position = t.Position,
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt,
                Attachments = attachments,
                Comments = comments,
                ActivityLogs = logs,
            };
        }

        // Build BoardTaskDto cho 1 task đơn (sau mutation)
        private async System.Threading.Tasks.Task<BoardTaskDto> BuildTaskDtoAsync(TaskModel task)
        {
            var userIds = new HashSet<Guid> { task.CreatorId };
            if (task.AssigneeId.HasValue) userIds.Add(task.AssigneeId.Value);
            if (task.ApprovedById.HasValue) userIds.Add(task.ApprovedById.Value);

            var attachments = await _db.Attachments.Where(a => a.TaskId == task.TaskId).ToListAsync();
            var comments = await _db.Comments.Where(c => c.TaskId == task.TaskId).ToListAsync();
            var logs = await _db.TaskActivityLogs.Where(l => l.TaskId == task.TaskId).ToListAsync();

            foreach (var a in attachments) userIds.Add(a.UploadedById);
            foreach (var c in comments) userIds.Add(c.UserId);
            foreach (var l in logs) userIds.Add(l.UserId);

            var users = await _db.Users
                .Where(u => userIds.Contains(u.UserId))
                .ToDictionaryAsync(u => u.UserId);

            return MapTask(task,
                users,
                attachments.ToLookup(a => a.TaskId),
                comments.ToLookup(c => c.TaskId),
                logs.ToLookup(l => l.TaskId));
        }

        // ════════════════════════════════════════════════════════════
        // GET /api/project/{projectId}/board
        // ════════════════════════════════════════════════════════════
        [HttpGet("board")]
        public async Task<IActionResult> GetBoard(Guid projectId)
        {
            var myRole = await GetRoleAsync(Me, projectId);
            if (myRole == null) return Forbid();

            var project = await _db.Projects
                .FirstOrDefaultAsync(p => p.ProjectId == projectId && p.DeletedAt == null);
            if (project == null) return NotFound(new { message = "Dự án không tồn tại" });

            var members = await (
                from pm in _db.ProjectMembers
                join u in _db.Users on pm.UserId equals u.UserId
                join r in _db.Roles on pm.RoleId equals r.RoleId
                where pm.ProjectId == projectId
                select new BoardMemberDto
                {
                    UserId = u.UserId,
                    FullName = u.FullName ?? u.Email,
                    Email = u.Email,
                    AvatarUrl = u.AvatarUrl,
                    Role = r.RoleName,
                }
            ).ToListAsync();

            var columns = await _db.TaskColumns
                .Where(c => c.ProjectId == projectId)
                .OrderBy(c => c.Position)
                .ToListAsync();

            var colIds = columns.Select(c => c.ColumnId).ToList();

            var tasks = await _db.Tasks
                .Where(t => colIds.Contains(t.ColumnId))
                .ToListAsync();

            var taskIds = tasks.Select(t => t.TaskId).ToList();

            var attachments = await _db.Attachments
                .Where(a => taskIds.Contains(a.TaskId)).ToListAsync();
            var comments = await _db.Comments
                .Where(c => taskIds.Contains(c.TaskId)).ToListAsync();
            var logs = await _db.TaskActivityLogs
                .Where(l => taskIds.Contains(l.TaskId)).ToListAsync();

            var userIds = new HashSet<Guid>();
            foreach (var t in tasks)
            {
                userIds.Add(t.CreatorId);
                if (t.AssigneeId.HasValue) userIds.Add(t.AssigneeId.Value);
                if (t.ApprovedById.HasValue) userIds.Add(t.ApprovedById.Value);
            }
            foreach (var a in attachments) userIds.Add(a.UploadedById);
            foreach (var c in comments) userIds.Add(c.UserId);
            foreach (var l in logs) userIds.Add(l.UserId);

            var users = await _db.Users
                .Where(u => userIds.Contains(u.UserId))
                .ToDictionaryAsync(u => u.UserId);

            var attachLookup = attachments.ToLookup(a => a.TaskId);
            var commentLookup = comments.ToLookup(c => c.TaskId);
            var logLookup = logs.ToLookup(l => l.TaskId);

            var columnDtos = columns.Select(col => new BoardColumnDto
            {
                ColumnId = col.ColumnId,
                ColumnName = col.ColumnName,
                Position = col.Position,
                Tasks = tasks
                    .Where(t => t.ColumnId == col.ColumnId)
                    .OrderBy(t => t.Position)
                    .Select(t => MapTask(t, users, attachLookup, commentLookup, logLookup))
                    .ToList(),
            }).ToList();

            return Ok(new
            {
                message = "OK",
                data = new BoardDataDto
                {
                    ProjectId = project.ProjectId,
                    ProjectName = project.ProjectName,
                    MyRole = myRole,
                    MyUserId = Me,
                    Members = members,
                    Columns = columnDtos,
                },
            });
        }

        // ════════════════════════════════════════════════════════════
        // POST /api/project/{projectId}/tasks
        // Manager tạo task → cột Todo
        // ════════════════════════════════════════════════════════════
        [HttpPost("tasks")]
        public async Task<IActionResult> CreateTask(Guid projectId, [FromBody] CreateTaskRequest req)
        {
            var myRole = await GetRoleAsync(Me, projectId);
            if (myRole == null) return Forbid();
            if (myRole != "Manager")
                return StatusCode(403, new { message = "Chỉ Manager mới có thể tạo task" });

            var todoCol = await _db.TaskColumns
                .Where(c => c.ProjectId == projectId)
                .OrderBy(c => c.Position)
                .FirstOrDefaultAsync();
            if (todoCol == null)
                return BadRequest(new { message = "Board chưa có cột. Vui lòng tạo lại dự án." });

            var position = await _db.Tasks.CountAsync(t => t.ColumnId == todoCol.ColumnId) + 1;

            var task = new TaskModel
            {
                TaskId = Guid.NewGuid(),
                ColumnId = todoCol.ColumnId,
                Title = req.Title.Trim(),
                Description = req.Description?.Trim(),
                Priority = req.Priority,
                DueDate = req.DueDate,
                AssigneeId = req.AssigneeId,
                CreatorId = Me,
                TaskStatus = "Todo",
                Position = position,
                CreatedAt = DateTime.Now,
            };
            _db.Tasks.Add(task);

            await LogAsync(task.TaskId, "CREATE", null, "Todo");
            await _db.SaveChangesAsync();
            await _activity.LogAsync(projectId, Me, "CREATE_TASK", "Task", task.Title);

            if (req.AssigneeId.HasValue)
            {
                var me = await _db.Users.FindAsync(Me);
                await NotifyAsync(
                    req.AssigneeId.Value,
                    "Bạn được giao task mới",
                    $"Task \"{task.Title}\" đã được giao cho bạn bởi {me?.FullName ?? "Manager"}",
                    $"/projects/{projectId}/board");
            }

            var dto = await BuildTaskDtoAsync(task);
            await _boardHub.Clients.Group($"board-{projectId}").SendAsync("TaskCreated", dto);
            await PushMyTasksAsync(task.AssigneeId);
            return Ok(new { message = "Tạo task thành công", data = dto });
        }

        // ════════════════════════════════════════════════════════════
        // PATCH /api/project/{projectId}/tasks/{taskId}
        // Manager chỉnh sửa task
        // ════════════════════════════════════════════════════════════
        [HttpPatch("tasks/{taskId:guid}")]
        public async Task<IActionResult> UpdateTask(Guid projectId, Guid taskId,
            [FromBody] UpdateTaskRequest req)
        {
            var myRole = await GetRoleAsync(Me, projectId);
            if (myRole == null) return Forbid();
            if (myRole != "Manager")
                return StatusCode(403, new { message = "Chỉ Manager mới có thể chỉnh sửa task" });

            var task = await _db.Tasks.FindAsync(taskId);
            if (task == null) return NotFound(new { message = "Task không tồn tại" });

            var oldAssignee = task.AssigneeId;

            if (req.Title != null) task.Title = req.Title.Trim();
            if (req.Description != null) task.Description = req.Description.Trim();
            if (req.Priority != null) task.Priority = req.Priority;
            if (req.DueDate != null) task.DueDate = req.DueDate;

            if (req.ClearAssignee)
                task.AssigneeId = null;
            else if (req.AssigneeId.HasValue)
                task.AssigneeId = req.AssigneeId;

            task.UpdatedAt = DateTime.Now;

            await LogAsync(task.TaskId, "STATUS_CHANGE",
                task.TaskStatus, task.TaskStatus, "Manager cập nhật task");
            await _db.SaveChangesAsync();

            // Ghi project activity log chi tiết
            if (req.AssigneeId.HasValue && req.AssigneeId != oldAssignee)
            {
                var newAssigneeUser = req.AssigneeId.HasValue ? await _db.Users.FindAsync(req.AssigneeId.Value) : null;
                var oldAssigneeUser = oldAssignee.HasValue ? await _db.Users.FindAsync(oldAssignee.Value) : null;
                await _activity.LogAsync(projectId, Me, "UPDATE_TASK", "Task", task.Title,
                    oldAssigneeUser?.FullName ?? "Chưa giao",
                    newAssigneeUser?.FullName ?? "Chưa giao");
            }
            if (req.DueDate != null)
                await _activity.LogAsync(projectId, Me, "UPDATE_TASK", "Task", task.Title,
                    null, $"Deadline: {task.DueDate?.ToString("dd/MM/yyyy")}");
            if (req.Priority != null)
                await _activity.LogAsync(projectId, Me, "UPDATE_TASK", "Task", task.Title,
                    null, $"Priority: {task.Priority}");

            var me = await _db.Users.FindAsync(Me);
            if (task.AssigneeId != oldAssignee)
            {
                // Thông báo người cũ bị bỏ giao
                if (oldAssignee.HasValue && oldAssignee.Value != Me)
                {
                    await NotifyAsync(
                        oldAssignee.Value,
                        "Task đã được chuyển giao",
                        $"Task \"{task.Title}\" đã được giao cho người khác bởi {me?.FullName ?? "Manager"}",
                        $"/projects/{projectId}/board");
                }
                // Thông báo người mới được giao
                if (task.AssigneeId.HasValue && task.AssigneeId.Value != Me)
                {
                    await NotifyAsync(
                        task.AssigneeId.Value,
                        "Bạn được giao task mới",
                        $"Task \"{task.Title}\" đã được giao cho bạn bởi {me?.FullName ?? "Manager"}",
                        $"/projects/{projectId}/board");
                }
            }

            var dto = await BuildTaskDtoAsync(task);
            await _boardHub.Clients.Group($"board-{projectId}").SendAsync("TaskUpdated", dto);
            // Push cả người cũ lẫn người mới nếu đổi assignee
            await PushMyTasksAsync(task.AssigneeId);
            if (oldAssignee.HasValue && oldAssignee != task.AssigneeId)
                await PushMyTasksAsync(oldAssignee);
            return Ok(new { message = "Cập nhật thành công", data = dto });
        }

        // ════════════════════════════════════════════════════════════
        // POST /api/project/{projectId}/tasks/{taskId}/start
        // Bước 2: Assignee bắt đầu → In Progress
        // ════════════════════════════════════════════════════════════
        [HttpPost("tasks/{taskId:guid}/start")]
        public async Task<IActionResult> StartTask(Guid projectId, Guid taskId)
        {
            var myRole = await GetRoleAsync(Me, projectId);
            if (myRole == null) return Forbid();

            var task = await _db.Tasks.FindAsync(taskId);
            if (task == null) return NotFound(new { message = "Task không tồn tại" });

            if (myRole != "Manager" && task.AssigneeId != Me)
                return StatusCode(403, new { message = "Chỉ người được giao task mới có thể bắt đầu" });

            if (task.TaskStatus != "Todo")
                return BadRequest(new { message = $"Task đang ở \"{task.TaskStatus}\", không thể bắt đầu" });

            var inProgressCol = await _db.TaskColumns
                .Where(c => c.ProjectId == projectId)
                .OrderBy(c => c.Position)
                .Skip(1).FirstOrDefaultAsync();

            var oldStatus = task.TaskStatus;
            task.TaskStatus = "In Progress";
            task.UpdatedAt = DateTime.Now;
            if (inProgressCol != null) task.ColumnId = inProgressCol.ColumnId;

            await LogAsync(task.TaskId, "STATUS_CHANGE", oldStatus, "In Progress");
            await _db.SaveChangesAsync();
            await _activity.LogAsync(projectId, Me, "STATUS_CHANGE", "Task", task.Title, oldStatus, "In Progress");

            var dto = await BuildTaskDtoAsync(task);
            await _boardHub.Clients.Group($"board-{projectId}").SendAsync("TaskUpdated", dto);
            await PushMyTasksAsync(task.AssigneeId);
            return Ok(new { message = "Bắt đầu thực hiện task", data = dto });
        }

        // ════════════════════════════════════════════════════════════
        // POST /api/project/{projectId}/tasks/{taskId}/submit
        // Bước 3: Assignee upload minh chứng → Pending
        // ════════════════════════════════════════════════════════════
        [HttpPost("tasks/{taskId:guid}/submit")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> SubmitTask(
            Guid projectId, Guid taskId,
            List<IFormFile> files)
        {
            var myRole = await GetRoleAsync(Me, projectId);
            if (myRole == null) return Forbid();

            var task = await _db.Tasks.FindAsync(taskId);
            if (task == null) return NotFound(new { message = "Task không tồn tại" });

            if (myRole != "Manager" && task.AssigneeId != Me)
                return StatusCode(403, new { message = "Chỉ người được giao task mới có thể nộp minh chứng" });

            if (task.TaskStatus != "In Progress")
                return BadRequest(new { message = "Task phải đang ở \"In Progress\" mới có thể nộp" });

            if (files == null || files.Count == 0 || files.All(f => f.Length == 0))
                return BadRequest(new { message = "Vui lòng chọn ít nhất 1 file minh chứng" });

            // Validate tất cả file trước khi upload
            foreach (var f in files)
            {
                if (f.Length > 20 * 1024 * 1024)
                    return BadRequest(new { message = $"File \"{f.FileName}\" quá lớn (tối đa 20MB mỗi file)" });
            }

            // Upload từng file lên Cloudinary
            var fileNames = new List<string>();
            foreach (var f in files.Where(f => f.Length > 0))
            {
                var uploadResult = await _cloudinary.UploadAsync(f);
                if (!uploadResult.Success)
                    return StatusCode(500, new { message = $"Upload \"{f.FileName}\" thất bại: {uploadResult.Error}" });

                _db.Attachments.Add(new Attachment
                {
                    AttachmentId = Guid.NewGuid(),
                    TaskId = task.TaskId,
                    FileName = f.FileName,
                    FileUrl = uploadResult.Url,
                    UploadedById = Me,
                    IsEvidence = true,
                    CreatedAt = DateTime.Now,
                });
                fileNames.Add(f.FileName);
            }

            var oldStatus = task.TaskStatus;
            task.TaskStatus = "Pending";
            task.UpdatedAt = DateTime.Now;

            var pendingCol = await _db.TaskColumns
                .Where(c => c.ProjectId == projectId)
                .OrderBy(c => c.Position)
                .Skip(2).FirstOrDefaultAsync();
            if (pendingCol != null) task.ColumnId = pendingCol.ColumnId;

            await LogAsync(task.TaskId, "SUBMIT", oldStatus, "Pending",
                $"{fileNames.Count} file: {string.Join(", ", fileNames)}");
            await _db.SaveChangesAsync();
            await _activity.LogAsync(projectId, Me, "SUBMIT", "Task", task.Title, oldStatus, "Pending");

            // Thông báo tất cả Manager
            var managerIds = await (
                from pm in _db.ProjectMembers
                join r in _db.Roles on pm.RoleId equals r.RoleId
                where pm.ProjectId == projectId && r.RoleName == "Manager"
                select pm.UserId
            ).ToListAsync();

            var submitter = await _db.Users.FindAsync(Me);
            foreach (var mgId in managerIds)
            {
                await NotifyAsync(
                    mgId,
                    "Task cần phê duyệt",
                    $"{submitter?.FullName ?? "Member"} đã nộp minh chứng cho task \"{task.Title}\"",
                    $"/projects/{projectId}/board");
            }

            var dto = await BuildTaskDtoAsync(task);
            await _boardHub.Clients.Group($"board-{projectId}").SendAsync("TaskUpdated", dto);
            await PushMyTasksAsync(task.AssigneeId);
            return Ok(new { message = "Nộp minh chứng thành công. Đang chờ phê duyệt.", data = dto });
        }

        // ════════════════════════════════════════════════════════════
        // POST /api/project/{projectId}/tasks/{taskId}/review
        // Bước 4: Manager approve hoặc reject
        // ════════════════════════════════════════════════════════════
        [HttpPost("tasks/{taskId:guid}/review")]
        public async Task<IActionResult> ReviewTask(Guid projectId, Guid taskId,
            [FromBody] ReviewTaskRequest req)
        {
            var myRole = await GetRoleAsync(Me, projectId);
            if (myRole == null) return Forbid();
            if (myRole != "Manager")
                return StatusCode(403, new { message = "Chỉ Manager mới có thể phê duyệt task" });

            var task = await _db.Tasks.FindAsync(taskId);
            if (task == null) return NotFound(new { message = "Task không tồn tại" });

            if (task.TaskStatus != "Pending")
                return BadRequest(new { message = "Task phải đang ở \"Pending\" mới có thể phê duyệt" });

            if (!req.Approve && string.IsNullOrWhiteSpace(req.Reason))
                return BadRequest(new { message = "Vui lòng nhập lý do từ chối" });

            var oldStatus = task.TaskStatus;
            var me = await _db.Users.FindAsync(Me);
            // notifyId: chỉ gửi nếu người nhận KHÔNG phải chính Manager đang duyệt
            var notifyId = task.AssigneeId ?? task.CreatorId;

            if (req.Approve)
            {
                task.TaskStatus = "Completed";
                task.IsApproved = true;
                task.ApprovedById = Me;
                task.ApprovedAt = DateTime.Now;
                task.UpdatedAt = DateTime.Now;

                var completedCol = await _db.TaskColumns
                    .Where(c => c.ProjectId == projectId)
                    .OrderByDescending(c => c.Position)
                    .FirstOrDefaultAsync();
                if (completedCol != null) task.ColumnId = completedCol.ColumnId;

                await LogAsync(task.TaskId, "APPROVE", oldStatus, "Completed");
                await _db.SaveChangesAsync();
                await _activity.LogAsync(projectId, Me, "APPROVE", "Task", task.Title, oldStatus, "Completed");

                // Không gửi thông báo cho chính mình
                if (notifyId != Me)
                {
                    await NotifyAsync(notifyId,
                        "Task đã được phê duyệt ✅",
                        $"Task \"{task.Title}\" đã được phê duyệt bởi {me?.FullName ?? "Manager"}",
                        $"/projects/{projectId}/board");
                }
            }
            else
            {
                task.TaskStatus = "In Progress";
                task.IsApproved = false;
                task.UpdatedAt = DateTime.Now;

                var inProgressCol = await _db.TaskColumns
                    .Where(c => c.ProjectId == projectId)
                    .OrderBy(c => c.Position)
                    .Skip(1).FirstOrDefaultAsync();
                if (inProgressCol != null) task.ColumnId = inProgressCol.ColumnId;

                _db.Comments.Add(new Comment
                {
                    CommentId = Guid.NewGuid(),
                    TaskId = task.TaskId,
                    UserId = Me,
                    Content = $"[TỪ CHỐI] {req.Reason!.Trim()}",
                    CreatedAt = DateTime.Now,
                });

                await LogAsync(task.TaskId, "REJECT", oldStatus, "In Progress", req.Reason!.Trim());
                await _db.SaveChangesAsync();
                await _activity.LogAsync(projectId, Me, "REJECT", "Task", task.Title, oldStatus, "In Progress");

                // Không gửi thông báo cho chính mình
                if (notifyId != Me)
                {
                    await NotifyAsync(notifyId,
                        "Task bị từ chối ❌",
                        $"Task \"{task.Title}\" bị từ chối: {req.Reason}",
                        $"/projects/{projectId}/board");
                }
            }

            var dto = await BuildTaskDtoAsync(task);
            await _boardHub.Clients.Group($"board-{projectId}").SendAsync("TaskUpdated", dto);
            await PushMyTasksAsync(notifyId);

            return Ok(new
            {
                message = req.Approve ? "Đã phê duyệt task" : "Đã từ chối task",
                data = dto,
            });
        }

        // ════════════════════════════════════════════════════════════
        // DELETE /api/project/{projectId}/tasks/{taskId}
        // ════════════════════════════════════════════════════════════
        [HttpDelete("tasks/{taskId:guid}")]
        public async Task<IActionResult> DeleteTask(Guid projectId, Guid taskId)
        {
            var myRole = await GetRoleAsync(Me, projectId);
            if (myRole == null) return Forbid();
            if (myRole == "Viewer")
                return StatusCode(403, new { message = "Viewer không có quyền xóa task" });

            var task = await _db.Tasks.FindAsync(taskId);
            if (task == null) return NotFound(new { message = "Task không tồn tại" });

            if (myRole == "Member")
            {
                if (task.CreatorId != Me)
                    return StatusCode(403, new { message = "Bạn chỉ có thể xóa task do mình tạo" });
                if (task.TaskStatus != "Todo")
                    return StatusCode(403, new { message = "Không thể xóa task đã bắt đầu thực hiện" });
            }

            var taskTitle = task.Title;
            var assigneeId = task.AssigneeId;
            _db.Tasks.Remove(task);
            await _db.SaveChangesAsync();
            await _activity.LogAsync(projectId, Me, "DELETE_TASK", "Task", taskTitle);

            await _boardHub.Clients.Group($"board-{projectId}").SendAsync("TaskDeleted", taskId);
            await PushMyTasksAsync(assigneeId);
            return Ok(new { message = "Đã xóa task" });
        }

        // ════════════════════════════════════════════════════════════
        // GET /api/project/{projectId}/tasks/{taskId}
        // ════════════════════════════════════════════════════════════
        [HttpGet("tasks/{taskId:guid}")]
        public async Task<IActionResult> GetTask(Guid projectId, Guid taskId)
        {
            var myRole = await GetRoleAsync(Me, projectId);
            if (myRole == null) return Forbid();

            var task = await _db.Tasks.FindAsync(taskId);
            if (task == null) return NotFound(new { message = "Task không tồn tại" });

            var dto = await BuildTaskDtoAsync(task);
            return Ok(new { message = "OK", data = dto });
        }

        // ════════════════════════════════════════════════════════════
        // DELETE /api/project/{projectId}/tasks/{taskId}/comments/{commentId}
        // Chỉ người tạo comment mới được xóa
        // ════════════════════════════════════════════════════════════
        [HttpDelete("tasks/{taskId:guid}/comments/{commentId:guid}")]
        public async Task<IActionResult> DeleteComment(
            Guid projectId, Guid taskId, Guid commentId)
        {
            var myRole = await GetRoleAsync(Me, projectId);
            if (myRole == null) return Forbid();

            var comment = await _db.Comments
                .FirstOrDefaultAsync(c => c.CommentId == commentId && c.TaskId == taskId);
            if (comment == null)
                return NotFound(new { message = "Comment không tồn tại" });

            // Chỉ người tạo hoặc Manager mới được xóa
            if (comment.UserId != Me && myRole != "Manager")
                return StatusCode(403, new { message = "Bạn không có quyền xóa comment này" });

            // Không cho xóa comment hệ thống [TỪ CHỐI]
            if (comment.Content.StartsWith("[TỪ CHỐI]"))
                return BadRequest(new { message = "Không thể xóa comment hệ thống" });

            var commentPreview = comment.Content.Length > 80 ? comment.Content[..80] + "..." : comment.Content;
            var taskForLog = await _db.Tasks.FindAsync(taskId);
            _db.Comments.Remove(comment);
            await _db.SaveChangesAsync();
            if (taskForLog != null)
                await _activity.LogAsync(projectId, Me, "DELETE_COMMENT", "Comment", commentPreview, taskForLog.Title);

            var task = await _db.Tasks.FindAsync(taskId);
            var dto = task != null ? await BuildTaskDtoAsync(task) : null;
            if (dto != null)
                await _boardHub.Clients.Group($"board-{projectId}").SendAsync("TaskUpdated", dto);

            return Ok(new { message = "Đã xóa comment", data = dto });
        }

        // ════════════════════════════════════════════════════════════
        // DELETE /api/project/{projectId}/tasks/{taskId}/attachments/{attachmentId}
        // Assignee xóa file minh chứng cũ (chỉ khi task đang In Progress)
        // ════════════════════════════════════════════════════════════
        [HttpDelete("tasks/{taskId:guid}/attachments/{attachmentId:guid}")]
        public async Task<IActionResult> DeleteAttachment(
            Guid projectId, Guid taskId, Guid attachmentId)
        {
            var myRole = await GetRoleAsync(Me, projectId);
            if (myRole == null) return Forbid();

            var task = await _db.Tasks.FindAsync(taskId);
            if (task == null) return NotFound(new { message = "Task không tồn tại" });

            // Chỉ cho xóa khi task đang In Progress (sau khi bị reject)
            if (task.TaskStatus != "In Progress")
                return BadRequest(new { message = "Chỉ có thể xóa file khi task đang In Progress" });

            // Chỉ assignee hoặc manager mới được xóa
            if (myRole != "Manager" && task.AssigneeId != Me)
                return StatusCode(403, new { message = "Bạn không có quyền xóa file này" });

            var attachment = await _db.Attachments
                .FirstOrDefaultAsync(a => a.AttachmentId == attachmentId && a.TaskId == taskId);
            if (attachment == null)
                return NotFound(new { message = "File không tồn tại" });

            // Chỉ người upload mới được xóa (trừ Manager)
            if (myRole != "Manager" && attachment.UploadedById != Me)
                return StatusCode(403, new { message = "Bạn chỉ có thể xóa file do mình upload" });

            var attachName = attachment.FileName;
            _db.Attachments.Remove(attachment);
            await _db.SaveChangesAsync();
            await _activity.LogAsync(projectId, Me, "DELETE_ATTACH", "Attachment", attachName, task.Title);

            var dto = await BuildTaskDtoAsync(task);
            await _boardHub.Clients.Group($"board-{projectId}").SendAsync("TaskUpdated", dto);
            return Ok(new { message = "Đã xóa file", data = dto });
        }
        // ════════════════════════════════════════════════════════════
        // POST /api/project/{projectId}/tasks/{taskId}/comments
        // Tất cả thành viên dự án được comment
        // ════════════════════════════════════════════════════════════
        [HttpPost("tasks/{taskId:guid}/comments")]
        public async Task<IActionResult> AddComment(
            Guid projectId, Guid taskId, [FromBody] AddCommentRequest req)
        {
            var myRole = await GetRoleAsync(Me, projectId);
            if (myRole == null) return Forbid();

            if (string.IsNullOrWhiteSpace(req.Content))
                return BadRequest(new { message = "Nội dung comment không được để trống" });

            var task = await _db.Tasks.FindAsync(taskId);
            if (task == null) return NotFound(new { message = "Task không tồn tại" });

            var trimmed = req.Content.Trim();

            _db.Comments.Add(new Comment
            {
                CommentId = Guid.NewGuid(),
                TaskId = taskId,
                UserId = Me,
                Content = trimmed,
                CreatedAt = DateTime.Now,
            });
            await _db.SaveChangesAsync();
            await _activity.LogAsync(projectId, Me, "COMMENT", "Comment",
                trimmed.Length > 80 ? trimmed[..80] + "..." : trimmed,
                null, task.Title);

            var commenter = await _db.Users.FindAsync(Me);
            var preview = trimmed.Length > 60 ? trimmed[..60] + "..." : trimmed;
            var notifySet = new HashSet<Guid>();

            // 1. Gửi cho assignee nếu không phải người comment
            if (task.AssigneeId.HasValue && task.AssigneeId.Value != Me)
                notifySet.Add(task.AssigneeId.Value);

            // 2. Parse @mention — tìm @TênNgười trong nội dung
            var mentionMatches = System.Text.RegularExpressions.Regex
                .Matches(trimmed, @"@([\w\u00C0-\u024F\s]+?)(?=\s@|\s*$|[^\w\u00C0-\u024F\s])");

            if (mentionMatches.Count > 0)
            {
                var memberIds = await _db.ProjectMembers
                    .Where(pm => pm.ProjectId == projectId)
                    .Select(pm => pm.UserId).ToListAsync();

                var projectUsers = await _db.Users
                    .Where(u => memberIds.Contains(u.UserId)).ToListAsync();

                foreach (System.Text.RegularExpressions.Match m in mentionMatches)
                {
                    var name = m.Groups[1].Value.Trim();
                    var mentioned = projectUsers.FirstOrDefault(u =>
                        string.Equals(u.FullName, name, StringComparison.OrdinalIgnoreCase));
                    if (mentioned != null && mentioned.UserId != Me)
                        notifySet.Add(mentioned.UserId);
                }
            }

            // Gửi thông báo — phân biệt assignee vs mentioned
            foreach (var uid in notifySet)
            {
                var title = uid == task.AssigneeId
                    ? "Có comment mới trên task của bạn"
                    : "Bạn được nhắc đến trong comment";
                await NotifyAsync(uid, title,
                    $"{commenter?.FullName ?? "Ai đó"}: \"{preview}\"",
                    $"/projects/{projectId}/board");
            }

            var dto = await BuildTaskDtoAsync(task);
            await _boardHub.Clients.Group($"board-{projectId}").SendAsync("TaskUpdated", dto);
            return Ok(new { message = "Đã thêm comment", data = dto });
        }

        // ════════════════════════════════════════════════════════════
        // POST /api/project/{projectId}/tasks/{taskId}/attachments
        // Upload thêm file đính kèm (không phải minh chứng)
        // Chỉ khi task đang In Progress
        // ════════════════════════════════════════════════════════════
        [HttpPost("tasks/{taskId:guid}/attachments")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> AddAttachment(
            Guid projectId, Guid taskId, IFormFile file)
        {
            var myRole = await GetRoleAsync(Me, projectId);
            if (myRole == null) return Forbid();

            var task = await _db.Tasks.FindAsync(taskId);
            if (task == null) return NotFound(new { message = "Task không tồn tại" });

            if (task.TaskStatus != "In Progress")
                return BadRequest(new { message = "Chỉ có thể đính kèm file khi task đang In Progress" });

            if (myRole != "Manager" && task.AssigneeId != Me)
                return StatusCode(403, new { message = "Chỉ assignee hoặc Manager mới có thể đính kèm file" });

            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Vui lòng chọn file" });

            if (file.Length > 20 * 1024 * 1024)
                return BadRequest(new { message = "File quá lớn (tối đa 20MB)" });

            var uploadResult = await _cloudinary.UploadAsync(file);
            if (!uploadResult.Success)
                return StatusCode(500, new { message = "Upload thất bại: " + uploadResult.Error });

            _db.Attachments.Add(new Attachment
            {
                AttachmentId = Guid.NewGuid(),
                TaskId = taskId,
                FileName = file.FileName,
                FileUrl = uploadResult.Url,
                UploadedById = Me,
                IsEvidence = false, // đính kèm thường, không phải minh chứng
                CreatedAt = DateTime.Now,
            });
            await _db.SaveChangesAsync();
            await _activity.LogAsync(projectId, Me, "ATTACH", "Attachment", file.FileName, null, task.Title);

            var dto = await BuildTaskDtoAsync(task);
            await _boardHub.Clients.Group($"board-{projectId}").SendAsync("TaskUpdated", dto);
            return Ok(new { message = "Đã thêm file đính kèm", data = dto });
        }

    }
}