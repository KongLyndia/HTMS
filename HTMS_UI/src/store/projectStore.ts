import { create } from "zustand";

interface ProjectStore {
  projects: { projectId: string; projectName: string }[];
  setProjects: (projects: { projectId: string; projectName: string }[]) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  setProjects: (projects) => set({ projects }),
}));