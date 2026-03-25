import { useState, useEffect } from "react";
import { useNavigate }         from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import {
  X, Settings, Pencil, Trash2, Loader2,
  AlertTriangle, CheckCircle2, FolderKanban, Save,
} from "lucide-react";
import { cn }                              from "@/lib/utils";
import { projectApi, type ProjectDetail } from "@/api/projectApi";

interface Props {
  open:        boolean;
  onClose:     () => void;
  projectId:   string;
  projectName: string; // tên hiển thị ban đầu, sẽ sync từ API
}

export default function ProjectSettingsModal({
  open, onClose, projectId, projectName: initialName,
}: Props) {
  const userId = useAuthStore(s => s.user?.id);

  // Fetch project detail để lấy description + isOwner
  const { data: detail } = useQuery({
    queryKey: ["project-detail", projectId],
    queryFn:  () => projectApi.getDetail(projectId) as Promise<ProjectDetail>,
    enabled:  open && !!projectId,
  });

  const description = detail?.description ?? null;
  const isOwner     = detail?.ownerId === userId || detail?.myRole === "Manager";
  const projectName = detail?.projectName ?? initialName;
  const navigate  = useNavigate();
  const qc        = useQueryClient();

  const [tab,         setTab]         = useState<"general"|"danger">("general");
  const [name,        setName]        = useState(projectName);
  const [desc,        setDesc]        = useState(description ?? "");
  const [deleteInput, setDeleteInput] = useState("");
  const [success,     setSuccess]     = useState(false);

  // Reset khi mở
  useEffect(() => {
    if (open) {
      setName(projectName);
      setDesc(description ?? "");
      setDeleteInput("");
      setSuccess(false);
      setTab("general");
    }
  }, [open, projectName, description]);

  const updateMutation = useMutation({
    mutationFn: () => projectApi.update(projectId, {
      projectName: name.trim(),
      description: desc.trim() || undefined,
    }),
    onSuccess: (data) => {
      setSuccess(true);
      // Invalidate tất cả query liên quan
      qc.invalidateQueries({ queryKey: ["sidebar-projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "projects"] });
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      setTimeout(() => { setSuccess(false); onClose(); }, 1200);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => projectApi.delete(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sidebar-projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "projects"] });
      onClose();
      navigate("/dashboard");
    },
  });

  const canSave    = name.trim().length >= 2 && (
    name.trim() !== projectName || desc.trim() !== (description ?? "")
  );
  const canDelete  = deleteInput === projectName;

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          onClick={onClose}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            onClick={e => e.stopPropagation()}
            className="relative z-10 w-full max-w-lg rounded-2xl bg-white dark:bg-[#0f1929] border border-slate-200 dark:border-white/[0.08] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center">
                  <Settings className="w-4 h-4 text-teal-500" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Thông tin chung</h2>
                  <p className="text-[11px] text-slate-400 truncate max-w-[240px]">{projectName}</p>
                </div>
              </div>
              <button onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 mx-5 mt-4 rounded-xl bg-slate-100 dark:bg-white/[0.05]">
              <button onClick={() => setTab("general")}
                className={cn("flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  tab === "general" ? "bg-white dark:bg-[#1a2e48] text-slate-800 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                <Pencil className="w-3.5 h-3.5" /> Thông tin dự án
              </button>
              {isOwner && (
                <button onClick={() => setTab("danger")}
                  className={cn("flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    tab === "danger" ? "bg-rose-500 text-white shadow-sm" : "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10")}>
                  <Trash2 className="w-3.5 h-3.5" /> Xóa dự án
                </button>
              )}
            </div>

            {/* Body */}
            <div className="px-5 py-5 space-y-4">
              <AnimatePresence mode="wait">

                {/* ── General tab ── */}
                {tab === "general" && (
                  <motion.div key="general"
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}
                    className="space-y-4">

                    {/* Success */}
                    <AnimatePresence>
                      {success && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Đã cập nhật thành công!</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Project icon preview */}
                    <div className="flex items-center gap-3 p-3 rounded-xl #f0fdfadark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center flex-shrink-0">
                        <FolderKanban className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                          {name.trim() || "Tên dự án"}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {desc.trim() || "Chưa có mô tả"}
                        </p>
                      </div>
                    </div>

                    {/* Tên dự án */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Tên dự án <span className="text-rose-500 normal-case">*</span>
                      </label>
                      <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        maxLength={200}
                        placeholder="Tên dự án"
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm #f0fdfa dark:bg-white/[0.1] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all"
                      />
                      <p className="text-[10px] text-slate-400 text-right">{name.length}/200</p>
                    </div>

                    {/* Mô tả */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Mô tả</label>
                      <textarea
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                        rows={3}
                        maxLength={500}
                        placeholder="Mô tả mục tiêu dự án..."
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm resize-none #f0fdfa dark:bg-white/[0.1] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all"
                      />
                      <p className="text-[10px] text-slate-400 text-right">{desc.length}/500</p>
                    </div>

                    {/* Error */}
                    {updateMutation.isError && (
                      <p className="text-xs text-rose-500 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {(updateMutation.error as Error)?.message || "Cập nhật thất bại"}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => updateMutation.mutate()}
                        disabled={!canSave || updateMutation.isPending}
                        className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all",
                          canSave && !updateMutation.isPending
                            ? "bg-teal-500 hover:bg-teal-600 text-white"
                            : "bg-slate-100 dark:bg-white/10 text-slate-400 cursor-not-allowed")}>
                        {updateMutation.isPending
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...</>
                          : <><Save className="w-4 h-4" /> Lưu thay đổi</>}
                      </button>
                      <button onClick={onClose}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                        Hủy
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── Danger tab ── */}
                {tab === "danger" && isOwner && (
                  <motion.div key="danger"
                    initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}
                    className="space-y-4">

                    <div className="flex gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                      <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-rose-700 dark:text-rose-300">Xóa dự án</p>
                        <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed">
                          Hành động này <strong>không thể hoàn tác</strong>. Toàn bộ task, comment, file đính kèm và lịch sử hoạt động sẽ bị xóa vĩnh viễn.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Nhập tên dự án để xác nhận:
                        <span className="ml-1 font-bold text-rose-500">"{projectName}"</span>
                      </label>
                      <input
                        value={deleteInput}
                        onChange={e => setDeleteInput(e.target.value)}
                        placeholder={projectName}
                        className={cn("w-full px-3.5 py-2.5 rounded-xl text-sm #f0fdfadark:bg-white/[0.04] border text-slate-800 dark:text-slate-100 placeholder:text-slate-300 focus:outline-none transition-all",
                          canDelete
                            ? "border-rose-400 focus:ring-2 focus:ring-rose-400/20"
                            : "border-slate-200 dark:border-white/[0.08] focus:border-rose-400")}
                      />
                    </div>

                    {deleteMutation.isError && (
                      <p className="text-xs text-rose-500 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {(deleteMutation.error as Error)?.message || "Xóa thất bại"}
                      </p>
                    )}

                    <button
                      onClick={() => deleteMutation.mutate()}
                      disabled={!canDelete || deleteMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white">
                      {deleteMutation.isPending
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang xóa...</>
                        : <><Trash2 className="w-4 h-4" /> Xóa vĩnh viễn dự án</>}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}