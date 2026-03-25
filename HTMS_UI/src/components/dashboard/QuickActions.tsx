import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FolderPlus, FileText, RefreshCw, Clock, Loader2,
         CheckCircle2, AlertCircle } from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useMyTasks }     from "@/hooks/useMyTasks";
import { myTasksApi }     from "@/api/myTasksApi";
import { projectApi }     from "@/api/projectApi";
import CreateProjectModal from "@/components/project/CreateProjectModal";

// ─── Mini toast ───────────────────────────────────────────────────────
function MiniToast({ msg, type }: { msg: string; type: "success"|"error" }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2
        px-4 py-2.5 rounded-xl text-sm font-medium shadow-xl border pointer-events-none
        ${type === "success"
          ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
          : "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"}`}>
      {type === "success"
        ? <CheckCircle2 className="w-4 h-4" />
        : <AlertCircle className="w-4 h-4" />}
      {msg}
    </motion.div>
  );
}

// ─── Add Task Modal (personal task nhanh) ────────────────────────────
function QuickAddTaskModal({ onClose }: { onClose: () => void }) {
  const [title,   setTitle]   = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      await myTasksApi.createPersonal({ title: title.trim(), dueDate: dueDate || undefined });
      qc.invalidateQueries({ queryKey: ["my-tasks"] });
      onClose();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
        onClick={e => e.stopPropagation()}
        className="relative z-10 w-full max-w-sm rounded-2xl bg-white dark:bg-[#131f35] border border-slate-200 dark:border-white/[0.08] shadow-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Tạo task cá nhân</h3>
        <div className="space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="Tên công việc..."
            autoFocus
            className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all" />
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all [color-scheme:light] dark:[color-scheme:dark]" />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={handleSubmit} disabled={!title.trim() || loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Tạo task
          </button>
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
            Hủy
          </button>
        </div>
      </motion.div>
    </div>
  );
}


// ─── Recent Dropdown ──────────────────────────────────────────────────
function RecentDropdown({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const dropRef  = React.useRef<HTMLDivElement>(null);

  const { tasks: allTasks } = useMyTasks();
  const { data: projects }  = useQuery({
    queryKey: ["sidebar-projects"],
    queryFn:  projectApi.getSidebarProjects,
    staleTime: 1000 * 60 * 2,
  });

  // Lấy 4 task gần nhất (sắp theo createdAt desc)
  const recentTasks = [...(allTasks ?? [])]
    .filter(t => t.type === "project")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  // Lấy 4 dự án gần nhất
  const recentProjects = (projects ?? []).slice(-4).reverse();

  const STATUS_DOT: Record<string, string> = {
    "Todo":        "bg-slate-400",
    "In Progress": "bg-blue-500",
    "Pending":     "bg-amber-500",
    "Completed":   "bg-emerald-500",
    "Rejected":    "bg-rose-500",
  };

  // Click outside
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const go = (path: string) => { navigate(path); onClose(); };

  return (
    <motion.div ref={dropRef}
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.15 }}
      className="absolute bottom-full mb-2 left-0 w-72 rounded-2xl bg-white dark:bg-[#131f35] border border-slate-200 dark:border-white/[0.08] shadow-2xl z-[300] overflow-hidden">

      {/* Tasks gần đây */}
      {recentTasks.length > 0 && (
        <>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-4 pt-3 pb-1.5">Task gần đây</p>
          {recentTasks.map(t => (
            <button key={t.id}
              onClick={() => go(`/projects/${t.projectId}/board`)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors text-left">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[t.taskStatus ?? "Todo"] ?? "bg-slate-400"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{t.title}</p>
                {t.projectName && (
                  <p className="text-[10px] text-slate-400 truncate">{t.projectName}</p>
                )}
              </div>
            </button>
          ))}
        </>
      )}

      {/* Projects gần đây */}
      {recentProjects.length > 0 && (
        <>
          <div className={`border-t border-slate-100 dark:border-white/[0.05] ${recentTasks.length > 0 ? "mt-1" : ""}`} />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-4 pt-3 pb-1.5">Dự án gần đây</p>
          {recentProjects.map((p: any) => (
            <button key={p.projectId}
              onClick={() => go(`/projects/${p.projectId}/board`)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors text-left">
              <div className="w-5 h-5 rounded-md bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                <FolderPlus className="w-3 h-3 text-teal-500" />
              </div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{p.projectName}</p>
            </button>
          ))}
        </>
      )}

      {recentTasks.length === 0 && recentProjects.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-6">Chưa có hoạt động gần đây</p>
      )}

      <div className="border-t border-slate-100 dark:border-white/[0.05] px-4 py-2.5">
        <button onClick={() => go("/my-tasks")}
          className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium">
          Xem tất cả công việc →
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────
export default function QuickActions() {
  const navigate  = useNavigate();
  const qc        = useQueryClient();

  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showAddTask,       setShowAddTask]        = useState(false);
  const [syncing,           setSyncing]            = useState(false);
  const [showRecent,        setShowRecent]         = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success"|"error" } | null>(null);

  const showToast = (msg: string, type: "success"|"error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const actions = [
    {
      icon:    Plus,
      label:   "Tạo Task",
      color:   "bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400",
      onClick: () => setShowAddTask(true),
    },
    {
      icon:    FolderPlus,
      label:   "Tạo dự án",
      color:   "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400",
      onClick: () => setShowCreateProject(true),
    },
    {
      icon:    FileText,
      label:   "Công việc của tôi",
      color:   "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
      onClick: () => navigate("/my-tasks"),
    },
    {
      icon:    Clock,
      label:   "Gần đây",
      color:   "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      onClick: () => setShowRecent(v => !v),
      spinning: false,
    },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.45 }}
        className="rounded-2xl border border-slate-200 dark:border-teal-900/40 bg-white dark:bg-slate-800/60 shadow-sm hover:shadow-md transition-all duration-300 h-full p-5">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Thao tác nhanh</h3>
        <div className="grid grid-cols-2 gap-2">
          {actions.map(({ icon: Icon, label, color, onClick, spinning }, i) => (
            <div key={label} className="relative">
              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.55 + i * 0.06 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onClick}
                className={`w-full flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-150
                  bg-slate-50/50 dark:bg-white/[0.03]
                  ${i === 3 && showRecent
                    ? "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-500/10"
                    : "border-transparent hover:border-slate-200 dark:hover:border-white/10"}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`} />
                </div>
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 text-center leading-tight">
                  {label}
                </span>
              </motion.button>
              {/* Dropdown gần đây — chỉ nút thứ 4 */}
              <AnimatePresence>
                {i === 3 && showRecent && (
                  <RecentDropdown onClose={() => setShowRecent(false)} />
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showAddTask && <QuickAddTaskModal onClose={() => setShowAddTask(false)} />}
      </AnimatePresence>

      <CreateProjectModal
        open={showCreateProject}
        onClose={() => setShowCreateProject(false)}
      />

      {/* Toast */}
      <AnimatePresence>
        {toast && <MiniToast msg={toast.msg} type={toast.type} />}
      </AnimatePresence>
    </>
  );
}