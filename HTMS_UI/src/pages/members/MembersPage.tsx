import { useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { RadialBarChart, RadialBar, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  Users, Search, Plus, Crown, Shield, Eye, Loader2,
  X, Trash2, AlertCircle, Calendar, ChevronDown,
  Activity, UserCheck, UserX, TrendingUp, Filter,
  CheckCircle2, Clock, ListTodo, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMembers, useActivity, useAddMember, useUpdateRole, useRemoveMember, useMembersRealtime } from "@/hooks/useMembers";
import { membersApi } from "@/api/membersApi";
import type { ProjectMember, ActivityLog } from "@/api/membersApi";

// ─── Constants ────────────────────────────────────────────────────────
const ROLE_CFG = {
  Manager: { icon: Crown,  cls: "text-amber-500 bg-amber-500/10",  label: "Manager" },
  Member:  { icon: Shield, cls: "text-teal-500 bg-teal-500/10",    label: "Member"  },
  Viewer:  { icon: Eye,    cls: "text-slate-400 bg-slate-500/10",  label: "Viewer"  },
};

const ACTION_LABEL: Record<string, { label: string; color: string; icon: string }> = {
  CREATE_TASK:    { label: "Tạo task",         color: "text-blue-500",    icon: "➕" },
  UPDATE_TASK:    { label: "Cập nhật task",    color: "text-violet-500",  icon: "✏️" },
  DELETE_TASK:    { label: "Xóa task",         color: "text-rose-500",    icon: "🗑️" },
  STATUS_CHANGE:  { label: "Đổi trạng thái",   color: "text-slate-500",   icon: "🔄" },
  SUBMIT:         { label: "Nộp minh chứng",   color: "text-amber-500",   icon: "📤" },
  APPROVE:        { label: "Phê duyệt",         color: "text-emerald-500", icon: "✅" },
  REJECT:         { label: "Từ chối",           color: "text-rose-500",    icon: "❌" },
  COMMENT:        { label: "Bình luận",         color: "text-teal-500",    icon: "💬" },
  DELETE_COMMENT: { label: "Xóa bình luận",    color: "text-slate-400",   icon: "🗑️" },
  ATTACH:         { label: "Đính kèm file",    color: "text-blue-400",    icon: "📎" },
  DELETE_ATTACH:  { label: "Xóa file",         color: "text-slate-400",   icon: "🗑️" },
  ADD_MEMBER:     { label: "Thêm thành viên",  color: "text-teal-500",    icon: "👤" },
  REMOVE_MEMBER:  { label: "Xóa thành viên",   color: "text-rose-500",    icon: "👤" },
  CHANGE_ROLE:    { label: "Đổi vai trò",      color: "text-amber-500",   icon: "🔑" },
};

const ENTITY_FILTER = [
  { value: "", label: "Tất cả" },
  { value: "Task",       label: "Task"        },
  { value: "Comment",    label: "Bình luận"   },
  { value: "Attachment", label: "File"        },
  { value: "Member",     label: "Thành viên"  },
];

// ─── Helpers ─────────────────────────────────────────────────────────
function Avatar({ name, url, size = "md" }: { name: string; url: string | null; size?: "sm"|"md"|"lg"|"xl" }) {
  const sz = { sm:"w-7 h-7 text-xs", md:"w-10 h-10 text-sm", lg:"w-14 h-14 text-lg", xl:"w-20 h-20 text-2xl" }[size];
  if (url) return <img src={url} alt={name} className={cn(sz, "rounded-full object-cover flex-shrink-0 ring-2 ring-white/20")} />;
  return (
    <div className={cn(sz, "rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white bg-gradient-to-br from-teal-400 to-teal-600 ring-2 ring-white/20")}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CFG[role as keyof typeof ROLE_CFG] ?? ROLE_CFG.Member;
  return (
    <span className={cn("flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full", cfg.cls)}>
      <cfg.icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────
type ToastItem = { id: number; msg: string; type: "success"|"error" };
let _setToasts: React.Dispatch<React.SetStateAction<ToastItem[]>> | null = null;
let _tid = 0;
const toast = {
  show(msg: string, type: ToastItem["type"] = "error") {
    _setToasts?.(prev => {
      const id = ++_tid;
      setTimeout(() => _setToasts?.(p => p.filter(t => t.id !== id)), 3000);
      return [...prev.slice(-3), { id, msg, type }];
    });
  },
  success: (msg: string) => toast.show(msg, "success"),
  error:   (msg: string) => toast.show(msg, "error"),
};

function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useState(() => { _setToasts = setToasts; });
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.16 }}
            className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-2xl border",
              t.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800")}>
            {t.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Member Card ─────────────────────────────────────────────────────
function MemberCard({ member, isManager, isOwner: projectOwner, onSelect, onRemove, onRoleChange }: {
  member: ProjectMember;
  isManager: boolean;
  isOwner: boolean;
  onSelect: (m: ProjectMember) => void;
  onRemove: (m: ProjectMember) => void;
  onRoleChange: (m: ProjectMember, role: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { taskStats } = member;
  const canManage = isManager && !member.isOwner;

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="relative bg-white dark:bg-[#131f35] rounded-2xl border border-slate-200 dark:border-teal-900/40 shadow-sm hover:shadow-md transition-all group cursor-pointer"
      onClick={() => onSelect(member)}>

      {/* Top */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <Avatar name={member.fullName} url={member.avatarUrl} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{member.fullName}</p>
              {member.isOwner && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500">Owner</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate">{member.email}</p>
            <div className="mt-1"><RoleBadge role={member.role} /></div>
          </div>

          {/* Menu */}
          {canManage && (
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setMenuOpen(v => !v)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <motion.div initial={{ opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.1 }}
                      className="absolute right-0 top-7 z-50 w-40 rounded-xl bg-white dark:bg-[#1a2540] border border-slate-200 dark:border-white/[0.08] shadow-xl overflow-hidden">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-3 pt-2 pb-1">Đổi role</p>
                      {["Manager", "Member", "Viewer"].map(r => (
                        <button key={r} onClick={() => { onRoleChange(member, r); setMenuOpen(false); }}
                          className={cn("w-full text-left px-3 py-2 text-xs transition-colors hover:#f0fdfadark:hover:bg-white/5",
                            member.role === r ? "font-bold text-teal-600 dark:text-teal-400" : "text-slate-600 dark:text-slate-300")}>
                          {r}
                        </button>
                      ))}
                      <div className="border-t border-slate-100 dark:border-white/[0.06] mt-1" />
                      <button onClick={() => { onRemove(member); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" /> Xóa khỏi dự án
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Task stats bar */}
      {isManager && taskStats.total > 0 && (
        <div className="px-4 pb-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Hoàn thành</span>
            <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">{taskStats.completionRate}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${taskStats.completionRate}%` }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "Tổng", val: taskStats.total,      color: "text-slate-500" },
              { label: "Xong", val: taskStats.completed,  color: "text-emerald-500" },
              { label: "Đang", val: taskStats.inProgress, color: "text-blue-500" },
              { label: "Chờ",  val: taskStats.pending,    color: "text-amber-500" },
            ].map(s => (
              <span key={s.label} className={cn("text-[10px] font-semibold", s.color)}>
                {s.label}: {s.val}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Joined date */}
      <div className="px-4 pb-3 flex items-center gap-1 text-[10px] text-slate-400 border-t border-slate-50 dark:border-white/[0.04] pt-2">
        <Calendar className="w-3 h-3" />
        Tham gia {new Date(member.joinedAt).toLocaleDateString("vi-VN")}
      </div>
    </motion.div>
  );
}

// ─── Member Detail Modal ──────────────────────────────────────────────
function MemberDetailModal({ member, isManager, onClose }: {
  member: ProjectMember;
  isManager: boolean;
  onClose: () => void;
}) {
  const { taskStats } = member;
  const chartData = [
    { name: "Hoàn thành", value: taskStats.completed,  fill: "#10b981" },
    { name: "Đang làm",   value: taskStats.inProgress, fill: "#3b82f6" },
    { name: "Chờ duyệt",  value: taskStats.pending,    fill: "#f59e0b" },
    { name: "Todo",        value: taskStats.todo,       fill: "#94a3b8" },
  ].filter(d => d.value > 0);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
        className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-[#131f35] border border-slate-200 dark:border-white/[0.08] shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="relative h-24 bg-gradient-to-br from-teal-500 to-teal-700">
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5">
          {/* Avatar overlap */}
          <div className="flex items-end gap-4 -mt-8 mb-4">
            <div className="ring-4 ring-white dark:ring-[#131f35] rounded-full">
              <Avatar name={member.fullName} url={member.avatarUrl} size="xl" />
            </div>
            <div className="pb-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">{member.fullName}</h3>
                {member.isOwner && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500">Owner</span>}
              </div>
              <p className="text-xs text-slate-400">{member.email}</p>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-xl #f0fdfadark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Vai trò</p>
              <RoleBadge role={member.role} />
            </div>
            <div className="p-3 rounded-xl #f0fdfadark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Tham gia</p>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {new Date(member.joinedAt).toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric" })}
              </p>
            </div>
          </div>

          {/* Task stats — chỉ Manager xem */}
          {isManager && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Hiệu suất công việc</p>

              {taskStats.total === 0 ? (
                <p className="text-xs text-slate-400 italic">Chưa có task nào được giao</p>
              ) : (
                <>
                  {/* Completion rate */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800">
                    <TrendingUp className="w-5 h-5 text-teal-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-[10px] text-teal-600 dark:text-teal-400">Tỉ lệ hoàn thành</p>
                      <p className="text-xl font-bold text-teal-700 dark:text-teal-300">{taskStats.completionRate}%</p>
                    </div>
                  </div>

                  {/* Stat boxes */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { icon: ListTodo,     label: "Tổng",   val: taskStats.total,      cls: "text-slate-600 dark:text-slate-300"  },
                      { icon: CheckCircle2, label: "Xong",   val: taskStats.completed,  cls: "text-emerald-600 dark:text-emerald-400" },
                      { icon: RotateCcw,    label: "Đang",   val: taskStats.inProgress, cls: "text-blue-600 dark:text-blue-400"    },
                      { icon: Clock,        label: "Chờ",    val: taskStats.pending,    cls: "text-amber-600 dark:text-amber-400"  },
                    ].map(s => (
                      <div key={s.label} className="p-2 rounded-xl #f0fdfadark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] text-center">
                        <s.icon className={cn("w-4 h-4 mx-auto mb-1", s.cls)} />
                        <p className={cn("text-base font-bold", s.cls)}>{s.val}</p>
                        <p className="text-[9px] text-slate-400">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Bar chart */}
                  {chartData.length > 0 && (
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} barSize={28}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                          <YAxis hide />
                          <Tooltip
                            contentStyle={{ background: "#1a2540", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                            cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                          <Bar dataKey="value" radius={[4,4,0,0]}>
                            {chartData.map((d, i) => (
                              <rect key={i} fill={d.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Activity Tab ─────────────────────────────────────────────────────
function ActivityTab({ projectId }: { projectId: string }) {
  const [page,         setPage]        = useState(1);
  const [filterEntity, setFilterEntity] = useState("");

  const { data, isLoading } = useActivity(projectId, page, filterEntity || undefined);
  const logs       = data?.logs ?? [];
  const totalPages = Math.ceil((data?.total ?? 0) / 30);

  const handleFilter = (val: string) => { setFilterEntity(val); setPage(1); };

  return (
    <div className="space-y-3">
      {/* Filter */}
      <div className="flex gap-1.5 flex-wrap">
        {ENTITY_FILTER.map(f => (
          <button key={f.value} onClick={() => handleFilter(f.value)}
            className={cn("px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all",
              filterEntity === f.value
                ? "bg-teal-500 border-teal-500 text-white"
                : "border-slate-200 dark:border-white/[0.08] text-slate-500 hover:border-teal-300 hover:text-teal-600")}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-teal-500 animate-spin" /></div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-12">Chưa có hoạt động nào</p>
      ) : (
        <div className="space-y-1.5">
          {logs.map((log: ActivityLog) => {
            const action = ACTION_LABEL[log.actionType] ?? { label: log.actionType, color: "text-slate-500", icon: "•" };
            return (
              <div key={log.logId}
                className="flex gap-3 p-3 rounded-xl bg-white dark:bg-[#131f35] border border-slate-100 dark:border-white/[0.05] hover:border-slate-200 dark:hover:border-white/10 transition-colors">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5">
                  {log.userName?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{log.userName}</span>
                    <span className={cn("text-[11px] font-semibold flex items-center gap-0.5", action.color)}>
                      <span>{action.icon}</span> {action.label}
                    </span>
                  </div>
                  {log.entityName && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {log.entityType === "Comment" ? `"${log.entityName}"` : log.entityName}
                    </p>
                  )}
                  {(log.oldValue || log.newValue) && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {log.oldValue && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-500 line-through">{log.oldValue}</span>}
                      {log.oldValue && log.newValue && <span className="text-[10px] text-slate-400">→</span>}
                      {log.newValue && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 font-medium">{log.newValue}</span>}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1">{new Date(log.createdAt).toLocaleString("vi-VN")}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/[0.08] disabled:opacity-40 hover:#f0fdfadark:hover:bg-white/5 transition-colors">
            ← Trước
          </button>
          <span className="px-3 py-1.5 text-xs text-slate-500">{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/[0.08] disabled:opacity-40 hover:#f0fdfadark:hover:bg-white/5 transition-colors">
            Sau →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Add Member Modal ─────────────────────────────────────────────────
function AddMemberModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [email, setEmail]       = useState("");
  const [role, setRole]         = useState("Member");
  const [searching, setSearching] = useState(false);
  const [found, setFound]       = useState<{ userId: string; fullName: string; email: string; avatarUrl: string | null } | null>(null);
  const [searchErr, setSearchErr] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addMember = useAddMember(projectId);

  const search = useCallback((val: string) => {
    setFound(null); setSearchErr("");
    if (!val.includes("@") || val.length < 5) return;
    setSearching(true);
    membersApi.searchUser(val)
      .then(u => setFound(u))
      .catch((err: Error) => setSearchErr(err.message || "Không tìm thấy tài khoản"))
      .finally(() => setSearching(false));
  }, []);

  const handleEmailChange = (val: string) => {
    setEmail(val); setFound(null); setSearchErr("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val.trim()), 500);
  };

  const handleAdd = () => {
    if (!found) return;
    addMember.mutate({ email: found.email, role }, {
      onSuccess: () => { toast.success(`Đã thêm ${found.fullName}`); onClose(); },
      onError:   (err: any) => toast.error(err.message || "Thêm thất bại"),
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
        className="relative z-10 w-full max-w-sm rounded-2xl bg-white dark:bg-[#131f35] border border-slate-200 dark:border-white/[0.08] shadow-2xl p-5 space-y-4">

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">Thêm thành viên</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Email search */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tìm theo email</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 animate-spin" />}
            <input type="email" value={email} onChange={e => handleEmailChange(e.target.value)}
              placeholder="email@example.com"
              className={cn("w-full pl-9 pr-9 py-2.5 text-sm rounded-xl #f0fdfadark:bg-white/[0.04] border text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all",
                searchErr ? "border-rose-400 focus:ring-rose-400/20"
                : found   ? "border-teal-400 focus:ring-teal-400/20"
                          : "border-slate-200 dark:border-white/[0.08] focus:border-teal-400 focus:ring-teal-400/20")} />
          </div>

          <AnimatePresence mode="wait">
            {found && (
              <motion.div key="found" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800">
                <UserCheck className="w-4 h-4 text-teal-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-teal-700 dark:text-teal-300">{found.fullName}</p>
                  <p className="text-[10px] text-teal-500">{found.email}</p>
                </div>
              </motion.div>
            )}
            {searchErr && (
              <motion.div key="err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                <UserX className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <p className="text-xs text-rose-600 dark:text-rose-400">{searchErr}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Role */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Vai trò</label>
          <div className="flex gap-2">
            {["Manager", "Member", "Viewer"].map(r => (
              <button key={r} onClick={() => setRole(r)}
                className={cn("flex-1 py-2 text-xs font-semibold rounded-xl border transition-all",
                  role === r
                    ? "bg-teal-500 border-teal-500 text-white"
                    : "border-slate-200 dark:border-white/[0.08] text-slate-500 hover:border-teal-300")}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleAdd} disabled={!found || addMember.isPending}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white text-sm font-semibold transition-colors">
          {addMember.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Thêm thành viên
        </button>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function MembersPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data, isLoading, isError } = useMembers(projectId!);

  const [tab,        setTab]        = useState<"members"|"activity">("members");
  const [search,     setSearch]     = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [selected,   setSelected]   = useState<ProjectMember | null>(null);
  const [showAdd,    setShowAdd]    = useState(false);

  const updateRole   = useUpdateRole(projectId!);
  const removeMember = useRemoveMember(projectId!);

  const isManager = data?.myRole === "Manager";

  // Realtime — tự động refetch khi có thay đổi thành viên
  useMembersRealtime(projectId!);

  const handleRoleChange = (member: ProjectMember, newRole: string) => {
    if (member.role === newRole) return;
    updateRole.mutate({ userId: member.userId, role: newRole }, {
      onSuccess: () => toast.success(`Đã đổi role ${member.fullName} → ${newRole}`),
      onError:   (err: any) => toast.error(err.message || "Đổi role thất bại"),
    });
  };

  const handleRemove = (member: ProjectMember) => {
    if (!confirm(`Xóa ${member.fullName} khỏi dự án?`)) return;
    removeMember.mutate(member.userId, {
      onSuccess: () => toast.success(`Đã xóa ${member.fullName}`),
      onError:   (err: any) => toast.error(err.message || "Xóa thất bại"),
    });
  };

  const members = data?.members ?? [];
  const filtered = members.filter(m => {
    const matchSearch = m.fullName.toLowerCase().includes(search.toLowerCase())
                     || m.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || m.role === filterRole;
    return matchSearch && matchRole;
  });

  if (isLoading) return (
    <div className="h-full flex items-center justify-center bg-[#f0fdfa] dark:bg-[#0b1120]">
      <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
    </div>
  );

  if (isError) return (
    <div className="h-full flex items-center justify-center bg-[#f0fdfa] dark:bg-[#0b1120]">
      <div className="flex flex-col items-center gap-2">
        <AlertCircle className="w-8 h-8 text-rose-400" />
        <p className="text-sm text-slate-500">Không thể tải dữ liệu</p>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col #f0fdfadark:bg-[#0b1120] overflow-hidden">
      <ToastContainer />

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-[#0b1120] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <Users className="w-5 h-5 text-teal-500" />
          <h1 className="text-base font-bold text-slate-800 dark:text-white">Thành viên</h1>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400">
            {members.length}
          </span>
        </div>
        {isManager && (
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> Thêm thành viên
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4 flex-shrink-0">
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.05] w-fit">
          {(["members", "activity"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
                tab === t ? "bg-white dark:bg-[#1a2e48] text-slate-800 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              {t === "members" ? <><Users className="w-3.5 h-3.5" /> Thành viên</> : <><Activity className="w-3.5 h-3.5" /> Lịch sử hoạt động</>}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-4
                      [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full
                      [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-white/10">

        {tab === "members" && (
          <div className="space-y-4">
            {/* Filter bar */}
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm theo tên hoặc email..."
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-white dark:bg-[#131f35] border border-slate-200 dark:border-teal-900/40 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 transition-colors" />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
                  className="pl-9 pr-8 py-2.5 text-sm rounded-xl bg-white dark:bg-[#131f35] border border-slate-200 dark:border-teal-900/40 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-teal-400 appearance-none cursor-pointer transition-colors">
                  <option value="all">Tất cả vai trò</option>
                  <option value="Manager">Manager</option>
                  <option value="Member">Member</option>
                  <option value="Viewer">Viewer</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Grid */}
            {filtered.length === 0
              ? <p className="text-sm text-slate-400 text-center py-12">Không tìm thấy thành viên nào</p>
              : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <AnimatePresence mode="popLayout">
                    {filtered.map(m => (
                      <MemberCard key={m.userId} member={m}
                        isManager={isManager}
                        isOwner={m.isOwner}
                        onSelect={setSelected}
                        onRemove={handleRemove}
                        onRoleChange={handleRoleChange} />
                    ))}
                  </AnimatePresence>
                </div>}
          </div>
        )}

        {tab === "activity" && <ActivityTab projectId={projectId!} />}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selected && (
          <MemberDetailModal member={selected} isManager={isManager} onClose={() => setSelected(null)} />
        )}
        {showAdd && <AddMemberModal projectId={projectId!} onClose={() => setShowAdd(false)} />}
      </AnimatePresence>
    </div>
  );
}