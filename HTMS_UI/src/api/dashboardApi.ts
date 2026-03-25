import axiosClient from "./axiosClient";

// ── Types khớp với DashboardDto.cs bên BE ────────────────────────────

export interface DashboardStats {
  tasksToday:             number;
  tasksInProgress:        number;
  tasksCompletedThisWeek: number;
  projectCount:           number;
  completionRate:         number;
}

export interface ChartDataPoint {
  day:       string;
  completed: number;
  total:     number;
}

export interface AssignedTask {
  taskId:      string;
  title:       string;
  projectName: string;
  taskStatus:  string;
  priority:    string | null;
  dueDate:     string | null;
}

export interface PersonalTask {
  personalTaskId: string;
  title:          string;
  isCompleted:    boolean;
  dueDate:        string | null;
}

export interface ProjectProgress {
  projectId:   string;
  projectName: string;
  totalTasks:  number;
  doneTasks:   number;
  percentage:  number;
}

// ── API functions — cast as unknown trước để bypass AxiosResponse ─────
// axiosClient interceptor đã unwrap { message, data } rồi,
// nhưng TypeScript không biết nên cần ép kiểu thủ công

export const dashboardApi = {
  getStats: () =>
    axiosClient.get("/dashboard/stats") as unknown as Promise<DashboardStats>,

  getChart: () =>
    axiosClient.get("/dashboard/chart") as unknown as Promise<ChartDataPoint[]>,

  getAssignedTasks: () =>
    axiosClient.get("/dashboard/tasks") as unknown as Promise<AssignedTask[]>,

  getPersonalTasks: () =>
    axiosClient.get("/dashboard/personal-tasks") as unknown as Promise<PersonalTask[]>,

  getProjects: () =>
    axiosClient.get("/dashboard/projects") as unknown as Promise<ProjectProgress[]>,

  createPersonalTask: (title: string, dueDate?: string) =>
    axiosClient.post("/dashboard/personal-tasks", { title, dueDate }) as unknown as Promise<PersonalTask>,

  togglePersonalTask: (id: string) =>
    axiosClient.patch(`/dashboard/personal-tasks/${id}/toggle`) as unknown as Promise<void>,
};