import { useState, useRef, useEffect, useCallback } from "react";
import { useParams }       from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as signalR        from "@microsoft/signalr";
import {
  HardDrive, Upload, Trash2, Download, Search,
  Loader2, AlertCircle, FileText, FileImage,
  FileSpreadsheet, Film, Archive, File,
  X, Filter, CheckCircle2,
} from "lucide-react";
import { cn }              from "@/lib/utils";
import { storageApi, type ProjectFileItem } from "@/api/storageApi";
import { useAuthStore }    from "@/store/authStore";

// ─── Constants ────────────────────────────────────────────────────────
const HUB_URL = (import.meta.env.VITE_API_URL as string ?? "https://localhost:7004/api")
  .replace("/api", "") + "/hubs/board";

const DOCS_EXTS = [".doc",".docx",".xls",".xlsx",".ppt",".pptx"];

const FILE_TYPE_CFG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  image:      { icon: FileImage,       color: "text-violet-500", bg: "bg-violet-500/10", label: "Ảnh"       },
  pdf:        { icon: FileText,        color: "text-rose-500",   bg: "bg-rose-500/10",   label: "PDF"       },
  word:       { icon: FileText,        color: "text-blue-500",   bg: "bg-blue-500/10",   label: "Word"      },
  excel:      { icon: FileSpreadsheet, color: "text-emerald-500",bg: "bg-emerald-500/10",label: "Excel"     },
  powerpoint: { icon: FileText,        color: "text-orange-500", bg: "bg-orange-500/10", label: "PPT"       },
  video:      { icon: Film,            color: "text-pink-500",   bg: "bg-pink-500/10",   label: "Video"     },
  archive:    { icon: Archive,         color: "text-amber-500",  bg: "bg-amber-500/10",  label: "Nén"       },
  other:      { icon: File,            color: "text-slate-400",  bg: "bg-slate-500/10",  label: "Khác"      },
};

const FILTER_TYPES = [
  { key: "all",   label: "Tất cả"  },
  { key: "image", label: "Ảnh"     },
  { key: "pdf",   label: "PDF"     },
  { key: "word",  label: "Word"    },
  { key: "excel", label: "Excel"   },
  { key: "other", label: "Khác"    },
];

// ─── Helpers ─────────────────────────────────────────────────────────
function formatSize(bytes: number) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 ** 2)   return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3)   return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function openFile(url: string, name: string) {
  const ext = "." + name.split(".").pop()?.toLowerCase();
  if (DOCS_EXTS.includes(ext)) {
    window.open(`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`, "_blank");
  } else {
    window.open(url, "_blank");
  }
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} alt={name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />;
  return (
    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: "success"|"error" }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-xl border",
        type === "success"
          ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
          : "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800")}>
      {type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {msg}
    </motion.div>
  );
}

