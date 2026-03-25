// Alias tránh conflict với HTMS_API.Models.Task
using SysTask = System.Threading.Tasks.Task;
using HTMS_API.Data;
using HTMS_API.DTOs;
using HTMS_API.Models;
using HTMS_API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HTMS_API.Services
{
    public class ProjectService : IProjectService
    {
        private readonly AppDbContext _db;
        private readonly INotificationService _notif;

        public ProjectService(AppDbContext db, INotificationService notif)
        {
            _db = db;
            _notif = notif;
        }

        // ══════════════════════════════════════════════════════════
        // HELPERS — query role theo tên, không hardcode GUID
        // ══════════════════════════════════════════════════════════

        private async System.Threading.Tasks.Task<Guid> GetRoleIdAsync(string roleName)
        {
            var role = await _db.Roles.FirstOrDefaultAsync(r => r.RoleName == roleName)
                ?? throw new Exception($"Không tìm thấy role '{roleName}' trong hệ thống");
            return role.RoleId;
        }

        private async System.Threading.Tasks.Task<string> GetRoleNameAsync(Guid roleId)
        {
            var role = await _db.Roles.FindAsync(roleId);
            return role?.RoleName ?? "Member";
        }

        private async System.Threading.Tasks.Task<bool> IsManagerAsync(Guid userId, Guid projectId)
        {
            var managerRoleId = await GetRoleIdAsync("Manager");
            return await _db.ProjectMembers.AnyAsync(pm =>
                pm.ProjectId == projectId &&
                pm.UserId == userId &&
                pm.RoleId == managerRoleId);
        }

        // ══════════════════════════════════════════════════════════
        // CREATE PROJECT
        // ══════════════════════════════════════════════════════════
        public async System.Threading.Tasks.Task<ProjectCreatedDto> CreateAsync(
            Guid ownerId, CreateProjectRequest request)
        {
            var managerRoleId = await GetRoleIdAsync("Manager");

            var project = new Project
            {
                ProjectId = Guid.NewGuid(),
                ProjectName = request.ProjectName.Trim(),
                Description = request.Description?.Trim(),
                OwnerId = ownerId,
                CreatedAt = DateTime.Now,
            };
            _db.Projects.Add(project);

            // Owner tự động là Manager
            _db.ProjectMembers.Add(new ProjectMember
            {
                ProjectId = project.ProjectId,
                UserId = ownerId,
                RoleId = managerRoleId,
                JoinedAt = DateTime.Now,
            });

            // Seed 4 cột mặc định cố định cho mọi dự án
            var defaultColumns = new[]
            {
                ("Todo",        1),
                ("In Progress", 2),
                ("Pending",     3),
                ("Completed",   4),
            };
            var columnNames = new List<string>();
            foreach (var (name, pos) in defaultColumns)
            {
                _db.TaskColumns.Add(new TaskColumn
                {
                    ColumnId = Guid.NewGuid(),
                    ProjectId = project.ProjectId,
                    ColumnName = name,
                    Position = pos,
                });
                columnNames.Add(name);
            }

            await _db.SaveChangesAsync();

            // Mời thành viên
            var owner = await _db.Users.FindAsync(ownerId);
            var memberResults = new List<MemberResultDto>();
            foreach (var invite in request.Members)
            {
                var res = await AddMemberInternalAsync(
                    ownerId, project.ProjectId, invite, owner?.FullName ?? "Owner");
                memberResults.Add(res);
            }

            // Thông báo cho chính owner
            await _notif.CreateAsync(new CreateNotificationDto
            {
                UserId = ownerId,
                SenderId = null, // từ hệ thống
                Title = "Dự án đã tạo thành công",
                Message = $"Dự án \"{project.ProjectName}\" đã được khởi tạo với {columnNames.Count} cột.",
                LinkUrl = $"/projects/{project.ProjectId}/board",
            });

            return new ProjectCreatedDto
            {
                ProjectId = project.ProjectId,
                ProjectName = project.ProjectName,
                Description = project.Description,
                CreatedAt = project.CreatedAt,
                Columns = columnNames,
                Members = memberResults,
            };
        }

        // ══════════════════════════════════════════════════════════
        // THÊM THÀNH VIÊN — kiểm tra đầy đủ
        // ══════════════════════════════════════════════════════════
        private async System.Threading.Tasks.Task<MemberResultDto> AddMemberInternalAsync(
            Guid requesterId, Guid projectId, InviteMemberDto invite, string requesterName)
        {
            var email = invite.Email.Trim().ToLower();

            // 1. Validate email format
            if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
                return new MemberResultDto
                {
                    Email = invite.Email,
                    Success = false,
                    Error = "Email không hợp lệ",
                };

            // 2. Tìm user trong DB
            var user = await _db.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == email && u.IsActive);

            if (user == null)
                return new MemberResultDto
                {
                    Email = invite.Email,
                    Success = false,
                    Error = "Không tìm thấy tài khoản — người dùng chưa đăng ký hoặc đã bị vô hiệu hóa",
                };

            // 3. Không thể mời chính mình
            if (user.UserId == requesterId)
                return new MemberResultDto
                {
                    Email = user.Email,
                    FullName = user.FullName ?? "",
                    Success = false,
                    Error = "Không thể mời chính mình — bạn đã là Manager của dự án",
                };

            // 4. Kiểm tra đã là thành viên chưa
            var exists = await _db.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == user.UserId);
            if (exists)
                return new MemberResultDto
                {
                    Email = user.Email,
                    FullName = user.FullName ?? "",
                    Role = invite.Role,
                    Success = false,
                    Error = "Người dùng đã là thành viên của dự án",
                };

            // 5. Validate role name
            var validRoles = new[] { "Manager", "Member", "Viewer" };
            var roleName = validRoles.Contains(invite.Role) ? invite.Role : "Member";
            Guid roleId;
            try { roleId = await GetRoleIdAsync(roleName); }
            catch
            {
                return new MemberResultDto
                {
                    Email = user.Email,
                    Success = false,
                    Error = $"Role '{roleName}' không tồn tại trong hệ thống",
                };
            }

            // 6. Thêm vào DB
            _db.ProjectMembers.Add(new ProjectMember
            {
                ProjectId = projectId,
                UserId = user.UserId,
                RoleId = roleId,
                JoinedAt = DateTime.Now,
            });
            await _db.SaveChangesAsync();

            // 7. Gửi notification
            var project = await _db.Projects.FindAsync(projectId);
            await _notif.CreateAsync(new CreateNotificationDto
            {
                UserId = user.UserId,
                SenderId = requesterId,
                Title = "Được thêm vào dự án",
                Message = $"{requesterName} đã thêm bạn vào dự án \"{project?.ProjectName}\" với vai trò {roleName}.",
                LinkUrl = $"/projects/{projectId}/board",
            });

            return new MemberResultDto
            {
                Email = user.Email,
                FullName = user.FullName ?? "",
                Role = roleName,
                Success = true,
            };
        }

        // ══════════════════════════════════════════════════════════
        // GET MY PROJECTS
        // ══════════════════════════════════════════════════════════
        public async System.Threading.Tasks.Task<List<ProjectListItemDto>> GetMyProjectsAsync(Guid userId)
        {
            var rows = await (
                from pm in _db.ProjectMembers
                join p in _db.Projects on pm.ProjectId equals p.ProjectId
                join owner in _db.Users on p.OwnerId equals owner.UserId
                where pm.UserId == userId && p.DeletedAt == null
                orderby p.CreatedAt descending
                select new
                {
                    p.ProjectId,
                    p.ProjectName,
                    p.Description,
                    OwnerName = owner.FullName ?? owner.Email,
                    pm.RoleId,
                    p.CreatedAt,
                }
            ).ToListAsync();

            var ids = rows.Select(r => r.ProjectId).ToList();
            var counts = await _db.ProjectMembers
                .Where(pm => ids.Contains(pm.ProjectId))
                .GroupBy(pm => pm.ProjectId)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.Count);

            // Lấy tất cả roles một lần
            var roleMap = await _db.Roles
                .ToDictionaryAsync(r => r.RoleId, r => r.RoleName);

            return rows.Select(r => new ProjectListItemDto
            {
                ProjectId = r.ProjectId,
                ProjectName = r.ProjectName,
                Description = r.Description,
                OwnerName = r.OwnerName,
                MyRole = roleMap.GetValueOrDefault(r.RoleId, "Member"),
                MemberCount = counts.GetValueOrDefault(r.ProjectId, 0),
                CreatedAt = r.CreatedAt,
            }).ToList();
        }

        // ══════════════════════════════════════════════════════════
        // GET DETAIL
        // ══════════════════════════════════════════════════════════
        public async System.Threading.Tasks.Task<ProjectDetailDto> GetDetailAsync(
            Guid userId, Guid projectId)
        {
            var myMembership = await _db.ProjectMembers
                .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId)
                ?? throw new Exception("Bạn không có quyền truy cập dự án này");

            var project = await _db.Projects
                .FirstOrDefaultAsync(p => p.ProjectId == projectId && p.DeletedAt == null)
                ?? throw new Exception("Dự án không tồn tại");

            var owner = await _db.Users.FindAsync(project.OwnerId);
            var roleMap = await _db.Roles.ToDictionaryAsync(r => r.RoleId, r => r.RoleName);

            var columns = await (
                from col in _db.TaskColumns
                where col.ProjectId == projectId
                orderby col.Position
                select new ProjectColumnDto
                {
                    ColumnId = col.ColumnId,
                    ColumnName = col.ColumnName,
                    Position = col.Position,
                    TaskCount = _db.Tasks.Count(t => t.ColumnId == col.ColumnId),
                }
            ).ToListAsync();

            var members = await (
                from pm in _db.ProjectMembers
                join u in _db.Users on pm.UserId equals u.UserId
                where pm.ProjectId == projectId
                orderby pm.JoinedAt
                select new ProjectMemberDto
                {
                    UserId = u.UserId,
                    FullName = u.FullName ?? u.Email,
                    Email = u.Email,
                    AvatarUrl = u.AvatarUrl,
                    Role = pm.RoleId.ToString(), // tạm — replace bên dưới
                    JoinedAt = pm.JoinedAt,
                }
            ).ToListAsync();

            // Map role name sau khi query xong
            var memberRoles = await _db.ProjectMembers
                .Where(pm => pm.ProjectId == projectId)
                .Select(pm => new { pm.UserId, pm.RoleId })
                .ToDictionaryAsync(x => x.UserId, x => x.RoleId);

            foreach (var m in members)
                m.Role = roleMap.GetValueOrDefault(memberRoles.GetValueOrDefault(m.UserId), "Member");

            return new ProjectDetailDto
            {
                ProjectId = project.ProjectId,
                ProjectName = project.ProjectName,
                Description = project.Description,
                OwnerName = owner?.FullName ?? owner?.Email ?? "",
                MyRole = roleMap.GetValueOrDefault(myMembership.RoleId, "Member"),
                CreatedAt = project.CreatedAt,
                Columns = columns,
                Members = members,
            };
        }

        // ══════════════════════════════════════════════════════════
        // UPDATE
        // ══════════════════════════════════════════════════════════
        public async System.Threading.Tasks.Task<ProjectDetailDto> UpdateAsync(
            Guid userId, Guid projectId, UpdateProjectRequest request)
        {
            if (!await IsManagerAsync(userId, projectId))
                throw new UnauthorizedAccessException("Chỉ Manager mới có thể chỉnh sửa dự án");

            var project = await _db.Projects.FindAsync(projectId)
                ?? throw new Exception("Dự án không tồn tại");

            if (!string.IsNullOrWhiteSpace(request.ProjectName))
                project.ProjectName = request.ProjectName.Trim();
            if (request.Description != null)
                project.Description = request.Description.Trim();

            await _db.SaveChangesAsync();
            return await GetDetailAsync(userId, projectId);
        }

        // ══════════════════════════════════════════════════════════
        // DELETE (soft)
        // ══════════════════════════════════════════════════════════
        public async SysTask DeleteAsync(Guid userId, Guid projectId)
        {
            var project = await _db.Projects.FindAsync(projectId)
                ?? throw new Exception("Dự án không tồn tại");

            if (project.OwnerId != userId)
                throw new UnauthorizedAccessException("Chỉ Owner mới có thể xóa dự án");

            // Lấy tất cả column của dự án
            var colIds = await _db.TaskColumns
                .Where(c => c.ProjectId == projectId)
                .Select(c => c.ColumnId)
                .ToListAsync();

            if (colIds.Any())
            {
                // Xóa toàn bộ dữ liệu liên quan đến task
                var taskIds = await _db.Tasks
                    .Where(t => colIds.Contains(t.ColumnId))
                    .Select(t => t.TaskId)
                    .ToListAsync();

                if (taskIds.Any())
                {
                    await _db.Comments
                        .Where(c => taskIds.Contains(c.TaskId))
                        .ExecuteDeleteAsync();

                    await _db.Attachments
                        .Where(a => taskIds.Contains(a.TaskId))
                        .ExecuteDeleteAsync();

                    await _db.TaskActivityLogs
                        .Where(l => taskIds.Contains(l.TaskId))
                        .ExecuteDeleteAsync();

                    await _db.Tasks
                        .Where(t => colIds.Contains(t.ColumnId))
                        .ExecuteDeleteAsync();
                }

                await _db.TaskColumns
                    .Where(c => c.ProjectId == projectId)
                    .ExecuteDeleteAsync();
            }

            // Xóa activity log dự án
            await _db.ProjectActivityLogs
                .Where(l => l.ProjectId == projectId)
                .ExecuteDeleteAsync();

            // Xóa thành viên
            await _db.ProjectMembers
                .Where(pm => pm.ProjectId == projectId)
                .ExecuteDeleteAsync();

            // Xóa thông báo liên quan
            await _db.Notifications
                .Where(n => n.LinkUrl != null && n.LinkUrl.Contains(projectId.ToString()))
                .ExecuteDeleteAsync();

            // Xóa project
            _db.Projects.Remove(project);
            await _db.SaveChangesAsync();
        }

        // ══════════════════════════════════════════════════════════
        // ADD MEMBER (public API)
        // ══════════════════════════════════════════════════════════
        public async System.Threading.Tasks.Task<MemberResultDto> AddMemberAsync(
            Guid requesterId, Guid projectId, InviteMemberDto dto)
        {
            if (!await IsManagerAsync(requesterId, projectId))
                throw new UnauthorizedAccessException("Chỉ Manager mới có thể thêm thành viên");

            var requester = await _db.Users.FindAsync(requesterId);
            return await AddMemberInternalAsync(
                requesterId, projectId, dto, requester?.FullName ?? "Manager");
        }

        // ══════════════════════════════════════════════════════════
        // REMOVE MEMBER
        // ══════════════════════════════════════════════════════════
        public async SysTask RemoveMemberAsync(
            Guid requesterId, Guid projectId, Guid targetUserId)
        {
            if (!await IsManagerAsync(requesterId, projectId))
                throw new UnauthorizedAccessException("Chỉ Manager mới có thể xóa thành viên");

            var project = await _db.Projects.FindAsync(projectId);
            if (project?.OwnerId == targetUserId)
                throw new Exception("Không thể xóa Owner khỏi dự án");

            var member = await _db.ProjectMembers
                .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == targetUserId)
                ?? throw new Exception("Thành viên không tồn tại");

            _db.ProjectMembers.Remove(member);
            await _db.SaveChangesAsync();

            var requester = await _db.Users.FindAsync(requesterId);
            await _notif.CreateAsync(new CreateNotificationDto
            {
                UserId = targetUserId,
                SenderId = requesterId,
                Title = "Bị xóa khỏi dự án",
                Message = $"{requester?.FullName ?? "Manager"} đã xóa bạn khỏi dự án \"{project?.ProjectName}\".",
            });
        }

        // ══════════════════════════════════════════════════════════
        // UPDATE MEMBER ROLE
        // ══════════════════════════════════════════════════════════
        public async SysTask UpdateMemberRoleAsync(
            Guid requesterId, Guid projectId, Guid targetUserId, string newRole)
        {
            if (!await IsManagerAsync(requesterId, projectId))
                throw new UnauthorizedAccessException("Chỉ Manager mới có thể đổi role");

            var member = await _db.ProjectMembers
                .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == targetUserId)
                ?? throw new Exception("Thành viên không tồn tại");

            Guid newRoleId;
            try { newRoleId = await GetRoleIdAsync(newRole); }
            catch { throw new Exception($"Role '{newRole}' không hợp lệ"); }

            member.RoleId = newRoleId;
            await _db.SaveChangesAsync();

            var project = await _db.Projects.FindAsync(projectId);
            var requester = await _db.Users.FindAsync(requesterId);
            await _notif.CreateAsync(new CreateNotificationDto
            {
                UserId = targetUserId,
                SenderId = requesterId,
                Title = "Vai trò thay đổi",
                Message = $"{requester?.FullName ?? "Manager"} đã cập nhật vai trò của bạn thành {newRole} trong dự án \"{project?.ProjectName}\".",
                LinkUrl = $"/projects/{projectId}/members",
            });
        }
    }
}