import { create } from "zustand";

interface ChannelConfig {
  platformId: string;
  platformName: string;
  adAccounts: string[];
  budget: string;
  period: string;
  goal: string;
  cpr: string;
}

interface Project {
  id: string;
  name: string;
  alias: string | null;
  client: string | null;
  vertical: string | null;
  fanpage: string | null;
  instagram: string | null;
  whatsapp: string | null;
  website: string | null;
  persona: string | null;
  geo: string | null;
  status: string;
  dateStart: string | null;
  dateEnd: string | null;
  workspaceId: string;
  channels: ChannelConfig[];
  createdAt: string;
  updatedAt: string;
}

interface ProjectsState {
  projects: Project[];
  loading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  createProject: (
    data: Partial<Project> & { name: string; workspaceId: string }
  ) => Promise<Project | null>;
  updateProject: (id: string, data: Partial<Project>) => Promise<boolean>;
  deleteProject: (id: string) => Promise<boolean>;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.success) {
        set({ projects: data.data, loading: false });
      } else {
        set({
          error: data.error || "Error cargando proyectos",
          loading: false,
        });
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createProject: async (projectData) => {
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectData),
      });
      const data = await res.json();
      if (data.success) {
        // Optimistic: add to local state
        set({ projects: [data.data, ...get().projects] });
        return data.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  updateProject: async (id, updates) => {
    // Optimistic update
    const prev = get().projects;
    set({
      projects: prev.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    });
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!data.success) {
        set({ projects: prev }); // Revert
        return false;
      }
      return true;
    } catch {
      set({ projects: prev }); // Revert
      return false;
    }
  },

  deleteProject: async (id) => {
    const prev = get().projects;
    set({ projects: prev.filter((p) => p.id !== id) }); // Optimistic
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        set({ projects: prev }); // Revert
        return false;
      }
      return true;
    } catch {
      set({ projects: prev }); // Revert
      return false;
    }
  },
}));
