import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence }   from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X, FolderKanban, Users, Loader2, CheckCircle2,
  AlertCircle, Plus, Search, UserCheck, UserX,
} from "lucide-react";
import { cn }         from "@/lib/utils";
import { projectApi } from "@/api/projectApi";
import type { InviteMember, MemberResult, UserSearchResult } from "@/api/projectApi";

// ─── Constants ────────────────────────────────────────────────────────
const FIXED_COLUMNS = [
  { name: "Todo",        color: "bg-slate-400",   label: "Chờ thực hiện"        },
  { name: "In Progress", color: "bg-blue-500",    label: "Đang thực hiện"        },
  { name: "Pending",     color: "bg-amber-500",   label: "Chờ phê duyệt"        },
  { name: "Completed",   color: "bg-emerald-500", label: "Hoàn thành"            },
];

const ROLE_OPTIONS: { value: InviteMember["role"]; label: string; cls: string }[] = [
  { value: "Manager", label: "Manager", cls: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10" },
  { value: "Member",  label: "Member",  cls: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10"       },
  { value: "Viewer",  label: "Viewer",  cls: "text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/10"      },
];

// ─── RoleDropdown ─────────────────────────────────────────────────────
function RoleDropdown({ value, onChange }: {
  value: InviteMember["role"];
  onChange: (v: InviteMember["role"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const sel = ROLE_OPTIONS.find(r => r.value === value)!;
  return (
    <div className="relative flex-shrink-0">
      <button type="button" onClick={() => setOpen(v => !v)}
        className={cn("flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors", sel.cls)}>
        {sel.label} <span className={cn("text-[10px] transition-transform inline-block", open && "rotate-180")}>▾</span>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.1 }}
              className="absolute right-0 top-full mt-1 z-50 w-28 rounded-xl overflow-hidden shadow-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-800">
              {ROLE_OPTIONS.map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={cn("w-full text-left px-3 py-2 text-xs font-semibold transition-colors hover:#f0fdfadark:hover:bg-white/5",
                    value === opt.value ? opt.cls : "text-slate-600 dark:text-slate-300")}>
                  {opt.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── WorkflowPreview ──────────────────────────────────────────────────
function WorkflowPreview() {
  // Fake tasks cho mỗi cột
  const fakeTasks: Record<string, { title: string; priority: string; priorityColor: string }[]> = {
    "Todo":        [{ title: "Thiết kế UI màn hình", priority: "High",   priorityColor: "text-rose-500 bg-rose-500/10"   },
                    { title: "Phân tích yêu cầu",    priority: "Medium", priorityColor: "text-amber-500 bg-amber-500/10" }],
    "In Progress": [{ title: "Xây dựng API backend", priority: "Urgent", priorityColor: "text-red-600 bg-red-500/10"     }],
    "Pending":     [{ title: "Code trang dashboard",  priority: "High",   priorityColor: "text-rose-500 bg-rose-500/10"   }],
    "Completed":   [{ title: "Setup database",        priority: "Low",    priorityColor: "text-teal-500 bg-teal-500/10"   },
                    { title: "Cài đặt môi trường",    priority: "Low",    priorityColor: "text-teal-500 bg-teal-500/10"   }],
  };

  return (
    <div className="flex flex-col h-full">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex-shrink-0">
        Xem trước board
      </p>

      {/* Kanban ngang */}
      <div className="flex-1 flex flex-row gap-2 overflow-x-auto min-h-0 pb-1
                      [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full
                      [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-white/10">
        {FIXED_COLUMNS.map((col) => (
          <div key={col.name} className="flex-shrink-0 w-[130px] flex flex-col gap-1.5">
            {/* Column header */}
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200/70 dark:border-teal-900/40">
              <span className={cn("w-2 h-2 rounded-full flex-shrink-0", col.color)} />
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate flex-1">
                {col.name}
              </span>
              <span className="text-[9px] text-slate-400 bg-slate-200/80 dark:bg-white/10 px-1 rounded font-medium py-0.5">
                {fakeTasks[col.name].length}
              </span>
            </div>
            {/* Fake task cards */}
            {fakeTasks[col.name].map((task, j) => (
              <div key={j} className="rounded-lg bg-white dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] shadow-sm px-2 py-1.5 space-y-1">
                <div className="flex items-center gap-1">
                  <span className={cn("text-[8px] font-semibold px-1 py-0.5 rounded-full", task.priorityColor)}>
                    {task.priority}
                  </span>
                </div>
                <p className="text-[9px] text-slate-600 dark:text-slate-300 leading-tight line-clamp-2">{task.title}</p>
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 ml-auto" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────
interface Props { open: boolean; onClose: () => void; }

export default function CreateProjectModal({ open, onClose }: Props) {
  const qc = useQueryClient();

  const [step, setStep]               = useState<"form" | "done">("form");
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [members, setMembers]         = useState<InviteMember[]>([]);
  const [result, setResult]           = useState<MemberResult[]>([]);
  const [createdId, setCreatedId]     = useState("");

  // Email search state
  const [emailInput, setEmailInput]   = useState("");
  const [roleInput, setRoleInput]     = useState<InviteMember["role"]>("Member");
  const [searching, setSearching]     = useState(false);
  const [searchResult, setSearchResult] = useState<UserSearchResult | null>(null);
  const [searchError, setSearchError]   = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const createMutation = useMutation({
    mutationFn: projectApi.create,
    onSuccess: (data) => {
      setResult(data.members);
      setCreatedId(data.projectId);
      setStep("done");
      qc.invalidateQueries({ queryKey: ["sidebar-projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "projects"] });
    },
  });

  function handleClose() {
    onClose();
    setTimeout(() => {
      setStep("form"); setProjectName(""); setDescription("");
      setMembers([]); setEmailInput(""); setRoleInput("Member");
      setSearchResult(null); setSearchError(""); setResult("" as any); setCreatedId("");
    }, 300);
  }

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Real-time email search với debounce 500ms
  const searchUser = useCallback((email: string) => {
    setSearchResult(null);
    setSearchError("");
    if (!email.includes("@") || email.length < 5) return;

    setSearching(true);
    projectApi.searchUser(email)
      .then(user => {
        if (members.find(m => m.email === user.email)) {
          setSearchError("Người dùng đã được thêm");
        } else {
          setSearchResult(user);
        }
      })
      .catch((err: Error) => {
        setSearchError(err.message || "Không tìm thấy tài khoản");
      })
      .finally(() => setSearching(false));
  }, [members]);

  function handleEmailChange(val: string) {
    setEmailInput(val);
    setSearchResult(null);
    setSearchError("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchUser(val.trim()), 500);
  }

  function addMember() {
    if (!searchResult) return;
    setMembers(prev => [...prev, { email: searchResult.email, role: roleInput }]);
    setEmailInput("");
    setSearchResult(null);
    setSearchError("");
  }

  function handleSubmit() {
    createMutation.mutate({
      projectName: projectName.trim(),
      description: description.trim(),
      members,
      columns: FIXED_COLUMNS.map((c, i) => ({ name: c.name, position: i + 1 })),
    });
  }

  const canSubmit = projectName.trim().length >= 2 && !createMutation.isPending;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-40 bg-black/40 dark:bg-black/60 backdrop-blur-sm" />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="pointer-events-auto w-full max-w-[880px] max-h-[90vh] flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-[#0f1929] border border-slate-200 dark:border-white/[0.08] shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.06] flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center">
                    <FolderKanban className="w-4 h-4 text-teal-500" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      {step === "done" ? "Dự án đã tạo thành công" : "Tạo dự án mới"}
                    </h2>
                    {step === "form" && (
                      <p className="text-[11px] text-slate-400 mt-0.5">Thiết lập không gian làm việc cho nhóm</p>
                    )}
                  </div>
                </div>
                <button onClick={handleClose}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">

                  {/* ══ FORM ══ */}
                  {step === "form" && (
                    <motion.div key="form"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="h-full flex flex-col sm:flex-row overflow-hidden">

                      {/* LEFT */}
                      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-6 py-5 space-y-5
                                      [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full
                                      [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-white/10">

                        {/* Tên dự án */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                            Tên dự án <span className="text-rose-500 normal-case">*</span>
                          </label>
                          <input type="text" value={projectName}
                            onChange={e => setProjectName(e.target.value)}
                            placeholder="VD: HTMS — Hybrid Task Management"
                            maxLength={200}
                            className="w-full px-3.5 py-2.5 rounded-xl text-sm #f0fdfa dark:bg-white/[0.1] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all" />
                        </div>

                        {/* Mô tả */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Mô tả</label>
                          <textarea value={description} onChange={e => setDescription(e.target.value)}
                            placeholder="Mô tả mục tiêu và phạm vi dự án..."
                            rows={2} maxLength={500}
                            className="w-full px-3.5 py-2.5 rounded-xl text-sm resize-none #f0fdfa dark:bg-white/[0.1] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all" />
                        </div>

                        {/* Members */}
                        <div className="space-y-3">
                          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" /> Thêm thành viên
                            {members.length > 0 && (
                              <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400">
                                {members.length}
                              </span>
                            )}
                          </label>

                          {/* Search input */}
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                {searching && (
                                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 animate-spin" />
                                )}
                                <input type="email" value={emailInput}
                                  onChange={e => handleEmailChange(e.target.value)}
                                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addMember())}
                                  placeholder="Tìm theo email..."
                                  className={cn(
                                    "w-full pl-9 pr-9 py-2.5 rounded-xl text-sm #f0fdfa dark:bg-white/[0.1] border text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all",
                                    searchError
                                      ? "border-rose-400 focus:border-rose-400 focus:ring-rose-400/20"
                                      : searchResult
                                        ? "border-teal-400 focus:border-teal-400 focus:ring-teal-400/20"
                                        : "border-slate-200 dark:border-white/[0.08] focus:border-teal-400 focus:ring-teal-400/20"
                                  )} />
                              </div>
                              <RoleDropdown value={roleInput} onChange={setRoleInput} />
                              <button type="button" onClick={addMember} disabled={!searchResult}
                                className="w-10 h-10 flex-shrink-0 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors">
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Search feedback */}
                            <AnimatePresence mode="wait">
                              {searchResult && (
                                <motion.div key="found"
                                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800">
                                  <UserCheck className="w-4 h-4 text-teal-500 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-teal-700 dark:text-teal-300">{searchResult.fullName}</p>
                                    <p className="text-[10px] text-teal-500">{searchResult.email}</p>
                                  </div>
                                  <span className="text-[10px] text-teal-600 dark:text-teal-400">Nhấn + để thêm</span>
                                </motion.div>
                              )}
                              {searchError && (
                                <motion.div key="error"
                                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                                  <UserX className="w-4 h-4 text-rose-500 flex-shrink-0" />
                                  <p className="text-xs text-rose-600 dark:text-rose-400">{searchError}</p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Member list */}
                          <div className="space-y-1.5">
                            <AnimatePresence mode="popLayout">
                              {members.length === 0 ? (
                                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                  className="text-[11px] text-slate-400 italic py-1 pl-1">
                                  Thêm thành viên để cộng tác.
                                </motion.p>
                              ) : members.map(m => (
                                <motion.div key={m.email} layout
                                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.15 }}
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl #f0fdfa dark:bg-white/[0.1] border border-slate-100 dark:border-white/[0.06]">
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                    {m.email[0].toUpperCase()}
                                  </div>
                                  <span className="flex-1 text-xs text-slate-700 dark:text-slate-300 truncate">{m.email}</span>
                                  <RoleDropdown value={m.role}
                                    onChange={r => setMembers(prev => prev.map(x => x.email === m.email ? { ...x, role: r } : x))} />
                                  <button type="button"
                                    onClick={() => setMembers(prev => prev.filter(x => x.email !== m.email))}
                                    className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT — Workflow preview */}
                      <div className="hidden sm:flex flex-col w-[300px] flex-shrink-0 border-l border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] px-5 py-5">
                        <WorkflowPreview />
                      </div>
                    </motion.div>
                  )}

                  {/* ══ DONE ══ */}
                  {step === "done" && (
                    <motion.div key="done"
                      initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.25 }}
                      className="flex flex-col items-center justify-center h-full px-8 py-10 text-center gap-5">
                      <motion.div
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.1 }}
                        className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-teal-500" />
                      </motion.div>

                      <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Tạo thành công!</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          Dự án <span className="font-semibold text-teal-600 dark:text-teal-400">{projectName}</span> đã sẵn sàng
                        </p>
                      </div>

                      {/* 4 cột đã tạo */}
                      <div className="flex flex-wrap justify-center gap-2 max-w-xs">
                        {FIXED_COLUMNS.map(col => (
                          <span key={col.name} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                            <span className={cn("w-2 h-2 rounded-full", col.color)} />{col.name}
                          </span>
                        ))}
                      </div>

                      {/* Member results */}
                      {result.length > 0 && (
                        <div className="w-full max-w-sm space-y-1.5">
                          {result.map(m => (
                            <div key={m.email} className={cn(
                              "flex items-center gap-2.5 px-3 py-2 rounded-xl",
                              m.success
                                ? "bg-teal-50/60 dark:bg-teal-500/[0.06] border border-teal-100 dark:border-teal-500/10"
                                : "bg-rose-50/60 dark:bg-rose-500/[0.06] border border-rose-100 dark:border-rose-500/10")}>
                              {m.success
                                ? <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                                : <AlertCircle  className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{m.fullName || m.email}</p>
                                {!m.success && <p className="text-[10px] text-rose-400">{m.error}</p>}
                              </div>
                              {m.success && <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{m.role}</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-3 w-full max-w-sm">
                        <button type="button" onClick={handleClose}
                          className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:#f0fdfadark:hover:bg-white/5 transition-colors">
                          Đóng
                        </button>
                        <button type="button"
                          onClick={() => { handleClose(); window.location.href = `/projects/${createdId}/board`; }}
                          className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-teal-500 hover:bg-teal-600 text-white transition-colors">
                          Mở Board →
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              {step === "form" && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-white/[0.06] flex-shrink-0 bg-slate-50/50 dark:bg-transparent">
                  <p className="text-[11px] text-slate-400">
                     {members.length} thành viên
                  </p>
                  <div className="flex gap-3">
                    <button type="button" onClick={handleClose}
                      className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                      Hủy
                    </button>
                    <button type="button" onClick={handleSubmit}
                      disabled={!canSubmit}
                      className={cn("flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all",
                        canSubmit
                          ? "bg-teal-500 hover:bg-teal-600 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-white/10 text-slate-400 cursor-not-allowed")}>
                      {createMutation.isPending
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang tạo...</>
                        : "Tạo dự án ✓"}
                    </button>
                  </div>
                </div>
              )}

              {/* Error */}
              <AnimatePresence>
                {createMutation.isError && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="px-6 pb-3 flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {(createMutation.error as Error)?.message || "Đã xảy ra lỗi, vui lòng thử lại."}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}