import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate }        from "react-router-dom";
import { Sun, Moon, Bell, Search, X, CheckCheck, Trash2,
         ListTodo, FolderKanban, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient }     from "@tanstack/react-query";
import { Button }             from "@/components/ui/Button";
import { useAuthStore }       from "@/store/authStore";
import { useThemeStore }      from "@/store/themeStore";
import { useNotifications, useMarkRead, useMarkAllRead } from "@/hooks/useNotification";
import { notifKeys }          from "@/hooks/useNotification";
import { notificationApi }    from "@/api/notificationApi";
import axiosClient            from "@/api/axiosClient";
import { cn }                 from "@/lib/utils";


// ─── Search API ───────────────────────────────────────────────────────
interface SearchResult {
  tasks:    { taskId: string; title: string; taskStatus: string; priority: string | null; projectId: string }[];
  projects: { projectId: string; projectName: string }[];
}

async function searchAll(q: string): Promise<SearchResult> {
  return axiosClient.get(`/user/search-all?q=${encodeURIComponent(q)}`) as unknown as Promise<SearchResult>;
}

const STATUS_DOT: Record<string, string> = {
  "Todo":        "bg-slate-400",
  "In Progress": "bg-blue-500",
  "Pending":     "bg-amber-500",
  "Completed":   "bg-emerald-500",
  "Rejected":    "bg-rose-500",
};

