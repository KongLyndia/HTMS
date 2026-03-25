using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using HTMS_API.Services.Interfaces;
using HTMS_API.DTOs.MyTasks;

namespace HTMS_API.Controllers
{
    [ApiController]
    [Route("api/my-tasks")]
    [Authorize]
    public class MyTasksController : ControllerBase
    {
        private readonly IMyTasksService _service;

        public MyTasksController(IMyTasksService service)
        {
            _service = service;
        }

        // ── Helpers ──────────────────────────────────────────────────────
        private Guid GetCurrentUserId()
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier)
                   ?? User.FindFirstValue("sub")
                   ?? throw new UnauthorizedAccessException();
            return Guid.Parse(raw);
        }

        // ── GET /api/my-tasks ─────────────────────────────────────────────
        /// <summary>
        /// Trả về danh sách gộp: PersonalTask + Project Task của user hiện tại.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetMyTasks()
        {
            var userId = GetCurrentUserId();
            var tasks = await _service.GetMyTasksAsync(userId);
            return Ok(new { message = "Success", data = tasks });
        }

        // ── POST /api/my-tasks/personal ───────────────────────────────────────
        /// <summary>Tạo mới một PersonalTask.</summary>
        [HttpPost("personal")]
        public async Task<IActionResult> CreatePersonalTask([FromBody] CreatePersonalTaskRequest req)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = GetCurrentUserId();
            var created = await _service.CreatePersonalTaskAsync(userId, req);
            return Ok(new { message = "Tạo công việc thành công.", data = created });
        }

        // ── PATCH /api/my-tasks/personal/{id}/complete ────────────────────
        /// <summary>
        /// Đánh dấu PersonalTask hoàn thành.
        /// </summary>
        [HttpPatch("personal/{id:guid}/complete")]
        public async Task<IActionResult> CompletePersonalTask(Guid id)
        {
            var userId = GetCurrentUserId();
            var success = await _service.CompletePersonalTaskAsync(id, userId);

            if (!success)
                return NotFound(new { message = "Task không tồn tại hoặc không thuộc về bạn." });

            return Ok(new { message = "Đánh dấu hoàn thành thành công.", data = true });
        }
    }
}