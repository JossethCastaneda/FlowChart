/* eslint-disable react-hooks/static-components */
"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import type { Task, Member } from "./types";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { PRIORITIES, PRIO_CFG } from "./types";

interface MyTasksViewProps {
  tasks: Task[];
  members: Member[];
  lang: "es" | "en";
  onTaskClick: (task: Task) => void;
    currentUser: any;
}

export function MyTasksView({ tasks, members, lang, onTaskClick, currentUser }: MyTasksViewProps) {
  const myTasks = useMemo(() => {
    if (!currentUser?.name) return [];
    
    // Sort logic: Overdue first, then upcoming by due date, then no due date
        const now = new Date();
    
    return tasks
      .filter(t => t.assignee === currentUser.name && t.status !== "Done")
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [tasks, currentUser]);

  const groupTasks = (taskList: Task[]) => {
    const now = new Date();
    now.setHours(0,0,0,0);
    
    const overdue: Task[] = [];
    const today: Task[] = [];
    const upcoming: Task[] = [];
    const later: Task[] = [];
    const noDate: Task[] = [];

    taskList.forEach(t => {
      if (!t.dueDate) {
        noDate.push(t);
        return;
      }
      
      const due = new Date(t.dueDate);
      due.setHours(0,0,0,0);
      
      if (due < now) overdue.push(t);
      else if (due.getTime() === now.getTime()) today.push(t);
      else if (due.getTime() <= now.getTime() + 7 * 24 * 60 * 60 * 1000) upcoming.push(t);
      else later.push(t);
    });

    return { overdue, today, upcoming, later, noDate };
  };

  const { overdue, today, upcoming, later, noDate } = groupTasks(myTasks);

    const Section = ({ title, tasks, icon: Icon, color }: { title: string, tasks: Task[], icon: any, color: string }) => {
    if (tasks.length === 0) return null;
    
    return (
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color, display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Icon size={16} />
          {title} ({tasks.length})
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tasks.map(t => (
            <div 
              key={t.id}
              onClick={() => onTaskClick(t)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", borderRadius: 8, background: "var(--fc-surface)", border: "1px solid var(--fc-border)",
                cursor: "pointer", transition: "all 0.2s ease"
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-strong)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--fc-border)"}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <CheckCircle2 size={18} style={{ color: "var(--fc-text-muted)" }} />
                <span style={{ fontSize: 14, fontWeight: 500, color: "var(--fc-text)" }}>{t.title}</span>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ 
                  fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 12,
                  background: PRIO_CFG[t.priority]?.c + "18", color: PRIO_CFG[t.priority]?.c
                }}>
                  {PRIO_CFG[t.priority]?.label}
                </span>
                {t.dueDate && (
                  <span style={{ fontSize: 12, color: "var(--fc-text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={12} />
                    {format(new Date(t.dueDate), "dd MMM")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!currentUser?.name) {
    return <div style={{ padding: 24, textAlign: "center", color: "var(--fc-text-secondary)" }}>{lang === "es" ? "Cargando usuario..." : "Loading user..."}</div>;
  }

  if (myTasks.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <CheckCircle2 size={48} style={{ color: "var(--fc-success)", opacity: 0.5 }} />
        <p style={{ fontSize: 16, color: "var(--fc-text-secondary)", margin: 0 }}>
          {lang === "es" ? "¡Todo al día! No tienes tareas pendientes." : "All caught up! No pending tasks."}
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", width: "100%", padding: "24px 0", height: "100%", overflowY: "auto" }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 24px", color: "var(--fc-text)" }}>
        {lang === "es" ? "Mis Tareas" : "My Tasks"}
      </h2>
      
            <Section title={lang === "es" ? "Vencidas" : "Overdue"} tasks={overdue} icon={AlertTriangle} color="var(--fc-danger)" />
            <Section title={lang === "es" ? "Hoy" : "Today"} tasks={today} icon={Clock} color="var(--fc-warning)" />
            <Section title={lang === "es" ? "Próximos 7 días" : "Upcoming (7 days)"} tasks={upcoming} icon={Clock} color="var(--fc-accent)" />
            <Section title={lang === "es" ? "Más adelante" : "Later"} tasks={later} icon={Clock} color="var(--fc-text-secondary)" />
            <Section title={lang === "es" ? "Sin fecha" : "No Due Date"} tasks={noDate} icon={Clock} color="var(--fc-text-muted)" />
    </div>
  );
}
