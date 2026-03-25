using HTMS_API.Data;
using HTMS_API.Models;
using HTMS_API.Services.Interfaces;

namespace HTMS_API.Services
{
    public class ProjectActivityService : IProjectActivityService
    {
        private readonly AppDbContext _db;

        public ProjectActivityService(AppDbContext db)
        {
            _db = db;
        }

        public async System.Threading.Tasks.Task LogAsync(
            Guid projectId,
            Guid userId,
            string actionType,
            string entityType,
            string? entityName = null,
            string? oldValue = null,
            string? newValue = null)
        {
            _db.ProjectActivityLogs.Add(new ProjectActivityLog
            {
                LogId = Guid.NewGuid(),
                ProjectId = projectId,
                UserId = userId,
                ActionType = actionType,
                EntityType = entityType,
                EntityName = entityName,
                OldValue = oldValue,
                NewValue = newValue,
                CreatedAt = DateTime.Now,
            });
            await _db.SaveChangesAsync();
        }
    }
}