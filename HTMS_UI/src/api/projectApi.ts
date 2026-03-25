import axiosClient from "./axiosClient";

export interface SidebarProject {
  projectId:   string;
  projectName: string;
}

export interface InviteMember {
  email: string;
  role:  "Manager" | "Member" | "Viewer";
}

export interface ColumnPayload {
  name:     string;
  position: number;
}

export interface CreateProjectPayload {
  projectName: string;
  description: string;
  members:     InviteMember[];
  columns:     ColumnPayload[];
}

// Alias dùng trong useProjects hook
export type CreateProjectRequest = CreateProjectPayload;

export interface MemberResult {
  email:    string;
  fullName: string;
  role:     string;
  success:  boolean;
  error?:   string;
}

export interface ProjectCreated {
  projectId:      string;
  projectName:    string;
  description:    string | null;
  createdAt:      string;
  columns:        string[];
  members:        MemberResult[];
}

export interface ProjectListItem {
  projectId:   string;
  projectName: string;
  description: string | null;
  ownerName:   string;
  myRole:      string;
  memberCount: number;
  createdAt:   string;
}

export interface UserSearchResult {
  userId:    string;
  fullName:  string;
  email:     string;
  avatarUrl: string | null;
}

export interface ProjectDetail {
  projectId:   string;
  projectName: string;
  description: string | null;
  ownerId?:    string;
  myRole:      string;
  createdAt:   string;
}

export const projectApi = {
  // Sidebar: dùng /dashboard/projects (nhẹ, chỉ cần id + name)
  getSidebarProjects: () =>
    axiosClient.get("/project") as unknown as Promise<SidebarProject[]>,

  // Danh sách đầy đủ (trang /projects)
  getMyProjects: () =>
    axiosClient.get("/project") as unknown as Promise<ProjectListItem[]>,

  // Tạo project mới
  create: (payload: CreateProjectPayload) =>
    axiosClient.post("/project", payload) as unknown as Promise<ProjectCreated>,

  // Tìm user theo email (real-time khi nhập)
  searchUser: (email: string) =>
    axiosClient.get(`/user/search?email=${encodeURIComponent(email)}`) as unknown as Promise<UserSearchResult>,

  // Chi tiết project
  getDetail: (projectId: string) =>
    axiosClient.get(`/project/${projectId}`) as unknown as Promise<ProjectDetail>,

  // Cập nhật project
  update: (projectId: string, payload: { projectName?: string; description?: string }) =>
    axiosClient.patch(`/project/${projectId}`, payload) as unknown as Promise<{ projectId: string; projectName: string; description: string | null }>,

  // Xóa project
  delete: (projectId: string) =>
    axiosClient.delete(`/project/${projectId}`) as unknown as Promise<void>,
};