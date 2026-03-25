using System.Security.Claims;
using HTMS_API.DTOs;
using HTMS_API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using HTMS_API.Data;
using HTMS_API.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace HTMS_API.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class ProjectController : ControllerBase
    {
        private readonly IProjectService _svc;
        private readonly IProjectActivityService _activity;
        private readonly AppDbContext _db;
        private readonly IHubContext<BoardHub> _hub;
        private readonly IHubContext<NotificationHub> _notifHub;

        public ProjectController(
            IProjectService svc,
            IProjectActivityService activity,
            AppDbContext db,
            IHubContext<BoardHub> hub,
            IHubContext<NotificationHub> notifHub)
        {
            _svc = svc;
            _activity = activity;
            _db = db;
            _hub = hub;
            _notifHub = notifHub;
        }

        private async System.Threading.Tasks.Task BroadcastMembersUpdated(Guid projectId)
        {
            await _hub.Clients.Group($"board-{projectId}").SendAsync("MembersUpdated");
        }

        // Push event tới từng userId qua NotificationHub
        private async System.Threading.Tasks.Task PushToMembers(Guid projectId, string eventName, object payload)
        {
            var memberIds = await _db.ProjectMembers
                .Where(pm => pm.ProjectId == projectId)
                .Select(pm => pm.UserId)
                .ToListAsync();
            foreach (var uid in memberIds)
                await _notifHub.Clients.Group(uid.ToString()).SendAsync(eventName, payload);
        }

        private Guid CurrentUserId
        {
            get
            {
                var sub = User.FindFirstValue(ClaimTypes.NameIdentifier)
                       ?? User.FindFirstValue("sub");
                if (sub == null || !Guid.TryParse(sub, out var id))
                    throw new UnauthorizedAccessException();
                return id;
            }
        }

        // POST /api/project
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateProjectRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.ProjectName))
                return BadRequest(new { message = "Tên dự án không được để trống" });

            try
            {
                var result = await _svc.CreateAsync(CurrentUserId, request);
                // Notify chính người tạo để sidebar tự cập nhật
                await _notifHub.Clients.Group(CurrentUserId.ToString()).SendAsync(
                    "ProjectCreated",
                    new { projectId = result.ProjectId, projectName = result.ProjectName }
                );
                return Ok(new { message = "Tạo dự án thành công", data = result });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // GET /api/project
        [HttpGet]
        public async Task<IActionResult> GetMyProjects()
        {
            try
            {
                var result = await _svc.GetMyProjectsAsync(CurrentUserId);
                return Ok(new { message = "OK", data = result });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // GET /api/project/{id}
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetDetail(Guid id)
        {
            try
            {
                var result = await _svc.GetDetailAsync(CurrentUserId, id);
                return Ok(new { message = "OK", data = result });
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return NotFound(new { message = ex.Message }); }
        }

        // PATCH /api/project/{id}
        [HttpPatch("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProjectRequest request)
        {
            try
            {
                var result = await _svc.UpdateAsync(CurrentUserId, id, request);
                await PushToMembers(id, "ProjectUpdated",
                    new { projectId = result.ProjectId, projectName = result.ProjectName });
                return Ok(new { message = "Cập nhật thành công", data = result });
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // DELETE /api/project/{id}
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            try
            {
                // Lấy member list TRƯỚC khi xóa (sau xóa cascade sẽ mất)
                await PushToMembers(id, "ProjectDeleted", new { projectId = id });
                await _svc.DeleteAsync(CurrentUserId, id);
                return Ok(new { message = "Đã xóa dự án" });
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // POST /api/project/{id}/members
        [HttpPost("{id:guid}/members")]
        public async Task<IActionResult> AddMember(Guid id, [FromBody] InviteMemberDto dto)
        {
            try
            {
                var result = await _svc.AddMemberAsync(CurrentUserId, id, dto);
                if (!result.Success)
                    return BadRequest(new { message = result.Error, data = result });
                await _activity.LogAsync(id, CurrentUserId, "ADD_MEMBER", "Member",
                    result.FullName, null, result.Role);
                await BroadcastMembersUpdated(id);
                // Push ProjectCreated tới người vừa được thêm để sidebar hiện dự án mới
                var addedUser = await _db.Users
                    .Where(u => u.Email.ToLower() == dto.Email.Trim().ToLower())
                    .Select(u => u.UserId).FirstOrDefaultAsync();
                var proj = await _db.Projects.FindAsync(id);
                if (addedUser != Guid.Empty && proj != null)
                    await _notifHub.Clients.Group(addedUser.ToString()).SendAsync(
                        "ProjectCreated",
                        new { projectId = id, projectName = proj.ProjectName }
                    );
                return Ok(new { message = "Thêm thành viên thành công", data = result });
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // DELETE /api/project/{id}/members/{userId}
        [HttpDelete("{id:guid}/members/{userId:guid}")]
        public async Task<IActionResult> RemoveMember(Guid id, Guid userId)
        {
            try
            {
                var removedUser = await _db.Users.FindAsync(userId);
                await _svc.RemoveMemberAsync(CurrentUserId, id, userId);
                await _activity.LogAsync(id, CurrentUserId, "REMOVE_MEMBER", "Member",
                    removedUser?.FullName ?? userId.ToString());
                await BroadcastMembersUpdated(id);
                // Push ProjectDeleted tới người bị xóa để sidebar ẩn dự án
                await _notifHub.Clients.Group(userId.ToString()).SendAsync(
                    "ProjectDeleted", new { projectId = id }
                );
                return Ok(new { message = "Đã xóa thành viên" });
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // PATCH /api/project/{id}/members/{userId}/role
        [HttpPatch("{id:guid}/members/{userId:guid}/role")]
        public async Task<IActionResult> UpdateMemberRole(
            Guid id, Guid userId, [FromBody] UpdateRoleRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Role))
                return BadRequest(new { message = "Role không hợp lệ" });
            try
            {
                var targetUser = await _db.Users.FindAsync(userId);
                await _svc.UpdateMemberRoleAsync(CurrentUserId, id, userId, request.Role);
                await _activity.LogAsync(id, CurrentUserId, "CHANGE_ROLE", "Member",
                    targetUser?.FullName ?? userId.ToString(), null, request.Role);
                await BroadcastMembersUpdated(id);
                return Ok(new { message = "Đã cập nhật role" });
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }
    }

    public record UpdateRoleRequest(string Role);
}