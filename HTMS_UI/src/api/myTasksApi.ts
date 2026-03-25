import axiosClient from "./axiosClient";

// ── Types ────────────────────────────────────────────────────────────────────
export type TaskType = "personal" | "project";
export type TaskPriority = "Urgent" | "High" | "Medium" | "Low";
export type TaskStatus = "Todo" | "In Progress" | "Pending" | "Rejected" | "Completed";

export interface AggregatedTask {
  id: string;
  type: TaskType;
  title: string;
  description?: string;
  dueDate?: string;
  priority?: TaskPriority;
  taskStatus?: TaskStatus;
  projectId?: string;
  projectName?: string;
  columnName?: string;
  isCompleted: boolean;
  createdAt: string;
}

export interface CreatePersonalTaskRequest {
  title: string;
  description?: string;
  dueDate?: string; // ISO string
}

// ── API calls ────────────────────────────────────────────────────────────────
export const myTasksApi = {
  /** GET /api/my-tasks */
  getAll: () =>
    axiosClient.get("/my-tasks") as unknown as Promise<AggregatedTask[]>,

  /** POST /api/my-tasks/personal */
  createPersonal: (body: CreatePersonalTaskRequest) =>
    axiosClient.post("/my-tasks/personal", body) as unknown as Promise<AggregatedTask>,

  /** PATCH /api/my-tasks/personal/:id/complete */
  completePersonal: (id: string) =>
    axiosClient.patch(`/my-tasks/personal/${id}/complete`) as unknown as Promise<boolean>,
};