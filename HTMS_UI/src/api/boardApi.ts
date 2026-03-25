import axiosClient from "./axiosClient";

// ── Types ─────────────────────────────────────────────────────────────
export type TaskStatus = "Todo" | "In Progress" | "Pending" | "Completed" | "Rejected";
export type Priority   = "Low" | "Medium" | "High" | "Urgent";

export interface BoardAssignee {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
}

export interface AttachmentDto {
  attachmentId: string;
  fileName: string;
  fileUrl: string;
  isEvidence: boolean;
  uploadedById: string;
  createdAt: string;
}

export interface TaskCommentDto {
  commentId:  string;
  content:    string;
  userId:     string;
  userName:   string;
  userAvatar: string | null;
  createdAt:  string;
}

export interface ActivityLogDto {
  logId: string;
  actionType: string;
  oldStatus: string | null;
  newStatus: string | null;
  note: string | null;
  userId: string;
  userName: string;
  userAvatar: string | null;
  createdAt: string;
}

export interface BoardTask {
  taskId: string;
  columnId: string;
  title: string;
  description: string | null;
  priority: Priority | null;
  dueDate: string | null;
  assigneeId: string | null;
  assignee: BoardAssignee | null;
  creatorId: string;
  taskStatus: TaskStatus;
  isApproved: boolean;
  approvedById: string | null;
  position: number;
  createdAt: string;
  updatedAt: string | null;
  attachments: AttachmentDto[];
  comments: TaskCommentDto[];
  activityLogs: ActivityLogDto[];
}

export interface BoardColumn {
  columnId: string;
  columnName: string;
  position: number;
  tasks: BoardTask[];
}

export interface BoardMember {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
}

export interface BoardData {
  projectId: string;
  projectName: string;
  myRole: string;
  myUserId: string;
  members: BoardMember[];
  columns: BoardColumn[];
}

// Helper: axiosClient interceptor đã unwrap .data.data
// nên thực tế Promise<AxiosResponse<T>> → T
// Dùng cast "as unknown as Promise<T>" để TS hiểu đúng

const api = axiosClient;

export const boardApi = {
  getBoard: (projectId: string) =>
    api.get(`/project/${projectId}/board`) as unknown as Promise<BoardData>,

  getTask: (projectId: string, taskId: string) =>
    api.get(`/project/${projectId}/tasks/${taskId}`) as unknown as Promise<BoardTask>,

  createTask: (projectId: string, payload: {
    title: string;
    description?: string;
    priority?: Priority;
    dueDate?: string;
    assigneeId?: string;
  }) => api.post(`/project/${projectId}/tasks`, payload) as unknown as Promise<BoardTask>,

  updateTask: (projectId: string, taskId: string, payload: {
    title?: string;
    description?: string;
    priority?: Priority | null;
    dueDate?: string | null;
    assigneeId?: string | null;
    clearAssignee?: boolean;
  }) => api.patch(`/project/${projectId}/tasks/${taskId}`, payload) as unknown as Promise<BoardTask>,

  startTask: (projectId: string, taskId: string) =>
    api.post(`/project/${projectId}/tasks/${taskId}/start`) as unknown as Promise<BoardTask>,

  submitTask: (projectId: string, taskId: string, files: File[]) => {
    const fd = new FormData();
    files.forEach(f => fd.append("files", f));
    return api.post(
      `/project/${projectId}/tasks/${taskId}/submit`,
      fd,
      { headers: { "Content-Type": "multipart/form-data" } }
    ) as unknown as Promise<BoardTask>;
  },

  reviewTask: (projectId: string, taskId: string, payload: {
    approve: boolean;
    reason?: string;
  }) => api.post(`/project/${projectId}/tasks/${taskId}/review`, payload) as unknown as Promise<BoardTask>,

  deleteTask: (projectId: string, taskId: string) =>
    api.delete(`/project/${projectId}/tasks/${taskId}`) as unknown as Promise<void>,

  deleteAttachment: (projectId: string, taskId: string, attachmentId: string) =>
    api.delete(`/project/${projectId}/tasks/${taskId}/attachments/${attachmentId}`) as unknown as Promise<BoardTask>,

  addComment: (projectId: string, taskId: string, content: string) =>
    api.post(`/project/${projectId}/tasks/${taskId}/comments`, { content }) as unknown as Promise<BoardTask>,

  deleteComment: (projectId: string, taskId: string, commentId: string) =>
    api.delete(`/project/${projectId}/tasks/${taskId}/comments/${commentId}`) as unknown as Promise<BoardTask>,

  addAttachment: (projectId: string, taskId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post(`/project/${projectId}/tasks/${taskId}/attachments`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    }) as unknown as Promise<BoardTask>;
  },
};