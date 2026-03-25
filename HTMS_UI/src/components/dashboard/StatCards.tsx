import { motion } from "framer-motion";
import { CheckCircle2, Clock, TrendingUp, FolderOpen, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardStats } from "@/hooks/useDashboard";

const CARD = [
  "rounded-2xl border border-slate-200 dark:border-teal-900/40",
  "bg-white dark:bg-slate-800/60 shadow-sm hover:shadow-md",
  "transition-all duration-300 h-full",
].join(" ");

export default function StatCards() {
  const { data: stats, isLoading } = useDashboardStats();

  const cards = [
    {
      icon:  CheckCircle2,
      label: "Tasks hôm nay",
      value: stats?.tasksToday ?? 0,
      sub:   "Được giao hôm nay",
      color: "text-teal-500",
      bg:    "bg-teal-50 dark:bg-teal-500/10",
      trend: "up",
    },
    {
      icon:  Clock,
      label: "Đang thực hiện",
      value: stats?.tasksInProgress ?? 0,
      sub:   "Chưa hoàn thành",
      color: "text-amber-500",
      bg:    "bg-amber-50 dark:bg-amber-500/10",
      trend: "warn",
    },
    {
      icon:  TrendingUp,
      label: "Hoàn thành tuần",
      value: stats?.tasksCompletedThisWeek ?? 0,
      sub:   `${stats?.completionRate ?? 0}% đúng hạn`,
      color: "text-emerald-500",
      bg:    "bg-emerald-50 dark:bg-emerald-500/10",
      trend: "up",
    },
    {
      icon:  FolderOpen,
      label: "Dự án tham gia",
      value: stats?.projectCount ?? 0,
      sub:   "Đang hoạt động",
      color: "text-violet-500",
      bg:    "bg-violet-50 dark:bg-violet-500/10",
      trend: "up",
    },
  ];

  return (
    <>
      {cards.map(({ icon: Icon, label, value, sub, color, bg, trend }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.07, duration: 0.4 }}
          className={cn(CARD, "flex flex-col justify-between p-5 min-h-[110px]")}
        >
          <div className="flex items-start justify-between">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", bg)}>
              <Icon className={cn("w-4 h-4", color)} />
            </div>
            <span className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full",
              trend === "up"
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
            )}>
              {trend === "up" ? "↑ Tốt" : "⚠ Chú ý"}
            </span>
          </div>

          <div>
            {isLoading ? (
              <div className="h-7 w-12 rounded bg-slate-200 dark:bg-white/10 animate-pulse mb-1" />
            ) : (
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{value}</p>
            )}
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>
          </div>
        </motion.div>
      ))}
    </>
  );
}