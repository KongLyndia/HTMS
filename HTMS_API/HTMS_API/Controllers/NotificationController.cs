using System.Security.Claims;
using HTMS_API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HTMS_API.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class NotificationController : ControllerBase
    {
        private readonly INotificationService _svc;
        public NotificationController(INotificationService svc) { _svc = svc; }

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

        // GET /api/notification?page=1&pageSize=20
        [HttpGet]
        public async Task<IActionResult> GetSummary([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            try
            {
                var result = await _svc.GetSummaryAsync(CurrentUserId, page, pageSize);
                return Ok(new { message = "OK", data = result });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // PATCH /api/notification/{id}/read
        [HttpPatch("{id:guid}/read")]
        public async Task<IActionResult> MarkRead(Guid id)
        {
            try
            {
                await _svc.MarkReadAsync(CurrentUserId, id);
                return Ok(new { message = "Đã đọc" });
            }
            catch (Exception ex) { return NotFound(new { message = ex.Message }); }
        }

        // PATCH /api/notification/read-all
        [HttpPatch("read-all")]
        public async Task<IActionResult> MarkAllRead()
        {
            try
            {
                await _svc.MarkAllReadAsync(CurrentUserId);
                return Ok(new { message = "Đã đọc tất cả" });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        // DELETE /api/notification/{id}
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            try
            {
                await _svc.DeleteAsync(CurrentUserId, id);
                return Ok(new { message = "Đã xóa" });
            }
            catch (Exception ex) { return NotFound(new { message = ex.Message }); }
        }
    }
}