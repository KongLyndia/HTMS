import { useEffect, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore }   from "@/store/authStore";
import { notifKeys }      from "@/hooks/useNotification";
import { pushNotifToast } from "@/components/layout/Header";
import { MY_TASKS_KEY }  from "@/hooks/useMyTasks";
import type { NotificationSummary, NotificationItem } from "@/api/notificationApi";

const HUB_URL = (import.meta.env.VITE_API_URL as string ?? "https://localhost:7004/api")
  .replace("/api", "") + "/hubs/notifications";

export function useSignalR() {
  const qc           = useQueryClient();
  const accessToken  = useAuthStore((s) => s.accessToken);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    // Khởi tạo connection
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        // Truyền JWT qua query string (BE đọc từ access_token)
        accessTokenFactory: () => accessToken,
        // Ưu tiên WebSocket, fallback Server-Sent Events, Long Polling
        transport: signalR.HttpTransportType.WebSockets
          | signalR.HttpTransportType.ServerSentEvents
          | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]) // retry intervals ms
      .configureLogging(
        import.meta.env.DEV
          ? signalR.LogLevel.Information
          : signalR.LogLevel.Warning
      )
      .build();

    connectionRef.current = connection;

    // ── Event: nhận notification mới ─────────────────────────────────
    connection.on("ReceiveNotification", (payload: NotificationItem) => {
      // Inject vào cache
      qc.setQueryData<NotificationSummary>(notifKeys.summary, (old) => {
        if (!old) return { unreadCount: 1, items: [payload] };
        return {
          unreadCount: old.unreadCount + 1,
          items: [payload, ...old.items],
        };
      });
      // Hiển thị toast nổi trên màn hình
      pushNotifToast({
        id:      payload.notificationId,
        title:   payload.title,
        message: payload.message,
      });
    });

    // ── MembersUpdated → refresh sidebar + my-tasks ──────────────────
    connection.on("MembersUpdated", () => {
      qc.invalidateQueries({ queryKey: ["sidebar-projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "projects"] });
      qc.invalidateQueries({ queryKey: MY_TASKS_KEY });
    });

    // ── ProjectCreated → thêm vào sidebar ngay lập tức ─────────────
    connection.on("ProjectCreated", (data: { projectId: string; projectName: string }) => {
      qc.setQueryData<{ projectId: string; projectName: string }[]>(
        ["sidebar-projects"],
        old => {
          if (!old) return [data];
          // Tránh duplicate
          if (old.some(p => p.projectId === data.projectId)) return old;
          return [...old, data];
        }
      );
      qc.invalidateQueries({ queryKey: ["dashboard", "projects"] });
    });

    // ── ProjectUpdated → cập nhật tên dự án trên sidebar ─────────────
    connection.on("ProjectUpdated", (data: { projectId: string; projectName: string }) => {
      qc.setQueryData<{ projectId: string; projectName: string }[]>(
        ["sidebar-projects"],
        old => old
          ? old.map(p => p.projectId === data.projectId ? { ...p, projectName: data.projectName } : p)
          : old
      );
      qc.invalidateQueries({ queryKey: ["dashboard", "projects"] });
    });

    // ── ProjectDeleted → xóa khỏi sidebar ngay lập tức ──────────────
    connection.on("ProjectDeleted", (data: { projectId: string }) => {
      qc.setQueryData<{ projectId: string; projectName: string }[]>(
        ["sidebar-projects"],
        old => old ? old.filter(p => p.projectId !== data.projectId) : old
      );
      qc.invalidateQueries({ queryKey: ["dashboard", "projects"] });
      qc.invalidateQueries({ queryKey: MY_TASKS_KEY });
    });

    // ── MyTasksUpdated → refresh my-tasks (BE push đúng người) ──────
    connection.on("MyTasksUpdated", () => {
      qc.invalidateQueries({ queryKey: MY_TASKS_KEY });
    });

    // ── Log trạng thái reconnect ──────────────────────────────────────
    connection.onreconnecting(() => {
      console.info("[SignalR] Đang kết nối lại...");
    });
    connection.onreconnected(() => {
      console.info("[SignalR] Đã kết nối lại.");
      qc.invalidateQueries({ queryKey: notifKeys.summary });
      qc.invalidateQueries({ queryKey: ["sidebar-projects"] });
      qc.invalidateQueries({ queryKey: MY_TASKS_KEY });
    });
    connection.onclose(() => {
      console.info("[SignalR] Kết nối đóng.");
    });

    // Khởi động
    connection.start().catch((err) => {
      console.error("[SignalR] Lỗi kết nối:", err);
    });

    // Cleanup khi unmount hoặc token thay đổi
    return () => {
      connection.stop();
    };
  }, [accessToken, qc]);

  return connectionRef;
}