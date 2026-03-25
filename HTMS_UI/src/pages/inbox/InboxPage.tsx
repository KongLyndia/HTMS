import { useState, useEffect } from "react";
import { useNavigate }         from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BellOff, Check, CheckCheck, Trash2,
  ExternalLink, Inbox, Clock, Search,
} from "lucide-react";
import { cn }                    from "@/lib/utils";
import {
  useNotifications, useMarkRead, useMarkAllRead, useDeleteNotification,
} from "@/hooks/useNotification";
import type { NotificationItem } from "@/api/notificationApi";

// ── Thời gian tương đối ───────────────────────────────────────────────
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m    = Math.floor(diff / 60000);
  if (m < 1)  return "Vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

// ── Avatar ────────────────────────────────────────────────────────────
function Avatar({
  name, avatar, size = "md",
}: {
  name: string | null; avatar: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const cls = size === "lg" ? "w-12 h-12 text-base"
            : size === "sm" ? "w-7 h-7 text-[10px]"
            : "w-9 h-9 text-xs";
  if (avatar)
    return (
      <img src={avatar} alt={name ?? ""} className={cn(cls, "rounded-full object-cover flex-shrink-0")} />
    );
  const initial = name?.[0]?.toUpperCase() ?? "H";
  return (
    <div className={cn(
      cls, "rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white",
      "bg-gradient-to-br from-teal-400 to-teal-600"
    )}>
      {initial}
    </div>
  );
}

// ── Row danh sách trái ────────────────────────────────────────────────
function NotifListRow({
  item, selected, onClick,
}: {
  item: NotificationItem; selected: boolean; onClick: () => void;
}) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3.5 flex items-start gap-3 relative",
        "border-b border-slate-100 dark:border-white/[0.04] transition-colors duration-100",
        selected
          ? "bg-teal-50 dark:bg-teal-500/[0.12] border-l-2 border-l-teal-500"
          : "hover:#f0fdfadark:hover:bg-white/[0.025]",
        !item.isRead && !selected && "bg-slate-50/50 dark:bg-white/[0.015]"
      )}
    >
      {/* Chấm chưa đọc */}
      {!item.isRead && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
      )}

      <Avatar name={item.senderName} avatar={item.senderAvatar} size="sm" />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-xs leading-snug truncate",
            item.isRead
              ? "text-slate-500 dark:text-slate-400"
              : "text-slate-800 dark:text-slate-100 font-semibold"
          )}>
            {item.title}
          </p>
          <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5">
            {relativeTime(item.createdAt)}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
          {item.senderName ?? "Hệ thống"} · {item.message}
        </p>
      </div>
    </motion.button>
  );
}

