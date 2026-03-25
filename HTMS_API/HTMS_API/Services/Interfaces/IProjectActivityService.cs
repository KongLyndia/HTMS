namespace HTMS_API.Services.Interfaces
{
    public interface IProjectActivityService
    {
        System.Threading.Tasks.Task LogAsync(
            Guid projectId,
            Guid userId,
            string actionType,
            string entityType,
            string? entityName = null,
            string? oldValue = null,
            string? newValue = null);
    }
}