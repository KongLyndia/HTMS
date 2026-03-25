import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import { membersApi } from "@/api/membersApi";
import { useAuthStore } from "@/store/authStore";

export function useProjectStats(projectId: string) {
  return useQuery({
    queryKey: ["project-stats", projectId],
    queryFn:  () => membersApi.getStats(projectId),
    staleTime: 15_000,
  });
}

const keys = {
  members:  (id: string) => ["members", id] as const,
  activity: (id: string, page: number) => ["members-activity", id, page] as const,
};

export function useMembers(projectId: string) {
  return useQuery({
    queryKey: keys.members(projectId),
    queryFn:  () => membersApi.getMembers(projectId),
  });
}

export function useActivity(projectId: string, page: number, entity?: string, action?: string) {
  return useQuery({
    queryKey: [...keys.activity(projectId, page), entity, action],
    queryFn:  () => membersApi.getActivity(projectId, page, entity, action),
  });
}

export function useAddMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: string }) =>
      membersApi.addMember(projectId, email, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.members(projectId) }),
  });
}

export function useUpdateRole(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      membersApi.updateRole(projectId, userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.members(projectId) }),
  });
}

export function useRemoveMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => membersApi.removeMember(projectId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.members(projectId) }),
  });
}

// ── useMembersRealtime — lắng nghe MembersUpdated qua SignalR ─────────
const HUB_URL = (import.meta.env.VITE_API_URL as string ?? "https://localhost:7004/api")
  .replace("/api", "") + "/hubs/board";

export function useMembersRealtime(projectId: string) {
  const qc          = useQueryClient();
  const accessToken = useAuthStore(s => s.accessToken);
  const connRef     = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    if (!accessToken || !projectId) return;

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => accessToken,
        transport: signalR.HttpTransportType.WebSockets
          | signalR.HttpTransportType.ServerSentEvents
          | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(import.meta.env.DEV ? signalR.LogLevel.Warning : signalR.LogLevel.None)
      .build();

    connRef.current = conn;

    // MembersUpdated — thêm/xóa/đổi role thành viên
    conn.on("MembersUpdated", () => {
      qc.invalidateQueries({ queryKey: keys.members(projectId) });
      qc.invalidateQueries({ queryKey: ["members-activity", projectId] });
    });

    // TaskCreated / TaskUpdated / TaskDeleted
    // → task stats của member thay đổi → refetch members + activity
    const invalidateAll = () => {
      qc.invalidateQueries({ queryKey: keys.members(projectId) });
      qc.invalidateQueries({ queryKey: ["members-activity", projectId] });
    };
    conn.on("TaskCreated", invalidateAll);
    conn.on("TaskUpdated", invalidateAll);
    conn.on("TaskDeleted", invalidateAll);

    conn.start()
      .then(() => conn.invoke("JoinProject", projectId))
      .catch(err => console.warn("[MembersHub]", err));

    return () => {
      conn.invoke("LeaveProject", projectId).catch(() => {});
      conn.stop();
    };
  }, [accessToken, projectId, qc]);

  return connRef;
}