import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle, ArrowRight, Calendar, CheckCircle2, CheckSquare,
  ChevronDown, ClipboardList, ExternalLink, Filter,
  Folders, ListTodo, Plus, SortAsc, User2, X,
} from "lucide-react";
import { useMyTasks } from "../../hooks/useMyTasks";
import type { AggregatedTask } from "../../api/myTasksApi";

// ── Constants ────────────────────────────────────────────────────────────────
const PRIORITY_ORDER: Record<string, number> = {
  Urgent: 0, High: 1, Medium: 2, Low: 3,
};

// Badge classes: light mode + dark mode
const PRIORITY_COLOR: Record<string, string> = {
  Urgent: "bg-red-100 text-red-600 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30",
  High:   "bg-orange-100 text-orange-600 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30",
  Medium: "bg-yellow-100 text-yellow-600 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30",
  Low:    "bg-sky-100 text-sky-600 border-sky-200 dark:bg-sky-500/20 dark:text-sky-400 dark:border-sky-500/30",
};

const STATUS_COLOR: Record<string, string> = {
  "Todo":        "bg-slate-100 text-slate-500 dark:bg-slate-500/20 dark:text-slate-300",
  "In Progress": "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
  "Pending":     "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
  "Rejected":    "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400",
};

const STATUS_LABEL: Record<string, string> = {
  "Todo":        "Chưa bắt đầu",
  "In Progress": "Đang thực hiện",
  "Pending":     "Chờ duyệt",
  "Rejected":    "Bị từ chối",
};

type FilterType = "all" | "personal" | "project" | "done";
type SortType   = "dueDate" | "priority";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}
function isOverdue(iso?: string) {
  return !!iso && new Date(iso) < new Date();
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-xl bg-slate-100 dark:bg-slate-800/60
                    border border-slate-200 dark:border-slate-700/40
                    p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 mt-0.5 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/5" />
          <div className="h-3 bg-slate-200/70 dark:bg-slate-700/60 rounded w-2/5" />
          <div className="flex gap-2 mt-1">
            <div className="h-5 w-16 bg-slate-200/70 dark:bg-slate-700/60 rounded-full" />
            <div className="h-5 w-20 bg-slate-200/70 dark:bg-slate-700/60 rounded-full" />
          </div>
        </div>
        <div className="h-5 w-5 bg-slate-200/70 dark:bg-slate-700/60 rounded" />
      </div>
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold uppercase
                      tracking-wide px-2 py-0.5 rounded-full border ${className}`}>
      {label}
    </span>
  );
}

// ── DueDate label ─────────────────────────────────────────────────────────────
function DueDateLabel({ dueDate }: { dueDate?: string }) {
  if (!dueDate) return null;
  const overdue = isOverdue(dueDate);
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium
                      ${overdue
                        ? "text-red-500 dark:text-red-400"
                        : "text-slate-400 dark:text-slate-400"}`}>
      {overdue
        ? <AlertCircle size={12} className="flex-shrink-0" />
        : <Calendar    size={12} className="flex-shrink-0" />
      }
      {formatDate(dueDate)}
      {overdue && <span className="text-[10px] font-bold">(Quá hạn)</span>}
    </span>
  );
}

// ── Quick Add Form ────────────────────────────────────────────────────────────
interface QuickAddFormProps {
  onSubmit:  (data: { title: string; description?: string; dueDate?: string }) => void;
  isLoading: boolean;
  onCancel:  () => void;
}

