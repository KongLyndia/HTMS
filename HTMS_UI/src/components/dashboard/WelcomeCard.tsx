import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { useAuthStore }      from "@/store/authStore";
import { useDashboardStats } from "@/hooks/useDashboard";

export default function WelcomeCard() {
  const { user }                        = useAuthStore();
  const { data: stats, isLoading }      = useDashboardStats();

  const openTasks = stats?.tasksInProgress ?? 0;
  const todayDate = new Date().toLocaleDateString("vi-VN", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl border border-transparent shadow-sm transition-all duration-300 h-full relative overflow-hidden p-6 flex flex-col justify-between min-h-[150px]"
      style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 50%, #065f46 100%)" }}
    >
      {/* Background decoration */}
      <div className="absolute top-[-30px] right-[-30px] w-36 h-36 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,.3) 0%, transparent 70%)" }}
      />
      <div className="absolute bottom-[-20px] left-[40%] w-24 h-24 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,.4) 0%, transparent 70%)" }}
      />

      <div className="relative z-10">
        <div className="flex items-center gap-1.5 mb-2">
          <Zap className="w-3.5 h-3.5 text-teal-200" />
          <span className="text-xs text-teal-200 font-medium capitalize">{todayDate}</span>
        </div>
        <h2 className="text-xl font-bold text-white leading-snug">
          Xin chào, {user?.fullName?.split(" ").pop() ?? "bạn"}!
        </h2>
        <p className="text-sm text-teal-100 mt-1">
          Bạn có{" "}
          {isLoading ? (
            <span className="inline-block w-5 h-4 rounded bg-white/20 animate-pulse align-middle" />
          ) : (
            <strong>{openTasks} task</strong>
          )}{" "}
          đang thực hiện.
        </p>
      </div>

      <div className="relative z-10 mt-3 pt-3 border-t border-white/15">
        <p className="text-[11px] text-teal-200 opacity-75">HTMS · Sprint 3</p>
      </div>
    </motion.div>
  );
}