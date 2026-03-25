import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationApi, type NotificationItem, type NotificationSummary } from "@/api/notificationApi";

export const notifKeys = {
  summary: ["notifications", "summary"] as const,
};

// Fetch lần đầu khi mount + sau reconnect SignalR
// KHÔNG polling vì SignalR đã push realtime
export function useNotifications() {
  return useQuery({
    queryKey:  notifKeys.summary,
    queryFn:   () => notificationApi.getSummary(),
    staleTime: Infinity, // Không tự refetch — SignalR cập nhật cache trực tiếp
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: notifKeys.summary });
      const prev = qc.getQueryData<NotificationSummary>(notifKeys.summary);
      qc.setQueryData<NotificationSummary>(notifKeys.summary, (old) => {
        if (!old) return old;
        const wasUnread = old.items.find(i => i.notificationId === id && !i.isRead);
        return {
          unreadCount: Math.max(0, old.unreadCount - (wasUnread ? 1 : 0)),
          items: old.items.map(i =>
            i.notificationId === id ? { ...i, isRead: true } : i
          ),
        };
      });
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(notifKeys.summary, ctx.prev);
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: notifKeys.summary });
      const prev = qc.getQueryData<NotificationSummary>(notifKeys.summary);
      qc.setQueryData<NotificationSummary>(notifKeys.summary, (old) =>
        old ? { unreadCount: 0, items: old.items.map(i => ({ ...i, isRead: true })) } : old
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(notifKeys.summary, ctx.prev);
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationApi.deleteOne(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: notifKeys.summary });
      const prev = qc.getQueryData<NotificationSummary>(notifKeys.summary);
      qc.setQueryData<NotificationSummary>(notifKeys.summary, (old) => {
        if (!old) return old;
        const removing = old.items.find(i => i.notificationId === id);
        return {
          unreadCount: removing && !removing.isRead
            ? Math.max(0, old.unreadCount - 1)
            : old.unreadCount,
          items: old.items.filter(i => i.notificationId !== id),
        };
      });
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(notifKeys.summary, ctx.prev);
    },
  });
}