function QuickAddForm({ onSubmit, isLoading, onCancel }: QuickAddFormProps) {
  const [title, setTitle]       = useState("");
  const [desc, setDesc]         = useState("");
  const [dueDate, setDueDate]   = useState("");
  const [showMore, setShowMore] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title:       title.trim(),
      description: desc.trim() || undefined,
      dueDate:     dueDate || undefined,
    });
    setTitle(""); setDesc(""); setDueDate(""); setShowMore(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl bg-white dark:bg-slate-800/90
                 border border-violet-300 dark:border-violet-500/40
                 shadow-lg shadow-violet-100 dark:shadow-violet-900/10 overflow-hidden"
    >
      <div className="h-[3px] w-full bg-violet-500" />

      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
        className="p-4 space-y-3"
      >
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tên công việc..."
          maxLength={255}
          className="w-full bg-transparent text-sm font-semibold
                     text-slate-800 dark:text-slate-100
                     placeholder-slate-400 dark:placeholder-slate-500
                     border-none outline-none"
        />

        <AnimatePresence>
          {showMore && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2.5 overflow-hidden"
            >
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Mô tả (tuỳ chọn)..."
                rows={2}
                className="w-full rounded-lg px-3 py-2 text-xs resize-none
                           bg-slate-50 dark:bg-slate-900/50
                           border border-slate-200 dark:border-slate-700/60
                           text-slate-700 dark:text-slate-300
                           placeholder-slate-400 dark:placeholder-slate-600
                           focus:outline-none focus:border-violet-400 dark:focus:border-violet-500/50
                           transition-colors"
              />
              <div className="flex items-center gap-2">
                <Calendar size={13} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="flex-1 rounded-lg px-3 py-1.5 text-xs
                             bg-slate-50 dark:bg-slate-900/50
                             border border-slate-200 dark:border-slate-700/60
                             text-slate-700 dark:text-slate-300
                             focus:outline-none focus:border-violet-400 dark:focus:border-violet-500/50
                             transition-colors dark:[color-scheme:dark]"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between pt-0.5">
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="text-xs text-slate-400 hover:text-slate-600
                       dark:text-slate-500 dark:hover:text-slate-300
                       transition-colors flex items-center gap-1"
          >
            <ChevronDown
              size={13}
              className={`transition-transform duration-200 ${showMore ? "rotate-180" : ""}`}
            />
            {showMore ? "Thu gọn" : "Thêm chi tiết"}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs px-2 py-1 rounded-lg transition-colors
                         text-slate-400 hover:text-slate-600 hover:bg-slate-100
                         dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700/50"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isLoading}
              className="text-xs font-bold px-3 py-1.5 rounded-lg
                         bg-violet-600 hover:bg-violet-500 disabled:opacity-40
                         disabled:cursor-not-allowed text-white transition-colors
                         flex items-center gap-1.5"
            >
              {isLoading
                ? <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : <Plus size={12} />
              }
              Thêm
            </button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}

// ── Task Card ─────────────────────────────────────────────────────────────────
interface TaskCardProps {
  task:         AggregatedTask;
  onComplete:   (id: string) => void;
  onOpenDrawer: (task: AggregatedTask) => void;
}

function TaskCard({ task, onComplete, onOpenDrawer }: TaskCardProps) {
  const isPersonal = task.type === "personal";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{
        opacity: 0,
        x: isPersonal ? -60 : 0,
        scale: isPersonal ? 0.9 : 1,
        transition: { duration: 0.28 },
      }}
      className="group relative rounded-xl overflow-hidden transition-all duration-200
                 bg-white dark:bg-slate-800/70
                 border border-slate-200 dark:border-slate-700/50
                 shadow-sm hover:shadow-md
                 hover:border-teal-300 dark:hover:border-teal-600/40
                 hover:bg-slate-50 dark:hover:bg-slate-800/90"
    >
      {/* Left accent */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${
        isPersonal ? "bg-violet-500" : "bg-teal-500"
      }`} />

      <div className="flex items-start gap-3 p-4 pl-5">
        {/* Checkbox / icon */}
        {isPersonal ? (
          <button
            onClick={() => onComplete(task.id)}
            title="Đánh dấu hoàn thành"
            className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all duration-150
                       flex items-center justify-center group/cb
                       border-violet-300 hover:border-violet-500 hover:bg-violet-100
                       dark:border-violet-400/50 dark:hover:border-violet-400 dark:hover:bg-violet-400/15"
          >
            <CheckCircle2
              size={13}
              className="text-violet-500 dark:text-violet-400
                         opacity-0 group-hover/cb:opacity-100 transition-opacity"
            />
          </button>
        ) : (
          <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full
                          bg-teal-100 dark:bg-teal-600/20
                          flex items-center justify-center">
            <Folders size={11} className="text-teal-600 dark:text-teal-400" />
          </div>
        )}

        {/* Content */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onOpenDrawer(task)}
        >
          <p className="text-sm font-semibold truncate leading-snug transition-colors
                        text-slate-700 dark:text-slate-100
                        group-hover:text-slate-900 dark:group-hover:text-white">
            {task.title}
          </p>

          {task.description && (
            <p className="text-xs mt-0.5 line-clamp-1
                          text-slate-400 dark:text-slate-400">
              {task.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-2">
            {isPersonal ? (
              <Badge label="Cá nhân"
                className="bg-violet-100 text-violet-600 border-violet-200
                           dark:bg-violet-500/15 dark:text-violet-400 dark:border-violet-500/25" />
            ) : (
              <Badge
                label={task.projectName ?? "Dự án"}
                className="bg-teal-100 text-teal-700 border-teal-200
                           dark:bg-teal-600/15 dark:text-teal-400 dark:border-teal-600/25"
              />
            )}

            {task.priority && (
              <Badge
                label={task.priority}
                className={PRIORITY_COLOR[task.priority] ?? ""}
              />
            )}

            {task.taskStatus && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
                               ${STATUS_COLOR[task.taskStatus] ?? ""}`}>
                {STATUS_LABEL[task.taskStatus] ?? task.taskStatus}
              </span>
            )}

            <DueDateLabel dueDate={task.dueDate} />
          </div>
        </div>

        {/* Arrow (project) */}
        {!isPersonal && (
          <ArrowRight
            size={15}
            className="flex-shrink-0 mt-1 transition-all duration-150
                       text-slate-300 dark:text-slate-600
                       group-hover:text-teal-500 dark:group-hover:text-teal-400
                       group-hover:translate-x-0.5"
          />
        )}
      </div>
    </motion.div>
  );
}

