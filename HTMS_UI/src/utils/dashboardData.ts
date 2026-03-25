// ── Mock data cho Dashboard ─────────────────────────────────────────

export const chartData = [
  { day: "T2", completed: 4, total: 6 },
  { day: "T3", completed: 7, total: 9 },
  { day: "T4", completed: 3, total: 5 },
  { day: "T5", completed: 8, total: 10 },
  { day: "T6", completed: 6, total: 8 },
  { day: "T7", completed: 9, total: 11 },
  { day: "CN", completed: 5, total: 7  },
];

export type TaskStatus = "todo" | "inprogress" | "review" | "done";

export interface Task {
  id:        string;
  title:     string;
  project:   string;
  status:    TaskStatus;
  priority:  "high" | "medium" | "low";
  dueDate:   string;
}

export const assignedTasks: Task[] = [
  { id: "1", title: "Thiết kế màn hình Kanban Board",  project: "HTMS",       status: "inprogress", priority: "high",   dueDate: "12/03" },
  { id: "2", title: "Viết API endpoint cho Task CRUD", project: "HTMS",       status: "review",     priority: "high",   dueDate: "13/03" },
  { id: "3", title: "Tích hợp SignalR real-time",      project: "HTMS",       status: "todo",       priority: "medium", dueDate: "15/03" },
  { id: "4", title: "Viết unit test AuthService",      project: "HTMS",       status: "done",       priority: "low",    dueDate: "10/03" },
  { id: "5", title: "Cập nhật tài liệu API",           project: "Onboarding", status: "todo",       priority: "low",    dueDate: "18/03" },
];

export interface Todo {
  id:        string;
  text:      string;
  done:      boolean;
}

export const initialTodos: Todo[] = [
  { id: "1", text: "Review PR của Minh",          done: false },
  { id: "2", text: "Daily standup 9:00",           done: true  },
  { id: "3", text: "Cập nhật tiến độ sprint",      done: false },
  { id: "4", text: "Test flow đăng ký người dùng", done: false },
  { id: "5", text: "Gửi báo cáo tuần cho PM",      done: true  },
];

export interface ProjectStat {
  name:     string;
  tasks:    number;
  done:     number;
  color:    string;
}

export const projectStats: ProjectStat[] = [
  { name: "HTMS Backend",  tasks: 24, done: 18, color: "#0d9488" },
  { name: "HTMS Frontend", tasks: 31, done: 19, color: "#2dd4bf" },
  { name: "Onboarding",    tasks: 12, done: 10, color: "#34d399" },
];

export const statCards = [
  { label: "Tasks hôm nay",   value: "8",   sub: "+2 so với hôm qua", trend: "up"   },
  { label: "Đang thực hiện",  value: "3",   sub: "2 sắp đến hạn",     trend: "warn" },
  { label: "Hoàn thành tuần", value: "42",  sub: "87% tỷ lệ đúng hạn",trend: "up"   },
  { label: "Dự án tham gia",  value: "3",   sub: "1 dự án mới",       trend: "up"   },
];