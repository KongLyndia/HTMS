import axiosClient from "./axiosClient";

export interface MemberTaskStats {
  total:          number;
  completed:      number;
  inProgress:     number;
  pending:        number;
  todo:           number;
  completionRate: number;
}

export interface ProjectMember {
  userId:    string;
  fullName:  string;
  email:     string;
  avatarUrl: string | null;
  role:      "Manager" | "Member" | "Viewer";
  joinedAt:  string;
  isOwner:   boolean;
  taskStats: MemberTaskStats;
}

export interface MembersData {
  myRole:  string;
  members: ProjectMember[];
}

export interface ActivityLog {
  logId:      string;
  actionType: string;
  entityType: string;
  entityName: string | null;
  oldValue:   string | null;
  newValue:   string | null;
  createdAt:  string;
  userName:   string;
  userAvatar: string | null;
  userId:     string;
}

export interface ActivityData {
  total:    number;
  page:     number;
  pageSize: number;
  logs:     ActivityLog[];
}

export interface MemberStat {
  userId:         string;
  fullName:       string;
  avatarUrl:      string | null;
  role:           string;
  total:          number;
  completed:      number;
  inProgress:     number;
  pending:        number;
  todo:           number;
  completionRate: number;
}

export interface ProjectStats {
  myRole:  string;
  summary: {
    total: number; completed: number; inProgress: number;
    pending: number; todo: number; overdue: number;
    progress: number; memberCount: number;
  };
  byStatus:   { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  memberStats: MemberStat[];
}

export const membersApi = {
  getReport: (projectId: string) =>
    axiosClient.get(`/project/${projectId}/report`) as unknown as Promise<any>,

  getStats: (projectId: string) =>
    axiosClient.get(`/project/${projectId}/stats`) as unknown as Promise<ProjectStats>,

  getMembers: (projectId: string) =>
    axiosClient.get(`/project/${projectId}/members`) as unknown as Promise<MembersData>,

  getActivity: (projectId: string, page = 1, entity?: string, action?: string) => {
    const params = new URLSearchParams({ page: String(page), pageSize: "30" });
    if (entity) params.set("entity", entity);
    if (action) params.set("action", action);
    return axiosClient.get(`/project/${projectId}/members/activity?${params}`) as unknown as Promise<ActivityData>;
  },

  addMember: (projectId: string, email: string, role: string) =>
    axiosClient.post(`/project/${projectId}/members`, { email, role }) as unknown as Promise<void>,

  updateRole: (projectId: string, userId: string, role: string) =>
    axiosClient.patch(`/project/${projectId}/members/${userId}/role`, { role }) as unknown as Promise<void>,

  removeMember: (projectId: string, userId: string) =>
    axiosClient.delete(`/project/${projectId}/members/${userId}`) as unknown as Promise<void>,

  searchUser: (email: string) =>
    axiosClient.get(`/user/search?email=${encodeURIComponent(email)}`) as unknown as Promise<{
      userId: string; fullName: string; email: string; avatarUrl: string | null;
    }>,
};