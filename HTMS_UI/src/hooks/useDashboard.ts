import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dashboardApi, type PersonalTask } from "@/api/dashboardApi";

export const dashboardKeys = {
  stats:         ["dashboard", "stats"]         as const,
  chart:         ["dashboard", "chart"]         as const,
  assignedTasks: ["dashboard", "assignedTasks"] as const,
  personalTasks: ["dashboard", "personalTasks"] as const,
  projects:      ["dashboard", "projects"]      as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats,
    queryFn:  dashboardApi.getStats,
    staleTime: 1000 * 60 * 2,
  });
}

export function useDashboardChart() {
  return useQuery({
    queryKey: dashboardKeys.chart,
    queryFn:  dashboardApi.getChart,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAssignedTasks() {
  return useQuery({
    queryKey: dashboardKeys.assignedTasks,
    queryFn:  dashboardApi.getAssignedTasks,
    staleTime: 1000 * 60 * 2,
  });
}

export function usePersonalTasks() {
  return useQuery({
    queryKey: dashboardKeys.personalTasks,
    queryFn:  dashboardApi.getPersonalTasks,
    staleTime: 0,
  });
}

export function useProjectProgress() {
  return useQuery({
    queryKey: dashboardKeys.projects,
    queryFn:  dashboardApi.getProjects,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreatePersonalTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ title, dueDate }: { title: string; dueDate?: string }) =>
      dashboardApi.createPersonalTask(title, dueDate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dashboardKeys.personalTasks });
    },
  });
}

export function useTogglePersonalTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dashboardApi.togglePersonalTask(id),
    // Optimistic update — toggle ngay không chờ server
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: dashboardKeys.personalTasks });
      const prev = qc.getQueryData<PersonalTask[]>(dashboardKeys.personalTasks);

      qc.setQueryData<PersonalTask[]>(dashboardKeys.personalTasks, (old) =>
        old?.map((t) =>
          t.personalTaskId === id ? { ...t, isCompleted: !t.isCompleted } : t
        ) ?? []
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(dashboardKeys.personalTasks, ctx.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: dashboardKeys.personalTasks });
    },
  });
}