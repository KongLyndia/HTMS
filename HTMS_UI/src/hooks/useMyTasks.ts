import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { myTasksApi, type CreatePersonalTaskRequest } from "@/api/myTasksApi";

export const MY_TASKS_KEY = ["my-tasks"] as const;

// ── Toast helper (dùng nếu bạn chưa cài react-hot-toast) ─────────────────────
// Nếu đã cài: import toast from "react-hot-toast"
function nativeToast(msg: string) {
  // Fallback: dispatch custom event để MyTasksPage hiển thị toast
  window.dispatchEvent(new CustomEvent("ht:toast", { detail: { message: msg } }));
}

// ── Main hook ────────────────────────────────────────────────────────────────
export function useMyTasks() {
  const qc = useQueryClient();

  // ── 1. Fetch query ─────────────────────────────────────────────────────
  const query = useQuery({
    queryKey: MY_TASKS_KEY,
    queryFn:  myTasksApi.getAll,
    staleTime: 30_000,
  });

  // ── 2. Complete personal task mutation ─────────────────────────────────
  const completeMutation = useMutation({
    mutationFn: myTasksApi.completePersonal,
    onMutate: async (taskId: string) => {
      await qc.cancelQueries({ queryKey: MY_TASKS_KEY });
      const prev = qc.getQueryData(MY_TASKS_KEY);
      // Đánh dấu isCompleted = true thay vì xóa → chuyển sang tab Đã hoàn thành
      qc.setQueryData(MY_TASKS_KEY, (old: any[]) =>
        old ? old.map((t) => t.id === taskId ? { ...t, isCompleted: true } : t) : []
      );
      return { prev };
    },
    onError: (_err, _id, ctx: any) => {
      qc.setQueryData(MY_TASKS_KEY, ctx?.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: MY_TASKS_KEY });
    },
  });

  // ── 3. Create personal task mutation ───────────────────────────────────
  const createMutation = useMutation({
    mutationFn: myTasksApi.createPersonal,
    // Optimistic: thêm task tạm vào đầu list ngay lập tức
    onMutate: async (req: CreatePersonalTaskRequest) => {
      await qc.cancelQueries({ queryKey: MY_TASKS_KEY });
      const prev = qc.getQueryData(MY_TASKS_KEY);
      const optimistic = {
        id:          `temp-${Date.now()}`,
        type:        "personal" as const,
        title:       req.title,
        description: req.description,
        dueDate:     req.dueDate,
        isCompleted: false,
        createdAt:   new Date().toISOString(),
      };
      qc.setQueryData(MY_TASKS_KEY, (old: any[]) =>
        old ? [optimistic, ...old] : [optimistic]
      );
      return { prev };
    },
    onError: (_err, _req, ctx: any) => {
      qc.setQueryData(MY_TASKS_KEY, ctx?.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: MY_TASKS_KEY });
    },
  });

  // SignalR được xử lý tập trung trong useSignalR (MainLayout)
  // → lắng nghe MyTasksUpdated từ NotificationHub → invalidate MY_TASKS_KEY

  return {
    tasks:            query.data ?? [],
    isLoading:        query.isLoading,
    isError:          query.isError,
    completePersonal: completeMutation.mutate,
    isCompleting:     completeMutation.isPending,
    createPersonal:   createMutation.mutate,
    isCreating:       createMutation.isPending,
  };
}