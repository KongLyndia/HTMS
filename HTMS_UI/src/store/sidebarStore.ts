import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarState {
  collapsed:        boolean;
  expandedProjects: string[]; // ProjectId[] đang mở

  toggleSidebar:      () => void;
  toggleProject:      (projectId: string) => void;
  expandProject:      (projectId: string) => void;
  collapseAllProjects:() => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed:        false,
      expandedProjects: [],

      toggleSidebar: () =>
        set((s) => ({ collapsed: !s.collapsed })),

      toggleProject: (projectId) =>
        set((s) => ({
          expandedProjects: s.expandedProjects.includes(projectId)
            ? s.expandedProjects.filter((id) => id !== projectId)
            : [...s.expandedProjects, projectId],
        })),

      expandProject: (projectId) =>
        set((s) => ({
          expandedProjects: s.expandedProjects.includes(projectId)
            ? s.expandedProjects
            : [...s.expandedProjects, projectId],
        })),

      collapseAllProjects: () =>
        set({ expandedProjects: [] }),
    }),
    {
      name: "taskflow-sidebar",
      partialize: (s) => ({
        collapsed:        s.collapsed,
        expandedProjects: s.expandedProjects,
      }),
    }
  )
);