// ─── Preview Modal ────────────────────────────────────────────────────
function PreviewModal({ file, onClose }: { file: ProjectFileItem; onClose: () => void }) {
  const isImage       = file.fileType === "image";
  const isPDF         = file.fileType === "pdf";
  const isDoc   = DOCS_EXTS.includes("." + (file.fileName.split(".").pop() ?? "").toLowerCase());
  const [iframeReady, setIframeReady] = useState(false);
  const [iframeKey,   setIframeKey]   = useState(0); // reset iframe nếu cần

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[85vh] rounded-2xl bg-white dark:bg-[#131f35] border border-slate-200 dark:border-white/[0.08] shadow-2xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/[0.06] flex-shrink-0">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{file.fileName}</p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a href={file.fileUrl} download={file.fileName} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-600 text-white transition-colors">
              <Download className="w-3.5 h-3.5" /> Tải xuống
            </a>
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-50 dark:bg-[#0d1525] p-4">
          {isImage && (
            <img src={file.fileUrl} alt={file.fileName}
              className="max-w-full max-h-full rounded-xl object-contain" />
          )}
          {isPDF && (
            <div className="relative w-full h-[60vh]">
              {/* Loading skeleton */}
              {!iframeReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-100 dark:bg-[#0d1525] rounded-xl">
                  <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
                  <p className="text-xs text-slate-400">Đang tải PDF...</p>
                  <button
                    onClick={() => window.open(file.fileUrl, "_blank", "noopener,noreferrer")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-500 hover:bg-teal-600 text-white transition-colors mt-1">
                    <Download className="w-3.5 h-3.5" /> Mở trực tiếp
                  </button>
                </div>
              )}
              <iframe
                key={iframeKey}
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(file.fileUrl)}&embedded=true`}
                title={file.fileName}
                onLoad={() => setIframeReady(true)}
                className={cn(
                  "w-full h-full rounded-xl border-0 bg-white transition-opacity duration-300",
                  iframeReady ? "opacity-100" : "opacity-0"
                )}
              />
              {/* Nút reload nếu iframe trắng sau 8 giây */}
              {iframeReady && (
                <button
                  onClick={() => { setIframeReady(false); setIframeKey(k => k + 1); }}
                  className="absolute top-2 right-2 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/80 dark:bg-slate-800/80 text-slate-500 hover:text-teal-600 border border-slate-200 dark:border-white/10 backdrop-blur-sm transition-colors">
                  Tải lại
                </button>
              )}
            </div>
          )}
          {isDoc && (
            <iframe
              src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(file.fileUrl)}`}
              title={file.fileName}
              className="w-full h-[60vh] rounded-xl border-0" />
          )}
          {!isImage && !isPDF && !isDoc && (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/10 flex items-center justify-center">
                <File className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Không thể xem trước loại file này</p>
              <a href={file.fileUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold transition-colors">
                <Download className="w-4 h-4" /> Mở file
              </a>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── File Card ────────────────────────────────────────────────────────
function FileCard({ file, onPreview, onDelete }: {
  file:      ProjectFileItem;
  onPreview: (f: ProjectFileItem) => void;
  onDelete:  (f: ProjectFileItem) => void;
}) {
  const cfg = FILE_TYPE_CFG[file.fileType] ?? FILE_TYPE_CFG.other;
  const Icon = cfg.icon;

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group bg-white dark:bg-[#131f35] rounded-2xl border border-slate-200 dark:border-white/[0.07] hover:border-teal-300 dark:hover:border-teal-500/30 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
      onClick={() => onPreview(file)}>

      {/* Preview thumbnail nếu là ảnh */}
      {file.fileType === "image" ? (
        <div className="h-32 overflow-hidden bg-slate-100 dark:bg-white/[0.04]">
          <img src={file.fileUrl} alt={file.fileName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      ) : (
        <div className={cn("h-32 flex items-center justify-center", cfg.bg)}>
          <Icon className={cn("w-12 h-12", cfg.color)} />
        </div>
      )}

      {/* Info */}
      <div className="p-3">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate mb-1">
          {file.fileName}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400">{formatSize(file.fileSize)}</span>
          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", cfg.bg, cfg.color)}>
            {cfg.label}
          </span>
        </div>

        {/* Uploader + time */}
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-50 dark:border-white/[0.04]">
          <Avatar name={file.uploaderName} url={file.uploaderAvatar} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{file.uploaderName}</p>
            <p className="text-[10px] text-slate-400">
              {new Date(file.createdAt).toLocaleString("vi-VN", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" })}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={e => e.stopPropagation()}>
            <a href={file.fileUrl} download={file.fileName} target="_blank" rel="noreferrer"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors"
              title="Tải xuống">
              <Download className="w-3.5 h-3.5" />
            </a>
            {file.canDelete && (
              <button
                onClick={() => onDelete(file)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                title="Xóa file">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Upload Zone ──────────────────────────────────────────────────────
function UploadZone({ onUpload, uploading }: {
  onUpload:  (files: FileList) => void;
  uploading: boolean;
}) {
  const [drag, setDrag] = useState(false);
  const inputRef        = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={e  => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) onUpload(e.dataTransfer.files); }}
      onClick={() => !uploading && inputRef.current?.click()}
      className={cn(
        "flex flex-col items-center gap-3 py-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200",
        drag
          ? "border-teal-400 bg-teal-50/60 dark:bg-teal-500/10"
          : "border-slate-200 dark:border-white/[0.08] hover:border-teal-300 dark:hover:border-teal-500/30 hover:bg-teal-50/30 dark:hover:bg-teal-500/5"
      )}>
      {uploading
        ? <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
        : <Upload className={cn("w-8 h-8 transition-colors", drag ? "text-teal-500" : "text-slate-300 dark:text-slate-600")} />}
      <div className="text-center">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {uploading ? "Đang tải lên..." : "Kéo thả hoặc click để chọn file"}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">Tối đa 50MB · Mọi định dạng</p>
      </div>
      <input ref={inputRef} type="file" multiple className="hidden"
        onChange={e => { if (e.target.files?.length) onUpload(e.target.files); e.target.value = ""; }} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function StoragePage() {
  const { projectId }   = useParams<{ projectId: string }>();
  const qc              = useQueryClient();
  const accessToken     = useAuthStore(s => s.accessToken);

  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all");
  const [preview,  setPreview]  = useState<ProjectFileItem | null>(null);
  const [toast,    setToast]    = useState<{ msg: string; type: "success"|"error" } | null>(null);
  const [uploading, setUploading] = useState(false);

  const QUERY_KEY = ["project-files", projectId];

  const showToast = useCallback((msg: string, type: "success"|"error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Fetch files ──
  const { data: files = [], isLoading, isError } = useQuery({
    queryKey: QUERY_KEY,
    queryFn:  () => storageApi.getFiles(projectId!),
    enabled:  !!projectId,
  });

  // ── Upload mutation ──
  const uploadMutation = useMutation({
    mutationFn: (file: File) => storageApi.uploadFile(projectId!, file),
    onSuccess: (newFile) => {
      qc.setQueryData<ProjectFileItem[]>(QUERY_KEY, old =>
        old ? [newFile, ...old] : [newFile]
      );
    },
    onError: (err: any) => showToast(err.message || "Upload thất bại", "error"),
  });

  // ── Delete mutation ──
  const deleteMutation = useMutation({
    mutationFn: (fileId: string) => storageApi.deleteFile(projectId!, fileId),
    onMutate: async (fileId) => {
      const prev = qc.getQueryData<ProjectFileItem[]>(QUERY_KEY);
      qc.setQueryData<ProjectFileItem[]>(QUERY_KEY, old => old?.filter(f => f.fileId !== fileId) ?? []);
      return { prev };
    },
    onError: (_e, _id, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(QUERY_KEY, ctx.prev);
      showToast("Xóa thất bại", "error");
    },
    onSuccess: () => showToast("Đã xóa file", "success"),
  });

  // ── Realtime SignalR ──
  useEffect(() => {
    if (!accessToken || !projectId) return;
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, { accessTokenFactory: () => accessToken })
      .withAutomaticReconnect([0, 2000, 5000])
      .configureLogging(signalR.LogLevel.None)
      .build();

    conn.on("FileUploaded", (file: ProjectFileItem) => {
      qc.setQueryData<ProjectFileItem[]>(QUERY_KEY, old => {
        if (!old || old.some(f => f.fileId === file.fileId)) return old;
        return [file, ...old];
      });
    });

    conn.on("FileDeleted", (fileId: string) => {
      qc.setQueryData<ProjectFileItem[]>(QUERY_KEY, old =>
        old?.filter(f => f.fileId !== fileId) ?? []
      );
    });

    conn.start()
      .then(() => conn.invoke("JoinProject", projectId))
      .catch(err => console.warn("[StorageHub]", err));

    return () => {
      conn.invoke("LeaveProject", projectId).catch(() => {});
      conn.stop();
    };
  }, [accessToken, projectId, qc]);

  // ── Upload handler (nhiều file) ──
  const handleUpload = async (fileList: FileList) => {
    setUploading(true);
    const arr = Array.from(fileList);
    let ok = 0;
    for (const f of arr) {
      try {
        await uploadMutation.mutateAsync(f);
        ok++;
      } catch { /* error handled in mutation */ }
    }
    setUploading(false);
    if (ok > 0) showToast(`Đã tải lên ${ok} file`, "success");
  };

  const handleDelete = (file: ProjectFileItem) => {
    if (!confirm(`Xóa file "${file.fileName}"?`)) return;
    deleteMutation.mutate(file.fileId);
  };

  // ── Filter + search ──
  const filtered = files.filter(f => {
    const matchSearch = f.fileName.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || f.fileType === filter ||
      (filter === "other" && !["image","pdf","word","excel","powerpoint","video","archive"].includes(f.fileType));
    return matchSearch && matchFilter;
  });

  // ── Stats ──
  const totalSize = files.reduce((s, f) => s + f.fileSize, 0);

  return (
    <div className="h-full flex flex-col bg-[#f0fdfa] dark:bg-[#0b1120] overflow-hidden">

      {/* Toast */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
        <AnimatePresence>
          {toast && <Toast msg={toast.msg} type={toast.type} />}
        </AnimatePresence>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-[#0b1120] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <HardDrive className="w-5 h-5 text-teal-500" />
          <h1 className="text-base font-bold text-slate-800 dark:text-white">Kho tài liệu</h1>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400">
            {files.length} file
          </span>
        </div>
        <span className="text-xs text-slate-400">{formatSize(totalSize)} đã dùng</span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5
                      [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full
                      [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-white/10">

        {/* Upload zone */}
        <UploadZone onUpload={handleUpload} uploading={uploading} />

        {/* Search + filter */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm tên file..."
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-white dark:bg-[#131f35] border border-slate-200 dark:border-white/[0.07] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 transition-colors" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {FILTER_TYPES.map(ft => (
              <button key={ft.key} onClick={() => setFilter(ft.key)}
                className={cn("px-3 py-2 text-xs font-semibold rounded-xl border transition-all",
                  filter === ft.key
                    ? "bg-teal-500 border-teal-500 text-white"
                    : "border-slate-200 dark:border-white/[0.08] text-slate-500 hover:border-teal-300")}>
                {ft.label}
              </button>
            ))}
          </div>
        </div>

        {/* File grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <AlertCircle className="w-6 h-6 text-rose-400" />
            <p className="text-sm text-slate-500">Không thể tải danh sách file</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <HardDrive className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-400">
              {search || filter !== "all" ? "Không tìm thấy file nào" : "Chưa có file nào được tải lên"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map(f => (
                <FileCard key={f.fileId} file={f}
                  onPreview={setPreview}
                  onDelete={handleDelete} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Preview modal */}
      <AnimatePresence>
        {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} />}
      </AnimatePresence>
    </div>
  );
}