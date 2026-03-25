import { useRef, useEffect, useState } from "react";
import { createPortal }                from "react-dom";
import { motion, AnimatePresence }     from "framer-motion";
import {
  Bell, BellOff, Check, CheckCheck, Trash2, X, ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn }          from "@/lib/utils";
import {
  useNotifications, useMarkRead, useMarkAllRead, useDeleteNotification,
} from "@/hooks/useNotification";
import type { NotificationItem } from "@/api/notificationApi";

// ── Thời gian tương đối ───────────────────────────────────────────────
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

// ── Avatar người gửi ──────────────────────────────────────────────────
function SenderAvatar({ name, avatar }: { name: string | null; avatar: string | null }) {
  if (avatar) {
    return <img src={avatar} alt={name ?? ""} className="w-8 h-8 rounded-full flex-shrink-0 object-cover" />;
  }
  const initial = name?.[0]?.toUpperCase() ?? "H";
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
      {initial}
    </div>
  );
}

// ── Dòng thông báo ────────────────────────────────────────────────────
function NotifRow({
  item,
  onClose,
}: {
  item:     NotificationItem;
  onClose:  () => void;
}) {
  const navigate    = useNavigate();
  const markRead    = useMarkRead();
  const deleteNotif = useDeleteNotification();

  function handleClick() {
    // 1. Đánh dấu đã đọc
    if (!item.isRead) markRead.mutate(item.notificationId);
    // 2. Đóng panel
    onClose();
    // 3. Navigate sau 1 tick để tránh conflict
    if (item.linkUrl) {
      requestAnimationFrame(() => navigate(item.linkUrl!));
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1,  y:  0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.16 }}
      className={cn(
        "group relative flex items-start gap-3 px-4 py-3 cursor-pointer",
        "hover:#f0fdfadark:hover:bg-white/[0.03] transition-colors duration-100",
        !item.isRead && "bg-teal-50/50 dark:bg-teal-500/[0.05]"
      )}
      onClick={handleClick}
    >
      {/* Chấm chưa đọc */}
      {!item.isRead && (
        <span className="absolute left-2 top-[22px] w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
      )}

      <SenderAvatar name={item.senderName} avatar={item.senderAvatar} />

      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-xs leading-snug",
          item.isRead
            ? "text-slate-500 dark:text-slate-400"
            : "text-slate-800 dark:text-slate-200 font-semibold"
        )}>
          {item.senderName ?? "Hệ thống"} · {item.title}
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
          {item.message}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[10px] text-slate-400 dark:text-slate-600">
            {relativeTime(item.createdAt)}
          </span>
          {item.linkUrl && (
            <ExternalLink className="w-2.5 h-2.5 text-teal-400" />
          )}
        </div>
      </div>

      {/* Nút hành động — hiện khi hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 pt-0.5">
        {!item.isRead && (
          <button
            onClick={(e) => { e.stopPropagation(); markRead.mutate(item.notificationId); }}
            className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors"
            title="Đánh dấu đã đọc"
          >
            <Check className="w-3 h-3" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); deleteNotif.mutate(item.notificationId); }}
          className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
          title="Xóa"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

// ── Panel chính ───────────────────────────────────────────────────────
interface InboxPanelProps {
  open:        boolean;
  onClose:     () => void;
  anchorRef:   React.RefObject<HTMLElement>; // ref đến nút trigger
}

export default function InboxPanel({ open, onClose, anchorRef }: InboxPanelProps) {
  const { data, isLoading } = useNotifications();
  const markAllRead         = useMarkAllRead();
  const panelRef            = useRef<HTMLDivElement>(null);

  // Tính vị trí panel dựa trên anchor
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      top:  rect.top,
      left: rect.right + 12, // hiện sang phải nút
    });
  }, [open, anchorRef]);

  // Đóng khi click ra ngoài (bubble phase — sau khi handleClick đã chạy)
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current    && !panelRef.current.contains(target) &&
        anchorRef.current   && !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose, anchorRef]);

  const items     = data?.items ?? [];
  const unread    = data?.unreadCount ?? 0;
  const hasUnread = unread > 0;

  const panel = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, x: -10, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -10, scale: 0.97 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          style={{ top: pos.top, left: pos.left }}
          className={cn(
            "fixed z-[9999] flex flex-col",
            "w-[340px] max-h-[520px]",
            "bg-white dark:bg-[#0d1525]",
            "border border-slate-200 dark:border-white/[0.08]",
            "rounded-2xl shadow-2xl overflow-hidden"
          )}
        >
          {/* Tiêu đề */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/[0.06] flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-teal-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Thông báo</h3>
              {hasUnread && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-500 text-white min-w-[18px] text-center leading-none">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {hasUnread && (
                <button
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                  className="flex items-center gap-1 text-[11px] text-teal-600 dark:text-teal-400 hover:text-teal-700 px-2 py-1 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors disabled:opacity-50"
                >
                  <CheckCheck className="w-3 h-3" />
                  Đọc tất cả
                </button>
              )}
              <button
                onClick={onClose}
                className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Nội dung */}
          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <div className="flex flex-col divide-y divide-slate-100 dark:divide-white/[0.04]">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-2.5 w-3/4 rounded bg-slate-100 dark:bg-white/10 animate-pulse" />
                      <div className="h-2 w-full rounded bg-slate-100 dark:bg-white/10 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-3">
                  <BellOff className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Không có thông báo</p>
                <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">Bạn đã xem hết rồi!</p>
              </div>
            )}

            {!isLoading && items.length > 0 && (
              <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                <AnimatePresence mode="popLayout">
                  {items.map((item: NotificationItem) => (
                    <NotifRow
                      key={item.notificationId}
                      item={item}
                      onClose={onClose}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="flex-shrink-0 border-t border-slate-100 dark:border-white/[0.06] px-4 py-2">
              <p className="text-[10px] text-center text-slate-400 dark:text-slate-600">
                Hiển thị {items.length} thông báo gần nhất
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render qua portal ra document.body — thoát hoàn toàn khỏi DOM Sidebar
  return createPortal(panel, document.body);
}