// ── Task Detail Drawer ────────────────────────────────────────────────────────
function TaskDetailDrawer({ task, onClose }: { task: AggregatedTask; onClose: () => void }) {
  const navigate = useNavigate();
  const overdue  = isOverdue(task.dueDate);

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/40 dark:bg-black/50 backdrop-blur-[2px]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col overflow-hidden
                   bg-white dark:bg-[#1e293b]
                   border-l border-slate-200 dark:border-slate-700/60
                   shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 flex-shrink-0
                        border-b border-slate-100 dark:border-slate-700/50">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[10px] font-bold uppercase tracking-widest
                               px-2 py-0.5 rounded-full border ${
                task.type === "personal"
                  ? "bg-violet-100 text-violet-600 border-violet-200 dark:bg-violet-500/15 dark:text-violet-400 dark:border-violet-500/25"
                  : "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-600/15 dark:text-teal-400 dark:border-teal-600/25"
              }`}>
                {task.type === "personal" ? "Cá nhân" : "Dự án"}
              </span>

              {task.taskStatus && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
                                 ${STATUS_COLOR[task.taskStatus] ?? ""}`}>
                  {STATUS_LABEL[task.taskStatus] ?? task.taskStatus}
                </span>
              )}
            </div>
            <h2 className="text-base font-bold leading-snug
                           text-slate-800 dark:text-slate-100">
              {task.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded-lg transition-colors
                       hover:bg-slate-100 dark:hover:bg-slate-700/60"
          >
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {task.description && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-1.5
                            text-slate-400 dark:text-slate-500">Mô tả</p>
              <p className="text-sm leading-relaxed
                            text-slate-600 dark:text-slate-300">{task.description}</p>
            </div>
          )}

          <div className="space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-widest
                          text-slate-400 dark:text-slate-500">Thông tin</p>

            <div className="rounded-xl divide-y overflow-hidden
                            bg-slate-50 dark:bg-slate-900/40
                            divide-slate-100 dark:divide-slate-700/40">

              {task.type === "project" && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <Folders size={14} className="text-teal-500 dark:text-teal-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide
                                  text-slate-400 dark:text-slate-500">Dự án · Cột</p>
                    <p className="text-sm font-medium truncate
                                  text-slate-700 dark:text-slate-200">
                      {task.projectName}
                      {task.columnName && (
                        <span className="font-normal text-slate-400"> · {task.columnName}</span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {task.priority && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-sm leading-none">⚡</span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide
                                  text-slate-400 dark:text-slate-500">Độ ưu tiên</p>
                    <span className={`inline-block text-xs font-bold px-2 py-0.5
                                     rounded-full border mt-0.5
                                     ${PRIORITY_COLOR[task.priority] ?? ""}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              )}

              {task.dueDate && (
                <div className="flex items-center gap-3 px-4 py-3">
                  {overdue
                    ? <AlertCircle size={14} className="text-red-500 dark:text-red-400 flex-shrink-0" />
                    : <Calendar    size={14} className="text-slate-400 flex-shrink-0" />
                  }
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide
                                  text-slate-400 dark:text-slate-500">Hạn chót</p>
                    <p className={`text-sm font-semibold
                                  ${overdue
                                    ? "text-red-500 dark:text-red-400"
                                    : "text-slate-700 dark:text-slate-200"}`}>
                      {formatDate(task.dueDate)}
                      {overdue && <span className="ml-1.5 text-[11px] font-bold">(Quá hạn)</span>}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rejected */}
          {task.taskStatus === "Rejected" && (
            <div className="flex items-start gap-2.5 rounded-xl px-4 py-3
                            bg-red-50 border border-red-200
                            dark:bg-red-500/10 dark:border-red-500/25">
              <AlertCircle size={15} className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-red-600 dark:text-red-400">Task bị từ chối</p>
                <p className="text-xs mt-0.5 text-slate-500 dark:text-slate-400">
                  Vào Board để xem lý do và nộp lại minh chứng.
                </p>
              </div>
            </div>
          )}

          {/* Pending */}
          {task.taskStatus === "Pending" && (
            <div className="flex items-start gap-2.5 rounded-xl px-4 py-3
                            bg-amber-50 border border-amber-200
                            dark:bg-amber-500/10 dark:border-amber-500/25">
              <span className="text-amber-500 dark:text-amber-400 text-sm mt-0.5">⏳</span>
              <div>
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400">Đang chờ duyệt</p>
                <p className="text-xs mt-0.5 text-slate-500 dark:text-slate-400">
                  Minh chứng đã được gửi. Vui lòng chờ Manager xem xét.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {task.type === "project" && (
          <div className="flex-shrink-0 px-5 pb-5 pt-3
                          border-t border-slate-100 dark:border-slate-700/50">
            <button
              onClick={() => navigate(`/projects/${task.projectId}/board?taskId=${task.id}`)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                         bg-teal-600 hover:bg-teal-500 active:bg-teal-700
                         text-sm font-bold text-white transition-colors"
            >
              <ExternalLink size={15} />
              Mở trên Kanban Board
            </button>
            <p className="text-center text-[11px] mt-2
                          text-slate-400 dark:text-slate-500">
              Nộp minh chứng và xử lý task tại Board
            </p>
          </div>
        )}
      </motion.div>
    </>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -14, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      className="flex items-center gap-3 shadow-2xl rounded-xl px-4 py-3 max-w-sm
                 bg-white border border-slate-200
                 dark:bg-slate-800 dark:border-slate-700/60"
    >
      <span className="text-base">📋</span>
      <p className="text-sm flex-1 text-slate-700 dark:text-slate-200">{message}</p>
      <button onClick={onDismiss}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        <X size={14} />
      </button>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MyTasksPage() {
  const { tasks, isLoading, completePersonal, createPersonal, isCreating } = useMyTasks();

  const [filter, setFilter]             = useState<FilterType>("all");
  const [sort, setSort]                 = useState<SortType>("dueDate");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showForm, setShowForm]         = useState(false);
  const [drawerTask, setDrawerTask]     = useState<AggregatedTask | null>(null);
  const [toasts, setToasts]             = useState<{ id: number; message: string }[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent<{ message: string }>).detail.message;
      setToasts((prev) => [...prev, { id: Date.now(), message: msg }]);
    };
    window.addEventListener("ht:toast", handler);
    return () => window.removeEventListener("ht:toast", handler);
  }, []);

  const dismissToast = useCallback(
    (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), []
  );

  const filtered = tasks.filter((t) => {
    if (filter === "done")     return t.isCompleted === true;
    if (filter === "personal") return t.type === "personal" && !t.isCompleted;
    if (filter === "project")  return t.type === "project"  && !t.isCompleted;
    return !t.isCompleted; // "all" chỉ hiện chưa hoàn thành
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "dueDate") {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    const pa = a.priority ? (PRIORITY_ORDER[a.priority] ?? 99) : 99;
    const pb = b.priority ? (PRIORITY_ORDER[b.priority] ?? 99) : 99;
    return pa - pb;
  });

  const counts = {
    all:      tasks.filter(t => !t.isCompleted).length,
    personal: tasks.filter(t => t.type === "personal" && !t.isCompleted).length,
    project:  tasks.filter(t => t.type === "project"  && !t.isCompleted).length,
    done:     tasks.filter(t => t.isCompleted).length,
  };
  const overdueCount = tasks.filter((t) => isOverdue(t.dueDate)).length;

  const tabs: { key: FilterType; label: string; icon: React.ReactNode }[] = [
    { key: "all",      label: "Tất cả",        icon: <ListTodo    size={13} /> },
    { key: "personal", label: "Cá nhân",        icon: <User2       size={13} /> },
    { key: "project",  label: "Dự án",          icon: <Folders     size={13} /> },
    { key: "done",     label: "Đã hoàn thành",  icon: <CheckSquare size={13} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d1525]
                    text-slate-800 dark:text-slate-100 transition-colors duration-200">

      {/* Toast */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <Toast message={t.message} onDismiss={() => dismissToast(t.id)} />
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {drawerTask && (
          <TaskDetailDrawer task={drawerTask} onClose={() => setDrawerTask(null)} />
        )}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto px-4 pt-8 pb-16">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <ClipboardList size={20} className="text-teal-600 dark:text-teal-400" />
              <h1 className="text-xl font-bold">My Tasks</h1>
            </div>
            <button
              onClick={() => { setShowForm(true); setFilter("all"); }}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl
                         transition-all duration-150
                         bg-violet-100 hover:bg-violet-200 border border-violet-200 text-violet-600
                         dark:bg-violet-600/20 dark:hover:bg-violet-600/35 dark:border-violet-500/30 dark:text-violet-400"
            >
              <Plus size={14} />
              Việc mới
            </button>
          </div>
          <p className="text-sm text-slate-400 dark:text-slate-400">
            {counts.all} công việc đang chờ
            {overdueCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 font-semibold
                               text-red-500 dark:text-red-400">
                <AlertCircle size={12} />
                {overdueCount} quá hạn
              </span>
            )}
          </p>
        </motion.div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 mb-5">
          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-xl p-1
                          bg-slate-200/70 dark:bg-slate-800/70
                          border border-slate-200 dark:border-slate-700/50">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                            text-xs font-semibold transition-all duration-200 ${
                  filter === tab.key
                    ? "text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {filter === tab.key && (
                  <motion.div
                    layoutId="active-tab"
                    className="absolute inset-0 bg-teal-600 rounded-lg"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {tab.icon}
                  {tab.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    filter === tab.key
                      ? "bg-white/20"
                      : "bg-slate-300/80 dark:bg-slate-700"
                  }`}>
                    {counts[tab.key]}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl
                         transition-colors
                         bg-white dark:bg-slate-800/70
                         border border-slate-200 dark:border-slate-700/50
                         text-slate-500 hover:text-slate-700
                         dark:text-slate-400 dark:hover:text-slate-200"
            >
              <SortAsc size={13} />
              {sort === "dueDate" ? "Hạn chót" : "Ưu tiên"}
              <ChevronDown size={12} />
            </button>
            <AnimatePresence>
              {showSortMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  className="absolute right-0 top-full mt-1 z-20 rounded-xl shadow-xl
                             overflow-hidden min-w-[130px]
                             bg-white dark:bg-slate-800
                             border border-slate-200 dark:border-slate-700/60"
                >
                  {(["dueDate", "priority"] as SortType[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => { setSort(s); setShowSortMenu(false); }}
                      className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold
                                  transition-colors ${
                        sort === s
                          ? "text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-600/10"
                          : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/60"
                      }`}
                    >
                      {s === "dueDate" ? "📅 Hạn chót" : "⚡ Độ ưu tiên"}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Quick Add Form */}
        <AnimatePresence>
          {showForm && (
            <div className="mb-4">
              <QuickAddForm
                isLoading={isCreating}
                onCancel={() => setShowForm(false)}
                onSubmit={(data) => {
                  createPersonal(data, { onSuccess: () => setShowForm(false) });
                }}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Task list */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : sorted.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 gap-3 text-center"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center
                            bg-slate-100 dark:bg-slate-800/60">
              <Filter size={22} className="text-slate-400 dark:text-slate-600" />
            </div>
            <p className="font-semibold text-slate-500 dark:text-slate-400">
              Không có công việc nào
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-600">
              {filter !== "all" ? "Thử chọn tab khác hoặc xem Tất cả" : "Bạn đang rảnh rỗi! 🎉"}
            </p>
          </motion.div>
        ) : (
          <motion.ul
            className="space-y-3"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          >
            <AnimatePresence mode="popLayout">
              {sorted.map((task) => (
                <motion.li
                  key={task.id}
                  layout
                  variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                >
                  <TaskCard
                    task={task}
                    onComplete={filter === "done" ? () => {} : completePersonal}
                    onOpenDrawer={setDrawerTask}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>
    </div>
  );
}