// ─── Search Dropdown ──────────────────────────────────────────────────
function SearchBox() {
  const navigate   = useNavigate();
  const [query, setQuery]       = useState("");
  const [open,  setOpen]        = useState(false);
  const [result, setResult]     = useState<SearchResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);
  const boxRef    = useRef<HTMLDivElement>(null);
  const debounce  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback((q: string) => {
    if (q.trim().length < 2) { setResult(null); return; }
    setLoading(true);
    searchAll(q.trim())
      .then(setResult)
      .catch(() => setResult(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => doSearch(query), 300);
  }, [query, doSearch]);

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const hasResult = result && (result.tasks.length > 0 || result.projects.length > 0);
  const isEmpty   = result && !hasResult && query.trim().length >= 2 && !loading;

  const go = (path: string) => {
    navigate(path);
    setOpen(false);
    setQuery("");
    setResult(null);
  };

  return (
    <div ref={boxRef} className="relative hidden md:block">
      {/* Trigger */}
      <div onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className={cn(
          "flex items-center gap-2 h-9 px-3 rounded-xl text-sm cursor-pointer transition-all duration-150",
          "bg-slate-100 dark:bg-white/5 border",
          open
            ? "border-teal-400 dark:border-teal-500/60 w-64"
            : "border-slate-200/70 dark:border-white/[0.08] hover:border-teal-300 dark:hover:border-teal-500/40 w-44"
        )}>
        {loading
          ? <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin flex-shrink-0" />
          : <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
        <input ref={inputRef}
          value={query} onChange={e => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Tìm kiếm..."
          className="bg-transparent text-xs text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none flex-1 min-w-0" />
        {query
          ? <button onClick={e => { e.stopPropagation(); setQuery(""); setResult(null); }}
              className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          : <kbd className="text-[10px] bg-slate-200 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono text-slate-400 flex-shrink-0">
              ⌘K
            </kbd>}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (hasResult || isEmpty || (query.length >= 2 && loading)) && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 w-80 rounded-2xl bg-white dark:bg-[#131f35] border border-slate-200 dark:border-white/[0.08] shadow-2xl z-[99999] overflow-hidden">

            {loading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
              </div>
            )}

            {isEmpty && (
              <p className="text-xs text-slate-400 text-center py-6">Không tìm thấy kết quả</p>
            )}

            {hasResult && !loading && (
              <div className="py-2 max-h-80 overflow-y-auto
                [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full
                [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-white/10">

                {result!.projects.length > 0 && (
                  <>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-4 py-1.5">Dự án</p>
                    {result!.projects.map(p => (
                      <button key={p.projectId} onClick={() => go(`/projects/${p.projectId}/board`)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors text-left">
                        <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                          <FolderKanban className="w-3.5 h-3.5 text-teal-500" />
                        </div>
                        <span className="text-sm text-slate-700 dark:text-slate-200 truncate">{p.projectName}</span>
                      </button>
                    ))}
                  </>
                )}

                {result!.tasks.length > 0 && (
                  <>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-4 py-1.5 mt-1">Task</p>
                    {result!.tasks.map(t => (
                      <button key={t.taskId} onClick={() => go(`/projects/${t.projectId}/board`)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors text-left">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                          <ListTodo className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700 dark:text-slate-200 truncate">{t.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", STATUS_DOT[t.taskStatus] ?? "bg-slate-400")} />
                            <span className="text-[10px] text-slate-400">{t.taskStatus}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Notification Dropdown ────────────────────────────────────────────
function NotifDropdown() {
  const navigate  = useNavigate();
  const qc        = useQueryClient();
  const [open, setOpen]     = useState(false);
  const [pos, setPos]       = useState({ top: 0, right: 0 });
  const btnRef              = useRef<HTMLDivElement>(null);
  const dropRef             = useRef<HTMLDivElement>(null);
  const { data }            = useNotifications();
  const markRead            = useMarkRead();
  const markAll             = useMarkAllRead();
  const unread              = data?.unreadCount ?? 0;
  const items               = data?.items ?? [];

  // Tính vị trí dropdown dựa theo button
  const calcPos = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({
      top:   rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
  };

  const handleOpen = () => {
    calcPos();
    setOpen(v => !v);
  };

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        dropRef.current && !dropRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClick = (item: typeof items[0]) => {
    if (!item.isRead) markRead.mutate(item.notificationId);
    if (item.linkUrl) navigate(item.linkUrl);
    setOpen(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await notificationApi.deleteOne(id);
    qc.invalidateQueries({ queryKey: notifKeys.summary });
  };

  const dropdown = (
    <AnimatePresence>
      {open && (
        <motion.div ref={dropRef}
          initial={{ opacity: 0, y: 8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.97 }}
          transition={{ duration: 0.16 }}
          style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 99999 }}
          className="w-80 rounded-2xl bg-white dark:bg-[#131f35] border border-slate-200 dark:border-white/[0.08] shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800 dark:text-white">Thông báo</span>
                {unread > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white">{unread}</span>
                )}
              </div>
              {unread > 0 && (
                <button onClick={() => markAll.mutate()}
                  className="flex items-center gap-1 text-[11px] text-teal-600 dark:text-teal-400 hover:underline font-medium">
                  <CheckCheck className="w-3.5 h-3.5" /> Đọc tất cả
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto
              [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full
              [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-white/10">
              {items.length === 0
                ? <p className="text-xs text-slate-400 text-center py-8">Chưa có thông báo nào</p>
                : items.map(item => (
                    <div key={item.notificationId}
                      onClick={() => handleClick(item)}
                      className={cn(
                        "group flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-slate-50 dark:border-white/[0.03] last:border-0",
                        item.isRead
                          ? "hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                          : "bg-teal-50/60 dark:bg-teal-500/[0.07] hover:bg-teal-50 dark:hover:bg-teal-500/10"
                      )}>
                      {/* Avatar sender */}
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                        {item.senderName?.[0]?.toUpperCase() ?? "S"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-semibold leading-snug",
                          item.isRead ? "text-slate-600 dark:text-slate-300" : "text-slate-800 dark:text-white")}>
                          {item.title}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{item.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(item.createdAt).toLocaleString("vi-VN")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        {!item.isRead && (
                          <span className="w-2 h-2 rounded-full bg-teal-500 mt-1" />
                        )}
                        <button
                          onClick={e => handleDelete(e, item.notificationId)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-300 hover:text-rose-400 transition-all">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
              }
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-white/[0.06]">
              <button onClick={() => { navigate("/inbox"); setOpen(false); }}
                className="w-full text-center text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium py-0.5">
                Xem tất cả thông báo →
              </button>
            </div>
          </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div ref={btnRef} className="relative">
      <Button variant="outline" size="icon"
        onClick={handleOpen}
        className={cn("relative", open && "border-teal-400 text-teal-500")}>
        <Bell className="w-4 h-4" />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span key="badge"
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5">
              {unread > 9 ? "9+" : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
      {createPortal(dropdown, document.body)}
    </div>
  );
}


// ─── Notification Toast (popup góc màn hình) ─────────────────────────
interface ToastNotif { id: string; title: string; message: string; }

let _setNotifToasts: React.Dispatch<React.SetStateAction<ToastNotif[]>> | null = null;

export function pushNotifToast(notif: ToastNotif) {
  _setNotifToasts?.(prev => {
    setTimeout(() => {
      _setNotifToasts?.(p => p.filter(t => t.id !== notif.id));
    }, 4500);
    return [...prev.slice(-2), notif]; // tối đa 3 toast
  });
}

function NotificationToastContainer() {
  const [toasts, setToasts] = useState<ToastNotif[]>([]);
  useState(() => { _setNotifToasts = setToasts; });

  return (
    <div className="fixed top-20 right-4 z-[99999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id}
            initial={{ opacity: 0, x: 48, scale: 0.95 }}
            animate={{ opacity: 1, x: 0,  scale: 1 }}
            exit={{ opacity: 0, x: 48, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl
              bg-white dark:bg-[#131f35] border border-slate-200 dark:border-teal-900/40
              shadow-2xl max-w-[300px]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600
              flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
              <Bell className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-white leading-snug">{t.title}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{t.message}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Header ──────────────────────────────────────────────────────
export default function Header() {
  const { isDark, toggle } = useThemeStore();
  const { user }           = useAuthStore();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Chào buổi sáng";
    if (h < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  };

  return (
    <>
    <NotificationToastContainer />
    <header className="relative h-16 flex-shrink-0 flex items-center justify-between px-6
      border-b border-slate-200/60 dark:border-white/[0.06]
      bg-white/80 dark:bg-[#0d1525]/80 backdrop-blur-md
      transition-colors duration-500">

      {/* Left: greeting */}
      <div>
        <p className="text-[13px] text-slate-400 dark:text-slate-500">{greeting()},</p>
        <h1 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
          {user?.fullName ?? "Người dùng"} 👋
        </h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <SearchBox />
        <NotifDropdown />
        <Button variant="outline" size="icon" onClick={toggle} aria-label="Toggle theme">
          <AnimatePresence mode="wait">
            {isDark ? (
              <motion.span key="sun"
                initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
                <Sun className="w-4 h-4" />
              </motion.span>
            ) : (
              <motion.span key="moon"
                initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.18 }}>
                <Moon className="w-4 h-4" />
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>
    </header>
    </>
  );
}