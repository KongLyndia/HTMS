import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import WorkloadPanel from "@/components/board/WorkloadPanel";
import {
  Plus, Calendar, Flag, AlertCircle, Loader2, X,
  Crown, Shield, Eye, MoreHorizontal, Trash2, Pencil,
  Upload, CheckCircle2, XCircle, Clock, Paperclip,
  ChevronDown, PlayCircle, FileCheck, History, FileText,
  MessageSquare, Send, AlignLeft, Settings2, Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_THEME, PRIORITY_THEME, COLUMN_DOT_COLORS, getStatusTheme, getPriorityTheme, getCardRing } from "@/lib/theme";
import {
  useBoard, useCreateTask, useUpdateTask,
  useStartTask, useSubmitTask, useReviewTask, useDeleteTask, useDeleteAttachment,
  useAddComment, useAddAttachment, useDeleteComment,
} from "@/hooks/useBoard";
import type { BoardTask, BoardData, BoardColumn, TaskStatus, Priority } from "@/api/boardApi";

// ════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════
// Dùng STATUS_THEME và PRIORITY_THEME từ @/lib/theme
const STATUS_CFG = STATUS_THEME;
const PRIORITY_CFG = PRIORITY_THEME;


// Resolve file URL — nếu là path local thì ghép với BE base URL
function resolveFileUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = (import.meta.env.VITE_API_URL as string || "https://localhost:7004/api")
    .replace("/api", "");
  return `${base}${url}`;
}

// Đuôi file browser không preview được → mở qua Google Docs Viewer
const DOCS_VIEWER_EXTS = [".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"];


// ─── Download & PDF helpers ───────────────────────────────────────────
// ─── Download & PDF helpers ───────────────────────────────────────────

// Chuẩn hóa URL: loại bỏ fl_attachment nếu có (để xem)
function getViewUrl(url: string): string {
  if (!url.includes("cloudinary.com")) return url;
  return url.replace("/fl_attachment/", "/");
}

// Thêm fl_attachment để buộc tải về (thay vì xem)
function forceDownloadUrl(url: string): string {
  if (!url.includes("cloudinary.com")) return url;
  
  // Nếu đã có rồi thì không thêm nữa
  if (url.includes("fl_attachment")) return url;
  
  // Xử lý cả 3 dạng URL: /upload/, /image/upload/, /raw/upload/
  if (url.includes("/image/upload/")) {
    return url.replace("/image/upload/", "/image/upload/fl_attachment/");
  }
  if (url.includes("/raw/upload/")) {
    return url.replace("/raw/upload/", "/raw/upload/fl_attachment/");
  }
  // Fallback cho dạng /upload/ thông thường
  return url.replace("/upload/", "/upload/fl_attachment/");
}

// Mở file để xem (không tải về)
function openFile(fileUrl: string, fileName: string) {
  // Lấy URL đã loại bỏ fl_attachment để xem được
  const viewUrl = getViewUrl(fileUrl);
  const ext = "." + (fileName.split(".").pop()?.toLowerCase() ?? "");
  
  // File Office → Microsoft Viewer
  if (DOCS_VIEWER_EXTS.includes(ext)) {
    window.open(
      `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(viewUrl)}`,
      "_blank", "noopener,noreferrer"
    );
  } 
  // File PDF → dùng Google Viewer (nhanh hơn pdf.js)
  else if (ext === ".pdf") {
    window.open(
      `https://docs.google.com/viewer?url=${encodeURIComponent(viewUrl)}&embedded=true`,
      "_blank", "noopener,noreferrer"
    );
  } 
  // Ảnh, video, file khác → mở trực tiếp
  else {
    window.open(viewUrl, "_blank", "noopener,noreferrer");
  }
}
const COL_DOTS = COLUMN_DOT_COLORS;

// ════════════════════════════════════════════════════════════════════
// TOAST
// ════════════════════════════════════════════════════════════════════
type ToastItem = { id: number; msg: string; type: "success"|"error"|"info" };
let _setToasts: React.Dispatch<React.SetStateAction<ToastItem[]>> | null = null;
let _tid = 0;
const toast = {
  show(msg: string, type: ToastItem["type"] = "info") {
    _setToasts?.(prev => {
      const id = ++_tid;
      setTimeout(() => _setToasts?.(p => p.filter(t => t.id !== id)), 3200);
      return [...prev.slice(-3), { id, msg, type }];
    });
  },
  success: (msg: string) => toast.show(msg, "success"),
  error:   (msg: string) => toast.show(msg, "error"),
  info:    (msg: string) => toast.show(msg, "info"),
};

