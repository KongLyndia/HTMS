import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useDashboardChart } from "@/hooks/useDashboard";

const CARD = "rounded-2xl border border-slate-200 dark:border-teal-900/40 bg-white dark:bg-slate-800/60 shadow-sm hover:shadow-md transition-all duration-300 h-full";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-slate-600 dark:text-slate-300 mb-1">{label}</p>
      <p className="text-teal-600 dark:text-teal-400">Hoàn thành: <b>{payload[0]?.value}</b></p>
      <p className="text-slate-400">Tổng: <b>{payload[1]?.value}</b></p>
    </div>
  );
}

export default function StatsChart() {
  const { data: chartData, isLoading } = useDashboardChart();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.45 }}
      className={`${CARD} p-5`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">Tiến độ 7 ngày</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Tasks hoàn thành / tổng</p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-40 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={chartData ?? []} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#0d9488" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#0d9488" stopOpacity={0}    />
              </linearGradient>
              <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#94a3b8" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-white/5" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="completed" stroke="#0d9488" strokeWidth={2} fill="url(#gradCompleted)" dot={{ r: 3, fill: "#0d9488" }} />
            <Area type="monotone" dataKey="total"     stroke="#94a3b8" strokeWidth={1.5} fill="url(#gradTotal)"     dot={false} strokeDasharray="4 3" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
}