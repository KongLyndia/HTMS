import { motion } from "framer-motion";
import { useProjectProgress } from "@/hooks/useDashboard";

const CARD = "rounded-2xl border border-slate-200 dark:border-teal-900/40 bg-white dark:bg-slate-800/60 shadow-sm hover:shadow-md transition-all duration-300 h-full";

const COLORS = ["#0d9488", "#2dd4bf", "#34d399", "#818cf8", "#fb923c"];

export default function ProjectProgress() {
  const { data: projects, isLoading } = useProjectProgress();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.45 }}
      className={`${CARD} p-5 flex flex-col`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Tiến độ dự án</h3>
        <span className="text-xs text-slate-400">{projects?.length ?? 0} dự án</span>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-32 rounded bg-slate-100 dark:bg-white/5 animate-pulse" />
            <div className="h-2 rounded-full bg-slate-100 dark:bg-white/5 animate-pulse" />
          </div>
        ))}

        {!isLoading && projects?.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">Chưa tham gia dự án nào</p>
        )}

        {!isLoading && projects?.map((proj, i) => (
          <div key={proj.projectId}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate max-w-[140px]">
                {proj.projectName}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] text-slate-400">{proj.doneTasks}/{proj.totalTasks}</span>
                <span className="text-[10px] font-semibold" style={{ color: COLORS[i % COLORS.length] }}>
                  {proj.percentage}%
                </span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: COLORS[i % COLORS.length] }}
                initial={{ width: 0 }}
                animate={{ width: `${proj.percentage}%` }}
                transition={{ duration: 0.7, delay: 0.5 + i * 0.1, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}