function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  useEffect(() => { _setToasts = setToasts; return () => { _setToasts = null; }; }, []);
  const icons = { success: "✅", error: "🚫", info: "ℹ️" };
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.93 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.93 }} transition={{ duration: 0.16 }}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#1a2540] text-slate-200 border border-white/[0.1] shadow-2xl">
            <span>{icons[t.type]}</span>{t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ════════════════════════════════════════════════════════════════════
function Avatar({ name, url, size = "sm" }: { name: string | null; url: string | null; size?: "xs"|"sm"|"md" }) {
  const sz = size === "xs" ? "w-5 h-5 text-[9px]" : size === "md" ? "w-8 h-8 text-xs" : "w-6 h-6 text-[10px]";
  if (url) return <img src={url} alt={name ?? ""} className={cn(sz, "rounded-full object-cover flex-shrink-0 ring-1 ring-white/20")} />;
  return <div className={cn(sz, "rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white bg-gradient-to-br from-teal-400 to-teal-600 ring-1 ring-white/20")}>{name?.[0]?.toUpperCase() ?? "?"}</div>;
}

function RoleBadge({ role }: { role: string }) {
  const cfg = role === "Manager" ? { Icon: Crown,  cls: "text-amber-500 bg-amber-500/10"  }
            : role === "Viewer"  ? { Icon: Eye,    cls: "text-slate-400 bg-slate-500/10" }
                                 : { Icon: Shield, cls: "text-teal-500 bg-teal-500/10"   };
  return <span className={cn("flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full", cfg.cls)}><cfg.Icon className="w-3 h-3" />{role}</span>;
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const cfg = getStatusTheme(status);
  return <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", cfg.text, cfg.bg, cfg.border)}>{cfg.label}</span>;
}

function DueDateChip({ date }: { date: string | null }) {
  if (!date) return null;
  const d = new Date(date), now = new Date();
  const isOver = d < now, isSoon = !isOver && d.getTime() - now.getTime() < 172_800_000;
  return (
    <span className={cn("flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded",
      isOver ? "text-rose-500 bg-rose-500/10" : isSoon ? "text-amber-500 bg-amber-500/10" : "text-slate-400 bg-slate-500/10")}>
      <Calendar className="w-3 h-3" />{new Date(date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════
// MODAL BASE
// ════════════════════════════════════════════════════════════════════
function Modal({ title, onClose, children, width = "max-w-lg" }: {
  title: string; onClose: () => void; children: React.ReactNode; width?: string;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
        className={cn("relative z-10 w-full rounded-2xl bg-white dark:bg-[#131f35] border border-slate-200 dark:border-white/[0.08] shadow-2xl", width)}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </motion.div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// TASK DETAIL MODAL — xem + hành động tuỳ role/status
// ════════════════════════════════════════════════════════════════════
function TaskDetailModal({ task, board, projectId, onClose }: {
  task: BoardTask; board: BoardData; projectId: string; onClose: () => void;
}) {
  const { myRole, myUserId } = board;
  const [tab, setTab]           = useState<"info"|"comments"|"history">("info");
  const [files, setFiles]       = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [rejectReason, setRejectReason]     = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  // Submit mode: file hoặc text
  const [submitMode, setSubmitMode]   = useState<"file"|"text">("file");
  const [submitText, setSubmitText]   = useState("");
  // Manager inline edit
  const [editMode, setEditMode]       = useState(false);
  const [editAssignee, setEditAssignee] = useState(task.assigneeId ?? "");
  const [editDueDate, setEditDueDate]   = useState(task.dueDate ? task.dueDate.split("T")[0] : "");
  const [editPriority, setEditPriority] = useState(task.priority ?? "");
  const [commentText, setCommentText]       = useState("");
  const [attachFiles, setAttachFiles]       = useState<File[]>([]);
  // @mention state
  const [mentionQuery, setMentionQuery]     = useState("");
  const [mentionOpen, setMentionOpen]       = useState(false);
  const [mentionCursor, setMentionCursor]   = useState(0);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const commentEndRef  = useRef<HTMLDivElement>(null);
  const textareaRef      = useRef<HTMLTextAreaElement>(null);
  const startTask        = useStartTask(projectId);
  const submitTask       = useSubmitTask(projectId);
  const reviewTask       = useReviewTask(projectId);
  const deleteAttachment = useDeleteAttachment(projectId);
  const addComment       = useAddComment(projectId);
  const addAttachment    = useAddAttachment(projectId);
  const deleteComment    = useDeleteComment(projectId);
  const updateTask       = useUpdateTask(projectId);
  const deleteTask       = useDeleteTask(projectId);

  // Danh sách thành viên có thể @mention (lọc theo query)
  const mentionMembers = mentionQuery
    ? board.members.filter(m =>
        m.fullName.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(mentionQuery.toLowerCase())
      ).slice(0, 5)
    : board.members.slice(0, 5);

  const isAssignee = task.assigneeId === myUserId;
  const isManager  = myRole === "Manager";
  const prio       = task.priority ? PRIORITY_CFG[task.priority] : null;
  //const statusCfg  = STATUS_CFG[task.taskStatus] ?? STATUS_CFG["Todo"];

  // Reject comment (lý do gần nhất)
  // Lấy lý do từ chối gần nhất (reject nhiều lần → hiện lần cuối)
  const rejectComment = [...task.comments].reverse().find(c => c.content.startsWith("[TỪ CHỐI]"));

  const handleFiles = (newFiles: FileList | File[]) => {
    const valid = Array.from(newFiles).filter(f => {
      if (f.size > 20 * 1024 * 1024) { toast.error(`${f.name} quá lớn (tối đa 20MB)`); return false; }
      return true;
    });
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      return [...prev, ...valid.filter(f => !existing.has(f.name + f.size))];
    });
  };

  // ── @mention handlers ────────────────────────────────────────────
  const handleCommentChange = useCallback((val: string) => {
    setCommentText(val);
    // Detect @ ở vị trí cursor
    const cursor = textareaRef.current?.selectionStart ?? val.length;
    const textBefore = val.slice(0, cursor);
    const match = textBefore.match(/@(\w[\w\s]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionOpen(true);
      setMentionCursor(0);
    } else {
      setMentionOpen(false);
      setMentionQuery("");
    }
  }, []);

  const insertMention = useCallback((fullName: string) => {
    const cursor = textareaRef.current?.selectionStart ?? commentText.length;
    const textBefore = commentText.slice(0, cursor);
    const textAfter  = commentText.slice(cursor);
    const replaced   = textBefore.replace(/@(\w[\w\s]*)$/, `@${fullName} `);
    setCommentText(replaced + textAfter);
    setMentionOpen(false);
    setMentionQuery("");
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [commentText]);

  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionOpen) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionCursor(v => Math.min(v + 1, mentionMembers.length - 1)); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setMentionCursor(v => Math.max(v - 1, 0)); return; }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (mentionMembers[mentionCursor]) insertMention(mentionMembers[mentionCursor].fullName);
        return;
      }
      if (e.key === "Escape") { setMentionOpen(false); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendComment(); }
  };

  // ── Comment/Attachment handlers ───────────────────────────────────
  const handleSendComment = () => {
    const text = commentText.trim();
    if (!text) return;
    addComment.mutate({ taskId: task.taskId, content: text }, {
      onSuccess: () => {
        setCommentText("");
        setMentionOpen(false);
        setTimeout(() => commentEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      },
      onError: () => toast.error("Gửi comment thất bại"),
    });
  };

  const handleAddAttachFiles = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter(f => {
      if (f.size > 20 * 1024 * 1024) { toast.error(`${f.name} quá lớn (tối đa 20MB)`); return false; }
      return true;
    });
    setAttachFiles(prev => [...prev, ...valid]);
  };

  const handleUploadAttachments = async () => {
    for (const f of attachFiles) {
      await addAttachment.mutateAsync({ taskId: task.taskId, file: f });
    }
    setAttachFiles([]);
    toast.success("Đã tải lên tất cả file");
  };

  // Render nội dung comment — highlight @mention
  const renderComment = (content: string) => {
    const parts = content.split(/(@\S+(?:\s\S+)?)/g);
    return parts.map((part, i) =>
      part.startsWith("@")
        ? <span key={i} className="text-teal-600 dark:text-teal-400 font-semibold">{part}</span>
        : <span key={i}>{part}</span>
    );
  };

  const handleStart = () => {
    startTask.mutate(task.taskId, {
      onSuccess: () => { toast.success("Bắt đầu thực hiện task!"); onClose(); },
      onError:   () => toast.error("Thao tác thất bại"),
    });
  };

  const handleSubmit = () => {
    if (files.length === 0) return;
    submitTask.mutate({ taskId: task.taskId, files }, {
      onSuccess: () => { toast.success(`Đã gửi ${files.length} file! Manager sẽ được thông báo.`); onClose(); },
      onError:   () => toast.error("Upload thất bại"),
    });
  };

  const handleApprove = () => {
    reviewTask.mutate({ taskId: task.taskId, payload: { approve: true } }, {
      onSuccess: () => { toast.success("Đã phê duyệt task ✅"); onClose(); },
      onError:   () => toast.error("Thao tác thất bại"),
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) { toast.error("Vui lòng nhập lý do từ chối"); return; }
    reviewTask.mutate({ taskId: task.taskId, payload: { approve: false, reason: rejectReason.trim() } }, {
      onSuccess: () => { toast.success("Đã từ chối task ❌"); onClose(); },
      onError:   () => toast.error("Thao tác thất bại"),
    });
  };

  const handleSaveEdit = () => {
    updateTask.mutate({ taskId: task.taskId, payload: {
      priority:      (editPriority || undefined) as any,
      dueDate:       editDueDate || undefined,
      assigneeId:    editAssignee || undefined,
      clearAssignee: !editAssignee,
    }}, {
      onSuccess: () => { toast.success("Đã cập nhật task"); setEditMode(false); },
      onError:   () => toast.error("Cập nhật thất bại"),
    });
  };

  const handleDeleteTask = () => {
    if (!confirm(`Xóa task "${task.title}"?`)) return;
    deleteTask.mutate(task.taskId, {
      onSuccess: () => { toast.success("Đã xóa task"); onClose(); },
      onError:   () => toast.error("Xóa thất bại"),
    });
  };

  // Submit text thay vì file
  const handleSubmitText = () => {
    if (!submitText.trim()) return;
    const blob = new Blob([submitText.trim()], { type: "text/plain" });
    const f = new File([blob], "mo-ta-hoan-thanh.txt", { type: "text/plain" });
    submitTask.mutate({ taskId: task.taskId, files: [f] }, {
      onSuccess: () => { toast.success("Đã gửi mô tả! Manager sẽ được thông báo."); onClose(); },
      onError:   () => toast.error("Gửi thất bại"),
    });
  };

  return (
    <Modal title="Chi tiết task" onClose={onClose} width="max-w-2xl">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-800 dark:text-white leading-snug">{task.title}</h3>
            {task.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{task.description}</p>}
          </div>
          <StatusBadge status={task.taskStatus} />
        </div>

        {/* Manager quick actions */}
        {isManager && (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
            <button onClick={() => setEditMode(v => !v)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                editMode ? "bg-teal-500 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10")}>
              <Settings2 className="w-3.5 h-3.5" /> {editMode ? "Đang sửa" : "Chỉnh sửa"}
            </button>
            <button onClick={handleDeleteTask} disabled={deleteTask.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors disabled:opacity-40">
              <Trash2 className="w-3.5 h-3.5" /> Xóa task
            </button>
          </div>
        )}

        {/* Manager inline edit panel */}
        {isManager && editMode && (
          <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className="p-4 rounded-xl bg-white dark:bg-white/[0.04] border border-teal-300 dark:border-teal-700 space-y-3">
            <p className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wide">Chỉnh sửa task</p>
            <div className="grid grid-cols-2 gap-3">
              {/* Assignee */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wide">Giao cho</label>
                <select value={editAssignee} onChange={e => setEditAssignee(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:border-teal-400">
                  <option value="">Chưa giao</option>
                  {board.members.filter(m => m.role !== "Viewer").map(m =>
                    <option key={m.userId} value={m.userId}>{m.fullName} ({m.role})</option>
                  )}
                </select>
              </div>
              {/* Priority */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wide">Ưu tiên</label>
                <select value={editPriority} onChange={e => setEditPriority(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-100 dark:bg-white/[0.1] border border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-300 focus:outline-none focus:border-teal-400">
                  <option value="">Không</option>
                  <option value="Low">Thấp</option>
                  <option value="Medium">Trung bình</option>
                  <option value="High">Cao</option>
                  <option value="Urgent">Khẩn cấp</option>
                </select>
              </div>
              {/* Deadline */}
              <div className="space-y-1 col-span-2">
                <label className="text-[10px] text-slate-400 uppercase tracking-wide">Deadline</label>
                <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:border-teal-400 [color-scheme:light] dark:[color-scheme:dark]" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveEdit} disabled={updateTask.isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold disabled:opacity-50 transition-colors">
                {updateTask.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Lưu thay đổi
              </button>
              <button onClick={() => setEditMode(false)}
                className="px-3 py-2 rounded-lg text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                Hủy
              </button>
            </div>
          </motion.div>
        )}

        {/* Rejected reason */}
        {task.taskStatus === "In Progress" && rejectComment && (
          <div className="flex gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
            <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-rose-600 mb-0.5">Lý do từ chối trước đó:</p>
              <p className="text-xs text-rose-700 dark:text-rose-300">{rejectComment.content.replace("[TỪ CHỐI] ", "")}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.05]">
          {(["info", "comments", "history"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                tab === t ? "bg-white dark:bg-[#1a2e48] text-slate-800 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              {t === "info"
                ? <><FileCheck className="w-3.5 h-3.5" /> Thông tin</>
                : t === "comments"
                  ? <><MessageSquare className="w-3.5 h-3.5" /> Comment{task.comments.filter(c => !c.content.startsWith("[TỪ CHỐI]")).length > 0 && <span className="ml-1 px-1 rounded-full bg-teal-500 text-white text-[9px] font-bold">{task.comments.filter(c => !c.content.startsWith("[TỪ CHỐI]")).length}</span>}</>
                  : <><History className="w-3.5 h-3.5" /> Lịch sử</>}
            </button>
          ))}
        </div>

        {tab === "info" && (
          <div className="space-y-4">
            {/* Meta */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Assignee</p>
                {task.assignee
                  ? <div className="flex items-center gap-2"><Avatar name={task.assignee.fullName} url={task.assignee.avatarUrl} size="sm" /><span className="text-xs font-medium text-slate-700 dark:text-slate-200">{task.assignee.fullName}</span></div>
                  : <span className="text-xs text-slate-400">Chưa giao</span>}
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Deadline</p>
                {task.dueDate
                  ? <DueDateChip date={task.dueDate} />
                  : <span className="text-xs text-slate-400">Chưa đặt</span>}
              </div>
              {prio && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.1] border border-slate-100 dark:border-white/[0.06]">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Ưu tiên</p>
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", prio.bg, prio.text)}>{prio.label}</span>
                </div>
              )}
            </div>

            {/* Attachments — xem cho tất cả, xóa cho assignee/manager khi In Progress */}
            {task.attachments.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  File đính kèm ({task.attachments.length})
                </p>
                <div className="space-y-1.5">
                  {task.attachments.map(a => {
                    const canDelete = task.taskStatus === "In Progress"
                      && (isManager || (isAssignee && a.uploadedById === myUserId));
                    const ext = a.fileName.split(".").pop()?.toLowerCase() ?? "";
                    const isImg = ["jpg","jpeg","png","gif","webp","bmp"].includes(ext);
                    return (
                      <div key={a.attachmentId}
                        onClick={() => openFile(a.fileUrl, a.fileName)}
                        className={cn("flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors cursor-pointer",
                          a.isEvidence
                            ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                            : "bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.06]")}>
                        {isImg
                          ? <FileText className={cn("w-3.5 h-3.5 flex-shrink-0", a.isEvidence ? "text-amber-500" : "text-slate-400")} />
                          : <Paperclip className={cn("w-3.5 h-3.5 flex-shrink-0", a.isEvidence ? "text-amber-500" : "text-slate-400")} />}
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate flex-1">{a.fileName}</span>
                        {a.isEvidence && (
                          <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded-full flex-shrink-0">
                            File đính kèm
                          </span>
                        )}
                        {/* Nút xóa — chỉ assignee/manager khi In Progress */}
                        {canDelete && (
                          <button
                            title="Xóa file này"
                            disabled={deleteAttachment.isPending}
                            onClick={e => {
                              e.stopPropagation();
                              if (!confirm(`Xóa file "${a.fileName}"?`)) return;
                              deleteAttachment.mutate(
                                { taskId: task.taskId, attachmentId: a.attachmentId },
                                { onError: () => toast.error("Xóa file thất bại") }
                              );
                            }}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors flex-shrink-0 disabled:opacity-40">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── ACTION ZONE ─────────────────────────────────────── */}

            {/* Bước 2: Assignee bắt đầu */}
            {task.taskStatus === "Todo" && (isAssignee || isManager) && (
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">Task đang chờ bắt đầu. Nhấn bắt đầu để chuyển sang "Đang làm".</p>
                <button onClick={handleStart} disabled={startTask.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                  {startTask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                  Bắt đầu thực hiện
                </button>
              </div>
            )}

            {/* Bước 3: Assignee nộp minh chứng */}
            {task.taskStatus === "In Progress" && (isAssignee || isManager) && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 space-y-3">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Nộp minh chứng hoàn thành</p>

                {/* Toggle File / Text */}
                <div className="flex gap-1 p-1 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                  <button onClick={() => setSubmitMode("file")}
                    className={cn("flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all",
                      submitMode === "file" ? "bg-white dark:bg-[#1a2e48] text-amber-600 shadow-sm" : "text-amber-500 hover:text-amber-700")}>
                    <Upload className="w-3.5 h-3.5" /> Upload file
                  </button>
                  <button onClick={() => setSubmitMode("text")}
                    className={cn("flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all",
                      submitMode === "text" ? "bg-white dark:bg-[#1a2e48] text-amber-600 shadow-sm" : "text-amber-500 hover:text-amber-700")}>
                    <AlignLeft className="w-3.5 h-3.5" /> Mô tả bằng text
                  </button>
                </div>

                {submitMode === "file" ? (
                  <>
                    {/* Drop zone */}
                    <div
                      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn("flex flex-col items-center gap-2 py-5 rounded-xl border-2 border-dashed cursor-pointer transition-all",
                        dragOver ? "border-amber-400 bg-amber-100 dark:bg-amber-900/30" : "border-amber-200 dark:border-amber-700 hover:border-amber-400")}>
                      <Upload className={cn("w-6 h-6 transition-colors", dragOver ? "text-amber-500" : "text-amber-300 dark:text-amber-600")} />
                      <div className="text-center">
                        <p className="text-xs font-medium text-amber-600 dark:text-amber-500">Kéo thả hoặc click để chọn file</p>
                        <p className="text-[11px] text-amber-400">Nhiều file · Tối đa 20MB/file</p>
                      </div>
                    </div>
                    <input ref={fileInputRef} type="file" multiple className="hidden"
                      onChange={e => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }} />

                    {/* Danh sách file đã chọn */}
                    {files.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">{files.length} file đã chọn:</p>
                        {files.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
                            <Paperclip className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                            <span className="text-xs text-amber-700 dark:text-amber-300 truncate flex-1">{f.name}</span>
                            <span className="text-[10px] text-amber-500 flex-shrink-0">{(f.size/1024/1024).toFixed(1)}MB</span>
                            <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                              className="text-amber-400 hover:text-rose-500 transition-colors flex-shrink-0">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <button onClick={handleSubmit} disabled={files.length === 0 || submitTask.isPending}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                      {submitTask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {files.length > 0 ? `Gửi ${files.length} file & Gửi duyệt` : "Gửi file & Gửi duyệt"}
                    </button>
                  </>
                ) : (
                  <>
                    <textarea value={submitText} onChange={e => setSubmitText(e.target.value)} rows={4}
                      placeholder="Mô tả chi tiết công việc đã hoàn thành..."
                      className="w-full px-3 py-2.5 text-sm rounded-xl bg-white dark:bg-white/[0.05] border border-amber-200 dark:border-amber-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 resize-none" />
                    <button onClick={handleSubmitText} disabled={!submitText.trim() || submitTask.isPending}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                      {submitTask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlignLeft className="w-4 h-4" />}
                      Gửi mô tả & Gửi duyệt
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Bước 3: Pending — thông báo chờ */}
            {task.taskStatus === "Pending" && !isManager && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-300">File đã được gửi. Đang chờ Manager phê duyệt...</p>
              </div>
            )}

            {/* Bước 4: Manager approve/reject */}
            {task.taskStatus === "Pending" && isManager && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] space-y-3">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Phê duyệt task</p>
                {!showRejectInput ? (
                  <div className="flex gap-2">
                    <button onClick={handleApprove} disabled={reviewTask.isPending}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                      {reviewTask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Phê duyệt
                    </button>
                    <button onClick={() => setShowRejectInput(true)} disabled={reviewTask.isPending}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                      <XCircle className="w-4 h-4" /> Từ chối
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-rose-500">Lý do từ chối *</label>
                    <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
                      placeholder="Nhập lý do từ chối cụ thể..."
                      className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-white/[0.05] border border-rose-200 dark:border-rose-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-rose-400 resize-none" />
                    <div className="flex gap-2">
                      <button onClick={handleReject} disabled={!rejectReason.trim() || reviewTask.isPending}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                        {reviewTask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        Xác nhận từ chối
                      </button>
                      <button onClick={() => { setShowRejectInput(false); setRejectReason(""); }}
                        className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">Hủy</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Completed */}
            {task.taskStatus === "Completed" && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <p className="text-sm text-emerald-700 dark:text-emerald-300">Task đã hoàn thành và được phê duyệt.</p>
              </div>
            )}
          </div>
        )}

        {tab === "comments" && (
          <div className="flex flex-col gap-3">
            {/* Comment list */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1
                            [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full
                            [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-white/10">
              {task.comments.filter(c => !c.content.startsWith("[TỪ CHỐI]")).length === 0
                ? <p className="text-sm text-slate-400 text-center py-6">Chưa có comment nào</p>
                : task.comments
                    .filter(c => !c.content.startsWith("[TỪ CHỐI]"))
                    .map(c => (
                      <div key={c.commentId} className="flex gap-2.5 group/comment">
                        <Avatar name={c.userName} url={c.userAvatar} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{c.userName}</span>
                            <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString("vi-VN")}</span>
                            {/* Nút xóa — chỉ người tạo hoặc Manager */}
                            {(c.userId === myUserId || isManager) && (
                              <button
                                onClick={() => {
                                  if (!confirm("Xóa comment này?")) return;
                                  deleteComment.mutate(
                                    { taskId: task.taskId, commentId: c.commentId },
                                    { onError: () => toast.error("Xóa comment thất bại") }
                                  );
                                }}
                                className="ml-auto opacity-0 group-hover/comment:opacity-100 p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed whitespace-pre-wrap">{renderComment(c.content)}</p>

                        </div>
                      </div>
                    ))
              }
              <div ref={commentEndRef} />
            </div>

            {/* Input comment + @mention */}
            <div className="pt-1 border-t border-slate-100 dark:border-white/[0.06] space-y-2">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={commentText}
                  onChange={e => handleCommentChange(e.target.value)}
                  onKeyDown={handleCommentKeyDown}
                  placeholder="Nhập comment... dùng @ để mention thành viên"
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 resize-none transition-colors" />

                {/* @mention dropdown */}
                <AnimatePresence>
                  {mentionOpen && mentionMembers.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.1 }}
                      className="absolute bottom-full left-0 mb-1 w-56 rounded-xl bg-white dark:bg-[#1a2540] border border-slate-200 dark:border-white/[0.08] shadow-xl overflow-hidden z-50">
                      {mentionMembers.map((m, i) => (
                        <button key={m.userId} type="button"
                          onMouseDown={e => { e.preventDefault(); insertMention(m.fullName); }}
                          className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                            i === mentionCursor
                              ? "bg-teal-50 dark:bg-teal-500/10"
                              : "hover:bg-slate-50 dark:hover:bg-white/[0.04]")}>
                          <Avatar name={m.fullName} url={m.avatarUrl} size="xs" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{m.fullName}</p>
                            <p className="text-[10px] text-slate-400 truncate">{m.role}</p>
                          </div>
                        </button>
                      ))}
                      <p className="text-[9px] text-slate-400 px-3 py-1 border-t border-slate-100 dark:border-white/[0.05]">↑↓ chọn · Enter xác nhận · Esc đóng</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-2">
                <p className="text-[10px] text-slate-400 flex-1">Enter gửi · Shift+Enter xuống dòng · @ mention</p>
                <button
                  onClick={handleSendComment}
                  disabled={!commentText.trim() || addComment.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white text-xs font-semibold transition-colors">
                  {addComment.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Gửi
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-2">
            {task.activityLogs.length === 0
              ? <p className="text-sm text-slate-400 text-center py-6">Chưa có lịch sử hoạt động</p>
              : task.activityLogs.map(log => {
                  const actionLabel: Record<string, string> = {
                    CREATE: "Tạo task", ASSIGN: "Cập nhật task",
                    STATUS_CHANGE: "Đổi trạng thái", SUBMIT: "Gửi đính kèm",
                    APPROVE: "Phê duyệt", REJECT: "Từ chối",
                  };
                  return (
                    <div key={log.logId} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05]">
                      <Avatar name={log.userName} url={log.userAvatar} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{log.userName}</span>
                          <span className="text-xs text-slate-500">{actionLabel[log.actionType] ?? log.actionType}</span>
                          {log.newStatus && (
                            <StatusBadge status={log.newStatus as TaskStatus} />
                          )}
                        </div>
                        {log.note && <p className="text-xs text-slate-400 mt-0.5 truncate">{log.note}</p>}
                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date(log.createdAt).toLocaleString("vi-VN")}</p>
                      </div>
                    </div>
                  );
                })}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════
// EDIT TASK MODAL — Manager only
// ════════════════════════════════════════════════════════════════════
function EditTaskModal({ task, board, projectId, onClose }: {
  task: BoardTask; board: BoardData; projectId: string; onClose: () => void;
}) {
  const [title,    setTitle]    = useState(task.title);
  const [desc,     setDesc]     = useState(task.description ?? "");
  const [dueDate,  setDueDate]  = useState(task.dueDate ? task.dueDate.split("T")[0] : "");
  const [priority, setPriority] = useState(task.priority ?? "");
  const [assignee, setAssignee] = useState(task.assigneeId ?? "");
  const updateTask = useUpdateTask(projectId);

  const submit = () => {
    if (!title.trim()) return;
    updateTask.mutate({ taskId: task.taskId, payload: {
      title:        title.trim(),
      description:  desc.trim() || undefined,
      priority:     (priority || undefined) as any,
      dueDate:      dueDate || undefined,
      assigneeId:   assignee || undefined,
      clearAssignee: !assignee,
    }}, {
      onSuccess: () => { toast.success("Đã cập nhật task"); onClose(); },
      onError:   () => toast.error("Cập nhật thất bại"),
    });
  };

  return (
    <Modal title="Chỉnh sửa task" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Tên task *</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-400 transition-colors" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Mô tả</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
            className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-400 transition-colors resize-none" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Deadline</label>
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full pl-7 pr-2 py-2 text-xs rounded-lg bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:border-teal-400 transition-colors [color-scheme:light] dark:[color-scheme:dark]" />
            </div>
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Ưu tiên</label>
            <div className="relative">
              <Flag className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full appearance-none pl-7 pr-6 py-2 text-xs rounded-lg bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:border-teal-400 transition-colors cursor-pointer">
                <option value="">Không</option>
                <option value="Low">Thấp</option>
                <option value="Medium">Trung bình</option>
                <option value="High">Cao</option>
                <option value="Urgent">Khẩn cấp</option>
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Giao cho</label>
          <div className="relative">
            <select value={assignee} onChange={e => setAssignee(e.target.value)}
              className="w-full appearance-none px-3 pr-7 py-2 text-xs rounded-lg bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:border-teal-400 transition-colors cursor-pointer">
              <option value="">Chưa giao</option>
              {board.members.filter(m => m.role !== "Viewer").map(m => <option key={m.userId} value={m.userId}>{m.fullName} ({m.role})</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={submit} disabled={!title.trim() || updateTask.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
            {updateTask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
            Lưu thay đổi
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">Hủy</button>
        </div>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════
// TASK CARD
// ════════════════════════════════════════════════════════════════════
function TaskCard({ task, board, projectId}: {
  task: BoardTask; board: BoardData; projectId: string; firstColId: string;
}) {
  const { myRole, myUserId } = board;
  const [showDetail, setShowDetail] = useState(false);
  const [showEdit,   setShowEdit]   = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const deleteTask = useDeleteTask(projectId);

  const isManager  = myRole === "Manager";
  const isAssignee = task.assigneeId === myUserId;
  const canDelete  = isManager || (task.creatorId === myUserId && task.taskStatus === "Todo");

  const prio      = task.priority ? PRIORITY_CFG[task.priority] : null;
  const statusCfg = STATUS_CFG[task.taskStatus] ?? STATUS_CFG["Todo"];
  const evidence  = task.attachments.find(a => a.isEvidence);

  // Gợi ý hành động trên card
  const actionHint =
    task.taskStatus === "Todo"    && (isAssignee || isManager) ? "Nhấn để bắt đầu" :
    task.taskStatus === "In Progress" && (isAssignee || isManager) ? "Nhấn để đính kèm file" :
    task.taskStatus === "Pending" && isManager                ? "Nhấn để phê duyệt" : null;

  return (
    <>
      <div
        onClick={() => setShowDetail(true)}
        className={cn(
          "group relative rounded-xl border cursor-pointer transition-all duration-150 select-none mb-2.5",
          "bg-white dark:bg-[#131f35] shadow-sm hover:shadow-md hover:-translate-y-0.5",
          getCardRing(task.taskStatus),
          statusCfg.border,
        )}
      >
        <div className="px-3.5 py-3">
          {/* Top row: status + priority + menu */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <StatusBadge status={task.taskStatus} />
              {prio && <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", prio.bg, prio.text)}>{prio.label}</span>}
            </div>

            {(isManager || canDelete) && (
              <div className="relative z-20 flex-shrink-0" onClick={e => e.stopPropagation()}>
                <button onClick={() => setMenuOpen(v => !v)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-all">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -4 }} transition={{ duration: 0.1 }}
                        className="absolute right-0 top-6 z-50 w-40 rounded-xl bg-white dark:bg-[#1a2540] border border-slate-200 dark:border-white/[0.08] shadow-xl overflow-hidden">
                        {isManager && (
                          <button onClick={() => { setMenuOpen(false); setShowEdit(true); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-colors">
                            <Pencil className="w-3.5 h-3.5" /> Chỉnh sửa
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => {
                            setMenuOpen(false);
                            deleteTask.mutate(task.taskId, { onError: () => toast.error("Xóa thất bại") });
                          }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" /> Xóa task
                          </button>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Title */}
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-snug mb-2.5">{task.title}</p>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <DueDateChip date={task.dueDate} />
              {evidence && (
                <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">
                  <Paperclip className="w-2.5 h-2.5" /> 1 MC
                </span>
              )}
            </div>
            {task.assignee && <Avatar name={task.assignee.fullName} url={task.assignee.avatarUrl} size="xs" />}
          </div>

          {/* Action hint */}
          {actionHint && (
            <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-teal-600 dark:text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="w-1 h-1 rounded-full bg-teal-500 animate-pulse" />
              {actionHint}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showDetail && <TaskDetailModal task={task} board={board} projectId={projectId} onClose={() => setShowDetail(false)} />}
        {showEdit   && <EditTaskModal   task={task} board={board} projectId={projectId} onClose={() => setShowEdit(false)}   />}
      </AnimatePresence>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// ADD TASK FORM — Manager only, vào cột Todo
// ════════════════════════════════════════════════════════════════════
function AddTaskForm({ projectId, board, onClose }: {
  projectId: string; board: BoardData; onClose: () => void;
}) {
  const [title,        setTitle]        = useState("");
  const [desc,         setDesc]         = useState("");
  const [dueDate,      setDueDate]      = useState("");
  const [priority,     setPriority]     = useState("");
  const [assignee,     setAssignee]     = useState("");
  const [showWorkload, setShowWorkload] = useState(false);
  const createTask = useCreateTask(projectId);

  const submit = () => {
    if (!title.trim()) return;
    createTask.mutate({
      title:       title.trim(),
      description: desc.trim() || undefined,
      priority:    (priority || undefined) as any,
      dueDate:     dueDate || undefined,
      assigneeId:  assignee || undefined,
    }, {
      onSuccess: () => { toast.success("Đã tạo task"); onClose(); },
      onError:   () => toast.error("Tạo task thất bại"),
    });
  };

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden mt-2">
      <div className="p-3 rounded-xl bg-white dark:bg-[#0f1929] border border-teal-400/40 shadow-md space-y-2.5">
        <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }}
          placeholder="Tên task *"
          className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none border-b border-slate-100 dark:border-white/[0.06] pb-2" />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
          placeholder="Mô tả (tuỳ chọn)"
          className="w-full bg-transparent text-xs text-slate-600 dark:text-slate-400 placeholder:text-slate-300 focus:outline-none resize-none" />
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 focus:outline-none focus:border-teal-400 [color-scheme:light] dark:[color-scheme:dark]" />
          </div>
          <div className="relative">
            <Flag className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select value={priority} onChange={e => setPriority(e.target.value)}
              className="appearance-none pl-7 pr-6 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-[#1a2e48] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-400 cursor-pointer [color-scheme:light] dark:[color-scheme:dark]">
              <option value="">Ưu tiên</option>
              <option value="Low">Thấp</option>
              <option value="Medium">Trung bình</option>
              <option value="High">Cao</option>
              <option value="Urgent">Khẩn cấp</option>
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div className="relative">
          <select value={assignee} onChange={e => setAssignee(e.target.value)}
            className="w-full appearance-none px-3 pr-7 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-[#1a2e48] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-400 cursor-pointer [color-scheme:light] dark:[color-scheme:dark]">
            <option value="">Chưa giao cho ai</option>
            {board.members.filter(m => m.role !== "Viewer").map(m => <option key={m.userId} value={m.userId}>{m.fullName}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>

        {/* Workload Balancer toggle */}
        <button type="button"
          onClick={() => setShowWorkload(v => !v)}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-teal-600 dark:text-teal-400
                     hover:text-teal-700 dark:hover:text-teal-300 transition-colors">
          <span className="text-[10px]"></span>
          {showWorkload ? "Ẩn gợi ý " : "Gợi ý phân công "}
        </button>

        {/* Workload Panel */}
        <AnimatePresence>
          {showWorkload && (
            <WorkloadPanel
              board={board}
              selectedUserId={assignee}
              onSelectUser={setAssignee}
            />
          )}
        </AnimatePresence>

        <div className="flex gap-2 pt-0.5">
          <button onClick={submit} disabled={!title.trim() || createTask.isPending}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold disabled:opacity-50 transition-colors">
            {createTask.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Thêm
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════
// KANBAN COLUMN
// ════════════════════════════════════════════════════════════════════
function KanbanColumn({ col, board, projectId, colIndex, firstColId }: {
  col: BoardColumn;
  board: BoardData; projectId: string; colIndex: number; firstColId: string;
}) {
  const [addingTask, setAddingTask] = useState(false);
  const isManager  = board.myRole === "Manager";
  const isTodoCol  = col.position === 1;
  const dotCls     = COL_DOTS[colIndex % COL_DOTS.length];

  // Stats per column
  const pendingCount = col.tasks.filter(t => t.taskStatus === "Pending").length;

  return (
    <div className="flex-shrink-0 w-[280px] flex flex-col rounded-2xl max-h-full bg-white dark:bg-[#162032] border-2 border-teal-100 dark:border-white/[0.10] shadow-sm dark:shadow-none">
      {/* Header */}
      <div className={cn(
        "flex items-center gap-2.5 px-4 py-3.5 flex-shrink-0 rounded-t-2xl border-b-2",
        colIndex === 0 && "bg-slate-100 dark:bg-white/[0.05] border-slate-200 dark:border-white/[0.08]",
        colIndex === 1 && "bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20",
        colIndex === 2 && "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20",
        colIndex === 3 && "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20",
      )}>
        <div className={cn("w-3 h-3 rounded-full flex-shrink-0 shadow-sm", dotCls)} />
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 flex-1 truncate">{col.columnName}</span>
        {pendingCount > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white shadow-sm">{pendingCount} chờ</span>
        )}
        <span className={cn("min-w-[20px] text-center text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums",
          colIndex === 0 && "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300",
          colIndex === 1 && "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300",
          colIndex === 2 && "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300",
          colIndex === 3 && "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
        )}>
          {col.tasks.length}
        </span>
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5 min-h-[60px] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-white/10">
        <AnimatePresence mode="popLayout">
          {col.tasks
            .slice()
            .sort((a: BoardTask, b: BoardTask) => a.position - b.position)
            .map((task: BoardTask) => (
              <motion.div key={task.taskId}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}>
                <TaskCard task={task} board={board} projectId={projectId} firstColId={firstColId} />
              </motion.div>
            ))}
        </AnimatePresence>
      </div>

      {/* Add task — chỉ Manager ở cột Todo */}
      {isManager && isTodoCol && (
        <div className="px-3 pb-3 flex-shrink-0">
          <AnimatePresence mode="wait">
            {addingTask
              ? <AddTaskForm key="form" projectId={projectId} board={board} onClose={() => setAddingTask(false)} />
              : <motion.button key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  onClick={() => setAddingTask(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-500/10 border border-dashed border-slate-200 dark:border-white/[0.06] hover:border-teal-300 dark:hover:border-teal-500/30 transition-all">
                  <Plus className="w-3.5 h-3.5" /> Thêm task
                </motion.button>}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// KANBAN BOARD PAGE
// ════════════════════════════════════════════════════════════════════
export default function KanbanBoardPage() {
  const { projectId }                       = useParams<{ projectId: string }>();
  const { data: board, isLoading, isError } = useBoard(projectId!);
  const [filterMine, setFilterMine]         = useState(false);

  if (isLoading) return (
    <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-[#0b1120]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
        <p className="text-sm text-slate-400">Đang tải board...</p>
      </div>
    </div>
  );

  if (isError || !board) return (
    <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-[#0b1120]">
      <div className="flex flex-col items-center gap-3">
        <AlertCircle className="w-10 h-10 text-rose-400" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Không thể tải board</p>
      </div>
    </div>
  );

  const sortedCols = board.columns.slice().sort((a: BoardColumn, b: BoardColumn) => a.position - b.position);
  const firstColId = sortedCols[0]?.columnId ?? "";

  const displayCols: BoardColumn[] = filterMine && board.myRole !== "Manager"
    ? sortedCols.map((col: BoardColumn) => ({
        ...col,
        tasks: col.tasks.filter(t =>
          t.assigneeId === board.myUserId || t.creatorId === board.myUserId
        ),
      }))
    : sortedCols;

  const totalTasks   = board.columns.reduce((s, c) => s + c.tasks.length, 0);
  const pendingCount = board.columns.reduce((s, c) => s + c.tasks.filter(t => t.taskStatus === "Pending").length, 0);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0f172a] overflow-hidden">
      <ToastContainer />

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 border-b border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-[#0b1120]">
        <div className="min-w-0">
          <h1 className="text-base font-bold text-slate-800 dark:text-white truncate">{board.projectName}</h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <RoleBadge role={board.myRole} />
            <span className="text-[11px] text-slate-400">
              {totalTasks} tasks
              {pendingCount > 0 && <span className="ml-1 text-amber-500 font-semibold">· {pendingCount} chờ duyệt</span>}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {board.myRole !== "Manager" && (
            <button onClick={() => setFilterMine(v => !v)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                filterMine ? "bg-teal-500 text-white" : "bg-slate-100 dark:bg-white/[0.07] text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10")}>
              <Shield className="w-3.5 h-3.5" /> Task của tôi
            </button>
          )}
          <div className="flex -space-x-1.5">
            {board.members.slice(0, 6).map(m => (
              <div key={m.userId} title={`${m.fullName} (${m.role})`} className="ring-2 ring-white dark:ring-[#0b1120] rounded-full">
                <Avatar name={m.fullName} url={m.avatarUrl} size="sm" />
              </div>
            ))}
            {board.members.length > 6 && (
              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[9px] font-bold text-slate-500 ring-2 ring-white dark:ring-[#0b1120]">
                +{board.members.length - 6}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0 bg-[#f0fdfa] dark:bg-[#0b1120]">
        <div className="flex gap-4 p-6 h-full items-start min-w-max">
          <AnimatePresence mode="popLayout">
            {displayCols.map((col, i) => (
              <motion.div key={col.columnId}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.04 }} className="h-full">
                <KanbanColumn
                  col={col}
                  board={board}
                  projectId={projectId!}
                  colIndex={i}
                  firstColId={firstColId}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}