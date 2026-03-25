using HTMS_API.DTOs.MyTasks;

namespace HTMS_API.Services.Interfaces
{
    public interface IMyTasksService
    {
        Task<List<AggregatedTaskDto>> GetMyTasksAsync(Guid userId);
        Task<bool> CompletePersonalTaskAsync(Guid personalTaskId, Guid userId);

        /// <summary>Tạo mới PersonalTask cho user.</summary>
        Task<AggregatedTaskDto> CreatePersonalTaskAsync(Guid userId, CreatePersonalTaskRequest req);
    }
}