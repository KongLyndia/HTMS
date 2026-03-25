using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace HTMS_API.Hubs
{
    [Authorize]
    public class BoardHub : Hub
    {
        // Board page
        public async System.Threading.Tasks.Task JoinBoard(string projectId)
            => await Groups.AddToGroupAsync(Context.ConnectionId, $"board-{projectId}");

        public async System.Threading.Tasks.Task LeaveBoard(string projectId)
            => await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"board-{projectId}");

        // Members / Stats page — dùng chung group "board-{projectId}"
        public async System.Threading.Tasks.Task JoinProject(string projectId)
            => await Groups.AddToGroupAsync(Context.ConnectionId, $"board-{projectId}");

        public async System.Threading.Tasks.Task LeaveProject(string projectId)
            => await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"board-{projectId}");
    }
}