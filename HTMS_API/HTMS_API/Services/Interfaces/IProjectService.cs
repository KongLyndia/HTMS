using HTMS_API.DTOs;

namespace HTMS_API.Services.Interfaces
{
    public interface IProjectService
    {
        Task<ProjectCreatedDto> CreateAsync(Guid ownerId, CreateProjectRequest request);
        Task<List<ProjectListItemDto>> GetMyProjectsAsync(Guid userId);
        Task<ProjectDetailDto> GetDetailAsync(Guid userId, Guid projectId);
        Task<ProjectDetailDto> UpdateAsync(Guid userId, Guid projectId, UpdateProjectRequest request);
        Task DeleteAsync(Guid userId, Guid projectId);
        Task<MemberResultDto> AddMemberAsync(Guid requesterId, Guid projectId, InviteMemberDto dto);
        Task UpdateMemberRoleAsync(Guid requesterId, Guid projectId, Guid targetUserId, string newRole);
        Task RemoveMemberAsync(Guid requesterId, Guid projectId, Guid targetUserId);
    }
}