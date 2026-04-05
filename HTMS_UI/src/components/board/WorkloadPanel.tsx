import { motion, AnimatePresence } from "framer-motion";
import { Brain, Zap,
         TrendingUp, Minus, TrendingDown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoardData } from "@/api/boardApi";
import { rankMembers, type MemberWorkload } from "@/lib/workloadBalancer";

const LEVEL_CFG = {
  light:      { label: "Nhẹ",        icon: TrendingDown,  color: "text-teal-500",  bg: "bg-teal-500/10",  bar: "bg-teal-500"  },
  normal:     { label: "Bình thường", icon: Minus,         color: "text-blue-500",  bg: "bg-blue-500/10",  bar: "bg-blue-500"  },
  heavy:      { label: "Bận nhiều",   icon: TrendingUp,    color: "text-amber-500", bg: "bg-amber-500/10", bar: "bg-amber-500" },
  overloaded: { label: "Quá tải",     icon: AlertTriangle, color: "text-rose-500",  bg: "bg-rose-500/10",  bar: "bg-rose-500"  },
};

const MAX_SCORE = 25;

interface Props {
  board:          BoardData;
  selectedUserId: string;
  onSelectUser:   (userId: string) => void;
}

export default function WorkloadPanel({ board, selectedUserId, onSelectUser }: Props) {
  const ranked = rankMembers(board);
  if (ranked.length === 0) return null;

  const best = ranked[0];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden">

      <div className="mt-2 rounded-xl border border-slate-200 dark:border-white/[0.07]
                      bg-slate-50 dark:bg-white/[0.02] overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2
                        border-b border-slate-200 dark:border-white/[0.06]
                        bg-white dark:bg-white/[0.03]">
          <div className="w-5 h-5 rounded-md bg-teal-500/10 flex items-center justify-center flex-shrink-0">
            <Brain className="w-3 h-3 text-teal-500" />
          </div>
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 tracking-wide">
            WORKLOAD BALANCER
          </span>
          {best.level === "light" && (
            <span className="ml-auto text-[10px] font-semibold text-teal-600 dark:text-teal-400
                             bg-teal-50 dark:bg-teal-500/10 px-2 py-0.5 rounded-full">
              Gợi ý: {best.member.fullName.split(" ").pop()}
            </span>
          )}
        </div>

        {/* Member list */}
        <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
          {ranked.map((mw, i) => {
            const cfg       = LEVEL_CFG[mw.level];
            const Icon      = cfg.icon;
            const isSelected = mw.member.userId === selectedUserId;
            const barWidth  = Math.min((mw.score / MAX_SCORE) * 100, 100);

            return (
              <motion.button
                key={mw.member.userId}
                onClick={() => onSelectUser(isSelected ? "" : mw.member.userId)}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-150",
                  isSelected
                    ? "bg-teal-50 dark:bg-teal-500/10"
                    : "hover:bg-slate-100/70 dark:hover:bg-white/[0.04]"
                )}>

                {/* Rank */}
                <span className={cn(
                  "text-[10px] font-bold w-4 flex-shrink-0 text-center",
                  i === 0 ? "text-teal-500" : "text-slate-400"
                )}>
                  {i === 0 ? "★" : i + 1}
                </span>

                {/* Avatar */}
                {mw.member.avatarUrl
                  ? <img src={mw.member.avatarUrl} alt={mw.member.fullName}
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                  : <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-400 to-teal-600
                                    flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                      {mw.member.fullName[0]?.toUpperCase()}
                    </div>
                }

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      "text-xs font-semibold truncate",
                      isSelected
                        ? "text-teal-600 dark:text-teal-400"
                        : "text-slate-700 dark:text-slate-200"
                    )}>
                      {mw.member.fullName}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <Icon className={cn("w-3 h-3", cfg.color)} />
                      <span className={cn("text-[10px] font-bold", cfg.color)}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden mb-1">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.5, delay: i * 0.05 }}
                      className={cn("h-full rounded-full", cfg.bar)}
                    />
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-2">
                    {mw.overdue > 0 && (
                      <span className="text-[9px] font-bold text-rose-500">
                        {mw.overdue} trễ hạn
                      </span>
                    )}
                    <span className="text-[9px] text-slate-400">
                      {mw.inProgress} đang làm
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {mw.todo} todo
                    </span>
                    <span className="text-[9px] text-slate-400 ml-auto font-mono">
                      {mw.score}đ
                    </span>
                  </div>
                </div>

                {/* Selected check */}
                {isSelected && (
                  <div className="w-4 h-4 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[8px] font-bold">✓</span>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Lý do gợi ý cho người đang được chọn */}
        <AnimatePresence>
          {selectedUserId && (() => {
            const mw = ranked.find(m => m.member.userId === selectedUserId);
            if (!mw) return null;
            return (
              <motion.div key="suggestion"
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="px-3 py-2 border-t border-slate-100 dark:border-white/[0.05]
                           bg-white dark:bg-white/[0.02]">
                <div className="flex items-start gap-1.5">
                  <Zap className="w-3 h-3 text-teal-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {mw.suggestion}
                  </p>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}