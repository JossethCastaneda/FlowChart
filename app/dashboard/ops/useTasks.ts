import { useState, useEffect, useCallback } from "react";
import type { Task, Member } from "./types"; // We will extract types to types.ts

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const r = await fetch("/api/ops");
      const d = await r.json();
      if (Array.isArray(d.data?.tasks)) setTasks(d.data.tasks);
      if (Array.isArray(d.data?.members)) setMembers(d.data.members);
    } catch {
      /* silent — error will surface as empty state */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- TODO: [React] Refactor de hooks anti-patrón
    fetchTasks();
  }, [fetchTasks]);

  // SSE stream logic for real-time updates
  useEffect(() => {
    let source: EventSource | null = null;
    let mounted = true;

    const connect = () => {
      source = new EventSource("/api/ops/stream");
      source.addEventListener("change", () => {
        if (mounted) fetchTasks();
      });
      source.onerror = () => {
        source?.close();
        // EventSource automatically reconnects
      };
    };

    connect();

    return () => {
      mounted = false;
      source?.close();
    };
  }, [fetchTasks]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const patchTask = async (id: string, updates: any) => {
    try {
      // Optimistic update
      setTasks(prev => {
        const replace = (list: Task[]): Task[] => list.map(t => {
          if (t.id === id) return { ...t, ...updates };
          if (t.children?.length > 0) return { ...t, children: replace(t.children) };
          return t;
        });
        return replace(prev);
      });

      await fetch(`/api/ops/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
    } catch (e) {
      fetchTasks(); // Revert on error
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const patchSubtask = async (id: string, updates: any) => {
    return patchTask(id, updates);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const createTask = async (data: any) => {
    await fetch("/api/ops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    fetchTasks();
  };

  const createSubtask = async (parentId: string, title: string) => {
    await createTask({ title, parentId, priority: "P2", status: "Backlog" });
  };

  const deleteTask = async (id: string) => {
    try {
      // Optimistic delete
      setTasks(prev => {
        const filter = (list: Task[]): Task[] => list.filter(t => t.id !== id).map(t => ({
          ...t,
          children: filter(t.children || [])
        }));
        return filter(prev);
      });
      await fetch(`/api/ops/${id}`, { method: "DELETE" });
    } catch {
      fetchTasks();
    }
  };

  const deleteSubtask = async (id: string) => {
    return deleteTask(id);
  };

  return {
    tasks,
    members,
    loading,
    fetchTasks,
    patchTask,
    patchSubtask,
    createTask,
    createSubtask,
    deleteTask,
    deleteSubtask,
  };
}
