import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import * as signalR from "@microsoft/signalr";
import { useAuthStore } from "@/store/authStore";
import { boardApi, type BoardData, type BoardTask } from "@/api/boardApi";

const HUB_URL = (import.meta.env.VITE_API_URL as string ?? "https://localhost:7004/api")
  .replace("/api", "") + "/hubs/board";

export const boardKeys = {
  board: (projectId: string) => ["board", projectId] as const,
};

// Upsert task vào đúng cột (xử lý cả move giữa cột)
function upsertTask(old: BoardData, task: BoardTask): BoardData {
  return {
    ...old,
    columns: old.columns.map(col => {
      if (col.columnId === task.columnId) {
        const exists = col.tasks.some(t => t.taskId === task.taskId);
        return {
          ...col,
          tasks: exists
            ? col.tasks.map(t => t.taskId === task.taskId ? task : t)
            : [...col.tasks, task],
        };
      }
      // Xóa khỏi cột cũ nếu task đã chuyển cột
      return { ...col, tasks: col.tasks.filter(t => t.taskId !== task.taskId) };
    }),
  };
}

// ── useBoard: fetch + SignalR realtime ────────────────────────────────
export function useBoard(projectId: string) {
  const qc          = useQueryClient();
  const accessToken = useAuthStore(s => s.accessToken);

  const query = useQuery({
    queryKey: boardKeys.board(projectId),
    queryFn:  () => boardApi.getBoard(projectId),
    staleTime: 30_000,
    enabled:   !!projectId,
  });

  useEffect(() => {
    if (!accessToken || !projectId) return;

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, { accessTokenFactory: () => accessToken })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(import.meta.env.DEV ? signalR.LogLevel.Warning : signalR.LogLevel.None)
      .build();

    // TaskCreated — dedup by taskId
    conn.on("TaskCreated", (task: BoardTask) => {
      qc.setQueryData<BoardData>(boardKeys.board(projectId), old => {
        if (!old) return old;
        const exists = old.columns.some(c => c.tasks.some(t => t.taskId === task.taskId));
        if (exists) return old;
        return {
          ...old,
          columns: old.columns.map(col =>
            col.columnId === task.columnId
              ? { ...col, tasks: [...col.tasks, task] }
              : col
          ),
        };
      });
    });

    // TaskUpdated — xử lý cả status change + column change
    conn.on("TaskUpdated", (task: BoardTask) => {
      qc.setQueryData<BoardData>(boardKeys.board(projectId), old =>
        old ? upsertTask(old, task) : old
      );
    });

    // TaskDeleted
    conn.on("TaskDeleted", (taskId: string) => {
      qc.setQueryData<BoardData>(boardKeys.board(projectId), old => {
        if (!old) return old;
        return {
          ...old,
          columns: old.columns.map(col => ({
            ...col,
            tasks: col.tasks.filter(t => t.taskId !== taskId),
          })),
        };
      });
    });

    // MembersUpdated → refetch board vì BoardData chứa members list
    conn.on("MembersUpdated", () => {
      qc.invalidateQueries({ queryKey: boardKeys.board(projectId) });
    });

    conn.onreconnected(() => qc.invalidateQueries({ queryKey: boardKeys.board(projectId) }));

    conn.start()
      .then(() => conn.invoke("JoinBoard", projectId))
      .catch(err => console.warn("[BoardHub]", err));

    return () => {
      conn.invoke("LeaveBoard", projectId).catch(() => {});
      conn.stop();
    };
  }, [accessToken, projectId, qc]);

  return query;
}

// ── useCreateTask — Manager ───────────────────────────────────────────
export function useCreateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof boardApi.createTask>[1]) =>
      boardApi.createTask(projectId, payload),
    onSuccess: newTask => {
      qc.setQueryData<BoardData>(boardKeys.board(projectId), old => {
        if (!old) return old;
        const exists = old.columns.some(c => c.tasks.some(t => t.taskId === newTask.taskId));
        if (exists) return old; // dedup với SignalR
        return upsertTask(old, newTask);
      });
    },
  });
}

