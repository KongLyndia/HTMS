// ═══════════════════════════════════════════════════════════════════
// HTMS — DESIGN TOKENS
// Chỉnh màu ở đây là thay đổi toàn bộ app
// ═══════════════════════════════════════════════════════════════════

// ─── Task Status ────────────────────────────────────────────────────
// Dùng trong: KanbanBoardPage, MyTasksPage, MembersPage, ActivityLog
export const STATUS_THEME = {
  "Todo": {
    label:  "Todo",
    text:   "text-slate-500 dark:text-slate-400",
    bg:     "bg-slate-100 dark:bg-slate-700/40",
    border: "border-slate-300 dark:border-slate-600",
    badge:  "bg-slate-100 text-slate-500 dark:bg-slate-500/20 dark:text-slate-300",
    dot:    "bg-slate-400",
  },
  "In Progress": {
    label:  "Đang làm",
    text:   "text-blue-600 dark:text-blue-400",
    bg:     "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-300 dark:border-blue-700",
    badge:  "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
    dot:    "bg-blue-500",
  },
  "Pending": {
    label:  "Chờ duyệt",
    text:   "text-amber-600 dark:text-amber-400",
    bg:     "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-300 dark:border-amber-700",
    badge:  "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    dot:    "bg-amber-500",
  },
  "Completed": {
    label:  "Hoàn thành",
    text:   "text-emerald-600 dark:text-emerald-400",
    bg:     "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-300 dark:border-emerald-700",
    badge:  "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
    dot:    "bg-emerald-500",
  },
  "Rejected": {
    label:  "Từ chối",
    text:   "text-rose-600 dark:text-rose-400",
    bg:     "bg-rose-50 dark:bg-rose-900/20",
    border: "border-rose-300 dark:border-rose-700",
    badge:  "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400",
    dot:    "bg-rose-500",
  },
} as const;

export type TaskStatus = keyof typeof STATUS_THEME;

export function getStatusTheme(status: string) {
  return STATUS_THEME[status as TaskStatus] ?? STATUS_THEME["Todo"];
}

// ─── Priority ────────────────────────────────────────────────────────
// Dùng trong: KanbanBoardPage, MyTasksPage, MembersPage
export const PRIORITY_THEME = {
  "Urgent": {
    label:  "Khẩn",
    text:   "text-red-600 dark:text-red-400",
    bg:     "bg-red-500/10",
    border: "border-red-200 dark:border-red-500/30",
    badge:  "bg-red-100 text-red-600 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30",
  },
  "High": {
    label:  "Cao",
    text:   "text-rose-500 dark:text-rose-400",
    bg:     "bg-rose-500/10",
    border: "border-rose-200 dark:border-rose-500/30",
    badge:  "bg-orange-100 text-orange-600 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30",
  },
  "Medium": {
    label:  "TB",
    text:   "text-amber-500 dark:text-amber-400",
    bg:     "bg-amber-500/10",
    border: "border-amber-200 dark:border-amber-500/30",
    badge:  "bg-yellow-100 text-yellow-600 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30",
  },
  "Low": {
    label:  "Thấp",
    text:   "text-teal-500 dark:text-teal-400",
    bg:     "bg-teal-500/10",
    border: "border-teal-200 dark:border-teal-500/30",
    badge:  "bg-sky-100 text-sky-600 border-sky-200 dark:bg-sky-500/20 dark:text-sky-400 dark:border-sky-500/30",
  },
} as const;

export type Priority = keyof typeof PRIORITY_THEME;

export function getPriorityTheme(priority: string) {
  return PRIORITY_THEME[priority as Priority] ?? PRIORITY_THEME["Low"];
}

// ─── Role ─────────────────────────────────────────────────────────────
// Dùng trong: MembersPage, KanbanBoardPage sidebar
export const ROLE_THEME = {
  "Manager": {
    label: "Manager",
    text:  "text-amber-500",
    bg:    "bg-amber-500/10",
    badge: "text-amber-500 bg-amber-500/10",
  },
  "Member": {
    label: "Member",
    text:  "text-teal-500",
    bg:    "bg-teal-500/10",
    badge: "text-teal-500 bg-teal-500/10",
  },
  "Viewer": {
    label: "Viewer",
    text:  "text-slate-400",
    bg:    "bg-slate-500/10",
    badge: "text-slate-400 bg-slate-500/10",
  },
} as const;

export function getRoleTheme(role: string) {
  return ROLE_THEME[role as keyof typeof ROLE_THEME] ?? ROLE_THEME["Member"];
}

// ─── Kanban Column dots ───────────────────────────────────────────────
// Màu chấm tròn đầu mỗi cột Kanban
export const COLUMN_DOT_COLORS = [
  "bg-slate-400",    // Todo
  "bg-blue-500",     // In Progress
  "bg-amber-500",    // Pending
  "bg-emerald-500",  // Completed
];

// ─── Task Card ────────────────────────────────────────────────────────
// Màu ring highlight khi card ở trạng thái đặc biệt
export const CARD_RING = {
  "Pending":   "ring-1 ring-amber-400/60",
  "Completed": "ring-1 ring-emerald-400/50 opacity-80",
  "default":   "",
} as const;

export function getCardRing(status: string) {
  return CARD_RING[status as keyof typeof CARD_RING] ?? CARD_RING["default"];
}

// ─── Activity Log actions ─────────────────────────────────────────────
// Dùng trong: MembersPage ActivityTab
export const ACTION_THEME: Record<string, { label: string; color: string; icon: string }> = {
  CREATE_TASK:    { label: "Tạo task",         color: "text-blue-500",    icon: "➕" },
  UPDATE_TASK:    { label: "Cập nhật task",    color: "text-violet-500",  icon: "✏️" },
  DELETE_TASK:    { label: "Xóa task",         color: "text-rose-500",    icon: "🗑️" },
  STATUS_CHANGE:  { label: "Đổi trạng thái",  color: "text-slate-500",   icon: "🔄" },
  SUBMIT:         { label: "Nộp minh chứng",  color: "text-amber-500",   icon: "📤" },
  APPROVE:        { label: "Phê duyệt",        color: "text-emerald-500", icon: "✅" },
  REJECT:         { label: "Từ chối",          color: "text-rose-500",    icon: "❌" },
  COMMENT:        { label: "Bình luận",        color: "text-teal-500",    icon: "💬" },
  DELETE_COMMENT: { label: "Xóa bình luận",   color: "text-slate-400",   icon: "🗑️" },
  ATTACH:         { label: "Đính kèm file",   color: "text-blue-400",    icon: "📎" },
  DELETE_ATTACH:  { label: "Xóa file",        color: "text-slate-400",   icon: "🗑️" },
  ADD_MEMBER:     { label: "Thêm thành viên", color: "text-teal-500",    icon: "👤" },
  REMOVE_MEMBER:  { label: "Xóa thành viên",  color: "text-rose-500",    icon: "👤" },
  CHANGE_ROLE:    { label: "Đổi vai trò",     color: "text-amber-500",   icon: "🔑" },
};