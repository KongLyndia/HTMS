import { useEffect, useRef } from "react";
import { useParams }         from "react-router-dom";
import { motion }            from "framer-motion";
import * as signalR          from "@microsoft/signalr";
import { useQueryClient }    from "@tanstack/react-query";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  BarChart2, Users, CheckCircle2, Clock,
  AlertTriangle, Loader2, TrendingUp, ListTodo,
} from "lucide-react";
import { cn }                from "@/lib/utils";
import { useProjectStats }   from "@/hooks/useMembers";
import { calcWorkloadScore, calcRiskScore } from "@/lib/taskPrioritizer";
import { useProjectStore }    from "@/store/projectStore";
import ExportReportButton    from "@/components/project/ExportReportButton";
import { useAuthStore }      from "@/store/authStore";

// ─── Constants ────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  "Todo":        "#94a3b8",
  "In Progress": "#3b82f6",
  "Pending":     "#f59e0b",
  "Completed":   "#10b981",
};

const PRIORITY_COLORS: Record<string, string> = {
  "Urgent": "#ef4444",
  "High":   "#f97316",
  "Medium": "#eab308",
  "Low":    "#0ea5e9",
};

const HUB_URL = (import.meta.env.VITE_API_URL as string ?? "https://localhost:7004/api")
  .replace("/api", "") + "/hubs/board";