// ── useUpdateTask — Manager ───────────────────────────────────────────
export function useUpdateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, payload }: {
      taskId: string;
      payload: Parameters<typeof boardApi.updateTask>[2];
    }) => boardApi.updateTask(projectId, taskId, payload),
    onSuccess: updated => {
      qc.setQueryData<BoardData>(boardKeys.board(projectId), old =>
        old ? upsertTask(old, updated) : old
      );
    },
  });
}

// ── useStartTask — Assignee bắt đầu làm ──────────────────────────────
export function useStartTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => boardApi.startTask(projectId, taskId),
    onSuccess: updated => {
      qc.setQueryData<BoardData>(boardKeys.board(projectId), old =>
        old ? upsertTask(old, updated) : old
      );
    },
  });
}

// ── useSubmitTask — Assignee nộp minh chứng ──────────────────────────
export function useSubmitTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, files }: { taskId: string; files: File[] }) =>
      boardApi.submitTask(projectId, taskId, files),
    onSuccess: updated => {
      qc.setQueryData<BoardData>(boardKeys.board(projectId), old =>
        old ? upsertTask(old, updated) : old
      );
    },
  });
}

// ── useReviewTask — Manager approve/reject ────────────────────────────
export function useReviewTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, payload }: {
      taskId: string;
      payload: Parameters<typeof boardApi.reviewTask>[2];
    }) => boardApi.reviewTask(projectId, taskId, payload),
    onSuccess: updated => {
      qc.setQueryData<BoardData>(boardKeys.board(projectId), old =>
        old ? upsertTask(old, updated) : old
      );
    },
  });
}

// ── useDeleteTask ─────────────────────────────────────────────────────
export function useDeleteTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => boardApi.deleteTask(projectId, taskId),
    onMutate: async taskId => {
      await qc.cancelQueries({ queryKey: boardKeys.board(projectId) });
      const prev = qc.getQueryData<BoardData>(boardKeys.board(projectId));
      qc.setQueryData<BoardData>(boardKeys.board(projectId), old => {
        if (!old) return old;
        return {
          ...old,
          columns: old.columns.map(col => ({
            ...col,
            tasks: col.tasks.filter(t => t.taskId !== taskId),
          })),
        };
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(boardKeys.board(projectId), ctx.prev);
    },
  });
}

// ── useDeleteAttachment — Xóa file minh chứng cũ (sau khi reject) ────
export function useDeleteAttachment(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, attachmentId }: { taskId: string; attachmentId: string }) =>
      boardApi.deleteAttachment(projectId, taskId, attachmentId),
    onSuccess: (updated) => {
      qc.setQueryData<BoardData>(boardKeys.board(projectId), old =>
        old ? upsertTask(old, updated) : old
      );
    },
  });
}

// ── useAddComment ─────────────────────────────────────────────────────
export function useAddComment(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, content }: { taskId: string; content: string }) =>
      boardApi.addComment(projectId, taskId, content),
    onSuccess: (updated) => {
      qc.setQueryData<BoardData>(boardKeys.board(projectId), old =>
        old ? upsertTask(old, updated) : old
      );
    },
  });
}

// ── useDeleteComment ──────────────────────────────────────────────────
export function useDeleteComment(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, commentId }: { taskId: string; commentId: string }) =>
      boardApi.deleteComment(projectId, taskId, commentId),
    onSuccess: (updated) => {
      qc.setQueryData<BoardData>(boardKeys.board(projectId), old =>
        old ? upsertTask(old, updated) : old
      );
    },
  });
}

// ── useAddAttachment ──────────────────────────────────────────────────
export function useAddAttachment(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, file }: { taskId: string; file: File }) =>
      boardApi.addAttachment(projectId, taskId, file),
    onSuccess: (updated) => {
      qc.setQueryData<BoardData>(boardKeys.board(projectId), old =>
        old ? upsertTask(old, updated) : old
      );
    },
  });
}