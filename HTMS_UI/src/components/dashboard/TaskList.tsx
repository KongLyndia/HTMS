import { motion } from "framer-motion";
import { useAssignedTasks } from "@/hooks/useDashboard";

const CARD = "rounded-2xl border border-slate-200 dark:border-teal-900/40 bg-white dark:bg-slate-800/60 shadow-sm hover:shadow-md transition-all duration-300 h-full";

// Map TaskStatus BE → màu hiển thị
const statusStyle: Record<string, string> = {
  "Todo":        "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400",
  "In Progress": "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "Pending":     "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "Rejected":    "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400",
  "Completed":   "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

const priorityDot: Record<string, string> = {
  "Urgent": "bg-red-500",
  "High":   "bg-orange-500",
  "Medium": "bg-amber-400",
  "Low":    "bg-slate-400",
};

function formatDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2,"0")}/${(d.getMonth()+1).toString().padStart(2,"0")}`;
}

export default function TaskList() {
  const { data: tasks, isLoading } = useAssignedTasks();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.45 }}
      className={`${CARD} p-5 flex flex-col`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Task được giao</h3>
        <span className="text-xs text-slate-400">{tasks?.length ?? 0} task</span>
      </div>

      <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />
        ))}

        {!isLoading && tasks?.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-6">Không có task nào </p>
        )}

        {!isLoading && tasks?.map((task, i) => (
          <motion.div
            key={task.taskId}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.05 }}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:#f0fdfadark:hover:bg-white/[0.04] transition-colors duration-150 cursor-pointer"
          >
            {/* Priority dot */}
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[task.priority ?? "Low"] ?? "bg-slate-400"}`} />

            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{task.title}</p>
              <p className="text-[10px] text-slate-400 truncate">{task.projectName}</p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {task.dueDate && (
                <span className="text-[10px] text-slate-400">{formatDate(task.dueDate)}</span>
              )}
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusStyle[task.taskStatus] ?? statusStyle["Todo"]}`}>
                {task.taskStatus}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}