using System.Security.Claims;
using HTMS_API.DTOs.Dashboard;
using HTMS_API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HTMS_API.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class DashboardController : ControllerBase
    {
        private readonly IDashboardService _dashboardService;

        public DashboardController(IDashboardService dashboardService)
        {
            _dashboardService = dashboardService;
        }

        // Lấy UserId từ JWT — claim "sub" do AuthService tạo ra
        private Guid CurrentUserId
        {
            get
            {
                var sub = User.FindFirstValue(ClaimTypes.NameIdentifier)
                       ?? User.FindFirstValue("sub");

                if (sub == null || !Guid.TryParse(sub, out var id))
                    throw new UnauthorizedAccessException("Token không hợp lệ");

                return id;
            }
        }

        // GET /api/dashboard/stats
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            try
            {
                var result = await _dashboardService.GetStatsAsync(CurrentUserId);
                return Ok(new { message = "OK", data = result });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // GET /api/dashboard/chart
        [HttpGet("chart")]
        public async Task<IActionResult> GetChart()
        {
            try
            {
                var result = await _dashboardService.GetChartDataAsync(CurrentUserId);
                return Ok(new { message = "OK", data = result });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // GET /api/dashboard/tasks
        [HttpGet("tasks")]
        public async Task<IActionResult> GetAssignedTasks()
        {
            try
            {
                var result = await _dashboardService.GetAssignedTasksAsync(CurrentUserId);
                return Ok(new { message = "OK", data = result });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // GET /api/dashboard/personal-tasks
        [HttpGet("personal-tasks")]
        public async Task<IActionResult> GetPersonalTasks()
        {
            try
            {
                var result = await _dashboardService.GetPersonalTasksAsync(CurrentUserId);
                return Ok(new { message = "OK", data = result });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // POST /api/dashboard/personal-tasks
        [HttpPost("personal-tasks")]
        public async Task<IActionResult> CreatePersonalTask([FromBody] CreatePersonalTaskDto dto)
        {
            try
            {
                var result = await _dashboardService.CreatePersonalTaskAsync(CurrentUserId, dto);
                return Ok(new { message = "Tạo thành công", data = result });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // PATCH /api/dashboard/personal-tasks/{id}/toggle
        [HttpPatch("personal-tasks/{id:guid}/toggle")]
        public async Task<IActionResult> TogglePersonalTask(Guid id)
        {
            try
            {
                await _dashboardService.TogglePersonalTaskAsync(CurrentUserId, id);
                return Ok(new { message = "Đã cập nhật" });
            }
            catch (Exception ex) { return NotFound(new { message = ex.Message }); }
        }

        // GET /api/dashboard/projects
        [HttpGet("projects")]
        public async Task<IActionResult> GetProjectProgress()
        {
            try
            {
                var result = await _dashboardService.GetProjectProgressAsync(CurrentUserId);
                return Ok(new { message = "OK", data = result });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }
    }
}