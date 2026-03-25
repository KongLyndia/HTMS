using Microsoft.EntityFrameworkCore;
using HTMS_API.Data;
using HTMS_API.DTOs.MyTasks;
using HTMS_API.Models;
using HTMS_API.Services.Interfaces;

namespace HTMS_API.Services
{
    public class MyTasksService : IMyTasksService
    {
        private readonly AppDbContext _db;

        public MyTasksService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<List<AggregatedTaskDto>> GetMyTasksAsync(Guid userId)
        {
            // ── 1. Personal Tasks chưa hoàn thành ──────────────────────────
            var personalTasks = await _db.PersonalTasks
                .Where(pt => pt.UserId == userId)
                .Select(pt => new AggregatedTaskDto
                {
                    Id = pt.PersonalTaskId,
                    Type = "personal",
                    Title = pt.Title,
                    Description = pt.Description,
                    DueDate = pt.DueDate,
                    IsCompleted = pt.IsCompleted,
                    CreatedAt = pt.CreatedAt,
                })
                .ToListAsync();

            // ── 2. Project Tasks được giao, chưa Completed (bỏ project đã xóa) ──
            var projectTasks = await _db.Tasks
                .Where(t => t.AssigneeId == userId && t.TaskStatus != "Completed")
                .Join(_db.TaskColumns,
                      t => t.ColumnId,
                      c => c.ColumnId,
                      (t, c) => new { Task = t, Column = c })
                .Join(_db.Projects.Where(p => p.DeletedAt == null),
                      tc => tc.Column.ProjectId,
                      p => p.ProjectId,
                      (tc, p) => new AggregatedTaskDto
                      {
                          Id = tc.Task.TaskId,
                          Type = "project",
                          Title = tc.Task.Title,
                          Description = tc.Task.Description,
                          DueDate = tc.Task.DueDate,
                          Priority = tc.Task.Priority,
                          TaskStatus = tc.Task.TaskStatus,
                          ProjectId = p.ProjectId,
                          ProjectName = p.ProjectName,
                          ColumnName = tc.Column.ColumnName,
                          IsCompleted = false,
                          CreatedAt = tc.Task.CreatedAt,
                      })
                .ToListAsync();

            // ── 3. Gộp & sắp theo DueDate (null xuống cuối) ────────────────
            var result = personalTasks
                .Concat(projectTasks)
                .OrderBy(t => t.DueDate.HasValue ? 0 : 1)
                .ThenBy(t => t.DueDate)
                .ThenByDescending(t => t.CreatedAt)
                .ToList();

            return result;
        }

        public async Task<bool> CompletePersonalTaskAsync(Guid personalTaskId, Guid userId)
        {
            var task = await _db.PersonalTasks
                .FirstOrDefaultAsync(pt => pt.PersonalTaskId == personalTaskId && pt.UserId == userId);

            if (task is null) return false;

            task.IsCompleted = true;
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<AggregatedTaskDto> CreatePersonalTaskAsync(Guid userId, CreatePersonalTaskRequest req)
        {
            var task = new PersonalTask
            {
                PersonalTaskId = Guid.NewGuid(),
                UserId = userId,
                Title = req.Title.Trim(),
                Description = req.Description?.Trim(),
                DueDate = req.DueDate,
                IsCompleted = false,
                CreatedAt = DateTime.Now,
            };

            _db.PersonalTasks.Add(task);
            await _db.SaveChangesAsync();

            return new AggregatedTaskDto
            {
                Id = task.PersonalTaskId,
                Type = "personal",
                Title = task.Title,
                Description = task.Description,
                DueDate = task.DueDate,
                IsCompleted = false,
                CreatedAt = task.CreatedAt,
            };
        }
    }
}