// ── Panel chi tiết phải ───────────────────────────────────────────────
function NotifDetail({
  item, onMarkRead, onDelete, onNavigate,
}: {
  item:       NotificationItem;
  onMarkRead: () => void;
  onDelete:   () => void;
  onNavigate: () => void;
}) {
  return (
    <motion.div
      key={item.notificationId}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18 }}
      className="h-full flex flex-col"
    >
      {/* Header */}
      <div className="flex items-start justify-between px-8 py-5 border-b border-slate-100 dark:border-white/[0.06] flex-shrink-0 gap-4">
        <h2 className="text-base font-bold text-slate-800 dark:text-white leading-snug">
          {item.title}
        </h2>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!item.isRead && (
            <button
              onClick={onMarkRead}
              className="flex items-center gap-1.5 text-[11px] font-medium text-teal-600 dark:text-teal-400 px-3 py-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors"
            >
              <Check className="w-3 h-3" /> Đã đọc
            </button>
          )}
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Xóa
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-8 py-7">
        {/* Sender info */}
        <div className="flex items-center gap-3 mb-7 pb-5 border-b border-slate-100 dark:border-white/[0.06]">
          <Avatar name={item.senderName} avatar={item.senderAvatar} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {item.senderName ?? "Hệ thống HTMS"}
            </p>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3 h-3" />
              {new Date(item.createdAt).toLocaleString("vi-VN", {
                weekday: "long", day: "2-digit", month: "long",
                year: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>
          {!item.isRead && (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400">
              Chưa đọc
            </span>
          )}
        </div>

        {/* Nội dung */}
        <div className="rounded-2xl #f0fdfadark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] p-6">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {item.message}
          </p>
        </div>

        {/* CTA */}
        {item.linkUrl && (
          <button
            onClick={onNavigate}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Xem chi tiết
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════
// TRANG HỘP THƯ
// ════════════════════════════════════════════════════════════════════
export default function InboxPage() {
  const navigate    = useNavigate();
  const { data, isLoading } = useNotifications();
  const markRead    = useMarkRead();
  const markAllRead = useMarkAllRead();
  const deleteNotif = useDeleteNotification();

  const [selected, setSelected] = useState<NotificationItem | null>(null);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState<"all" | "unread">("all");

  const items  = data?.items  ?? [];
  const unread = data?.unreadCount ?? 0;

  const filtered = items.filter(item => {
    const matchFilter = filter === "all" || !item.isRead;
    const q           = search.toLowerCase();
    const matchSearch = !q ||
      item.title.toLowerCase().includes(q) ||
      item.message.toLowerCase().includes(q) ||
      (item.senderName?.toLowerCase().includes(q) ?? false);
    return matchFilter && matchSearch;
  });

  // Auto-select đầu tiên khi load
  useEffect(() => {
    if (!selected && filtered.length > 0) setSelected(filtered[0]);
  }, [items]);

  // Khi chọn → mark đọc
  function handleSelect(item: NotificationItem) {
    setSelected(item);
    if (!item.isRead) markRead.mutate(item.notificationId);
  }

  function handleDelete(id: string) {
    deleteNotif.mutate(id);
    if (selected?.notificationId === id) {
      const idx  = filtered.findIndex(i => i.notificationId === id);
      const next = filtered[idx + 1] ?? filtered[idx - 1] ?? null;
      setSelected(next);
    }
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0b1120] overflow-hidden">

      {/* ── Topbar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.06] flex-shrink-0 bg-white dark:bg-[#0b1120]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center">
            <Inbox className="w-[18px] h-[18px] text-teal-500" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 dark:text-white">Hộp thư</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isLoading ? "Đang tải..." : unread > 0 ? `${unread} thông báo chưa đọc` : "Đã đọc hết"}
            </p>
          </div>
        </div>
        {unread > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-1.5 text-xs font-medium text-teal-600 dark:text-teal-400 px-3 py-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors disabled:opacity-50"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Đọc tất cả
          </button>
        )}
      </div>

      {/* ── 2 cột ───────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* TRÁI — danh sách */}
        <div className="w-[300px] xl:w-[340px] flex-shrink-0 flex flex-col border-r border-slate-100 dark:border-white/[0.06]">

          {/* Search + Filter tabs */}
          <div className="px-3 py-3 space-y-2 flex-shrink-0 border-b border-slate-100 dark:border-white/[0.06] bg-white dark:bg-[#0b1120]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm kiếm..."
                className={cn(
                  "w-full pl-8 pr-3 py-2 rounded-xl text-xs",
                  "#f0fdfa dark:bg-white/[0.1]",
                  "border border-slate-200 dark:border-white/[0.08]",
                  "text-slate-700 dark:text-slate-300 placeholder:text-slate-400",
                  "focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20 transition-all"
                )}
              />
            </div>
            <div className="flex gap-1">
              {(["all", "unread"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors",
                    filter === f
                      ? "bg-teal-500 text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                  )}
                >
                  {f === "all" ? `Tất cả (${items.length})` : `Chưa đọc (${unread})`}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading && Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-white/[0.04]">
                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/10 animate-pulse flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-2.5 w-3/4 rounded-full bg-slate-100 dark:bg-white/10 animate-pulse" />
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-white/10 animate-pulse" />
                </div>
              </div>
            ))}

            {!isLoading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <BellOff className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                  {search ? "Không tìm thấy kết quả" : "Không có thông báo"}
                </p>
              </div>
            )}

            {!isLoading && filtered.length > 0 && (
              <AnimatePresence mode="popLayout">
                {filtered.map(item => (
                  <NotifListRow
                    key={item.notificationId}
                    item={item}
                    selected={selected?.notificationId === item.notificationId}
                    onClick={() => handleSelect(item)}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* PHẢI — chi tiết */}
        <div className="flex-1 min-w-0 overflow-hidden bg-white dark:bg-[#0b1120]">
          <AnimatePresence mode="wait">
            {selected ? (
              <NotifDetail
                key={selected.notificationId}
                item={selected}
                onMarkRead={() => markRead.mutate(selected.notificationId)}
                onDelete={() => handleDelete(selected.notificationId)}
                onNavigate={() => { if (selected.linkUrl) navigate(selected.linkUrl); }}
              />
            ) : (
              <motion.div key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center gap-4 text-center px-8"
              >
                <div className="w-16 h-16 rounded-2xl #f0fdfadark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] flex items-center justify-center">
                  <Inbox className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">
                    Chọn một thông báo để xem
                  </p>
                  <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">
                    Tất cả thông báo hệ thống sẽ hiển thị ở đây
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}