// ─── Helpers ──────────────────────────────────────────────────────────
function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} alt={name}
    className="w-8 h-8 rounded-full object-cover ring-2 ring-white/20 flex-shrink-0" />;
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ring-2 ring-white/20">
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: number | string;
  sub?: string; color: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#131f35] rounded-2xl border border-slate-200 dark:border-white/[0.07] p-5 flex items-center gap-4">
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-800 dark:text-white leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#1a2e48] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 shadow-xl text-xs">
      {label && <p className="font-semibold text-slate-600 dark:text-slate-300 mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function StatsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data, isLoading, isError } = useProjectStats(projectId!);
  const projects    = useProjectStore(s => s.projects);
  const projectName = projects.find(p => p.projectId === projectId)?.projectName ?? "Du_An";
  const qc          = useQueryClient();
  const accessToken = useAuthStore(s => s.accessToken);
  const connRef     = useRef<signalR.HubConnection | null>(null);

  // ── Realtime: lắng nghe TaskCreated/Updated/Deleted + MembersUpdated ─
  useEffect(() => {
    if (!accessToken || !projectId) return;
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, { accessTokenFactory: () => accessToken })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.None)
      .build();
    connRef.current = conn;

    const invalidate = () => qc.invalidateQueries({ queryKey: ["project-stats", projectId] });
    conn.on("TaskCreated",   invalidate);
    conn.on("TaskUpdated",   invalidate);
    conn.on("TaskDeleted",   invalidate);
    conn.on("MembersUpdated", invalidate);

    conn.start()
      .then(() => conn.invoke("JoinProject", projectId))
      .catch(err => console.warn("[StatsHub]", err));

    return () => {
      conn.invoke("LeaveProject", projectId).catch(() => {});
      conn.stop();
    };
  }, [accessToken, projectId, qc]);

  if (isLoading) return (
    <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-[#0b1120]">
      <Loader2 className="w-7 h-7 text-teal-500 animate-spin" />
    </div>
  );
  if (isError || !data) return (
    <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-[#0b1120]">
      <div className="flex flex-col items-center gap-2">
        <AlertTriangle className="w-7 h-7 text-rose-400" />
        <p className="text-sm text-slate-500">Không thể tải dữ liệu thống kê</p>
      </div>
    </div>
  );

  const { summary, byStatus, byPriority, memberStats } = data;
  const pieData    = byStatus.filter(d => d.count > 0);
  const prioData   = byPriority.filter(d => d.count > 0);
  const isManager  = data.myRole === "Manager";

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-[#0b1120] px-6 py-5
                    [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full
                    [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-white/10">

      {/* Header */}
      <div className="flex items-center gap-2.5 mb-6 flex-wrap">
        <BarChart2 className="w-5 h-5 text-teal-500" />
        <h1 className="text-base font-bold text-slate-800 dark:text-white">Thống kê dự án</h1>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-slate-400">Cập nhật</span>
          <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          <ExportReportButton
            projectId={projectId!}
            projectName={projectName}
          />
        </div>
      </div>

      {/* ── Progress tổng thể ── */}
      <div className="bg-white dark:bg-[#131f35] rounded-2xl border border-slate-200 dark:border-white/[0.07] p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Tiến độ dự án</p>
            <p className="text-xs text-slate-400 mt-0.5">{summary.completed}/{summary.total} task hoàn thành</p>
          </div>
          <span className="text-3xl font-bold text-teal-600 dark:text-teal-400">{summary.progress}%</span>
        </div>
        <div className="h-3 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${summary.progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400" />
        </div>
        {summary.overdue > 0 && (
          <p className="text-xs text-rose-500 mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            {summary.overdue} task đang trễ hạn
          </p>
        )}
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard icon={ListTodo}    label="Tổng task"    value={summary.total}       color="bg-slate-500"   />
        <StatCard icon={CheckCircle2} label="Hoàn thành"  value={summary.completed}
          sub={`${summary.progress}%`}                                                color="bg-emerald-500" />
        <StatCard icon={AlertTriangle} label="Trễ hạn"   value={summary.overdue}     color="bg-rose-500"    />
        <StatCard icon={Users}        label="Thành viên"  value={summary.memberCount} color="bg-teal-500"    />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {/* Pie chart — trạng thái */}
        <div className="bg-white dark:bg-[#131f35] rounded-2xl border border-slate-200 dark:border-white/[0.07] p-5">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Tỉ lệ theo trạng thái</p>
          {pieData.length === 0
            ? <p className="text-sm text-slate-400 text-center py-8">Chưa có task</p>
            : <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={180}>
                  <PieChart>
                    <Pie data={pieData} dataKey="count" nameKey="status"
                      cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                      {pieData.map((d, i) => (
                        <Cell key={i} fill={STATUS_COLORS[d.status] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2 flex-1">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: STATUS_COLORS[d.status] ?? "#94a3b8" }} />
                        <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{d.status}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex-shrink-0">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>}
        </div>

        {/* Bar chart — priority */}
        <div className="bg-white dark:bg-[#131f35] rounded-2xl border border-slate-200 dark:border-white/[0.07] p-5">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Phân bố ưu tiên</p>
          {prioData.length === 0
            ? <p className="text-sm text-slate-400 text-center py-8">Chưa có task</p>
            : <ResponsiveContainer width="100%" height={180}>
                <BarChart data={prioData} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                  <XAxis dataKey="priority" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                  <Bar dataKey="count" name="Số task" radius={[6,6,0,0]}>
                    {prioData.map((d, i) => (
                      <Cell key={i} fill={PRIORITY_COLORS[d.priority] ?? "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>}
        </div>
      </div>

      {/* ── Member performance (chỉ Manager) ── */}
      {isManager && memberStats.length > 0 && (
        <div className="bg-white dark:bg-[#131f35] rounded-2xl border border-slate-200 dark:border-white/[0.07] p-5 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-teal-500" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Hiệu suất thành viên</p>
          </div>

          {/* Bar chart hiệu suất */}
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={memberStats.map(m => ({
                name:      (m.fullName || "?").split(" ").pop(),
                "Hoàn thành": m.completed,
                "Đang làm":   m.inProgress,
                "Chờ duyệt":  m.pending,
                "Todo":        m.todo,
              }))}
              barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Hoàn thành" stackId="a" fill="#10b981" radius={[0,0,0,0]} />
              <Bar dataKey="Đang làm"   stackId="a" fill="#3b82f6" />
              <Bar dataKey="Chờ duyệt"  stackId="a" fill="#f59e0b" />
              <Bar dataKey="Todo"        stackId="a" fill="#94a3b8" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* Member list */}
          <div className="mt-4 space-y-2">
            {memberStats.filter(m => m.total > 0).map((m, i) => (
              <div key={m.userId}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05]">
                <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                <Avatar name={m.fullName || "?"} url={m.avatarUrl} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{m.fullName}</span>
                    <span className="text-xs font-bold text-teal-600 dark:text-teal-400 flex-shrink-0 ml-2">{m.completionRate}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${m.completionRate}%` }}
                      transition={{ duration: 0.6, delay: i * 0.05 }}
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400" />
                  </div>
                  <div className="flex gap-3 mt-1 flex-wrap">
                    {[
                      { label: "Tổng", val: m.total,      cls: "text-slate-400" },
                      { label: "Xong", val: m.completed,  cls: "text-emerald-500" },
                      { label: "Đang", val: m.inProgress, cls: "text-blue-500" },
                      { label: "Chờ",  val: m.pending,    cls: "text-amber-500" },
                    ].map(s => (
                      <span key={s.label} className={cn("text-[10px] font-semibold", s.cls)}>
                        {s.label}: {s.val}
                      </span>
                    ))}
                    {/* Workload + Risk inline */}
                    {(() => {
                      const wl = m.total > 0 ? Math.round((m.inProgress / m.total) * 100) : 0;
                      const risk = m.total > 0 ? Math.round(((m.total - m.completed - m.inProgress - m.pending - m.todo) < 0 ? 0 : 0) * 100) : 0;
                      return (
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                          wl >= 80 ? "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
                          : wl >= 50 ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                          : "bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400")}>
                          WL {wl}%
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))}
            {memberStats.filter(m => m.total === 0).length > 0 && (
              <p className="text-xs text-slate-400 text-center pt-1">
                {memberStats.filter(m => m.total === 0).length} thành viên chưa có task nào
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}