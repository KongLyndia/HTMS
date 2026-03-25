using HTMS_API.DTOs.Dashboard;

namespace HTMS_API.Services.Interfaces
{
    public interface IDashboardService
    {
        System.Threading.Tasks.Task<DashboardStatsDto> GetStatsAsync(Guid userId);
        System.Threading.Tasks.Task<List<ChartDataPointDto>> GetChartDataAsync(Guid userId);
        System.Threading.Tasks.Task<List<AssignedTaskDto>> GetAssignedTasksAsync(Guid userId);
        System.Threading.Tasks.Task<List<PersonalTaskDto>> GetPersonalTasksAsync(Guid userId);
        System.Threading.Tasks.Task<PersonalTaskDto> CreatePersonalTaskAsync(Guid userId, CreatePersonalTaskDto dto);
        System.Threading.Tasks.Task TogglePersonalTaskAsync(Guid userId, Guid taskId);
        System.Threading.Tasks.Task<List<ProjectProgressDto>> GetProjectProgressAsync(Guid userId);
    }
}