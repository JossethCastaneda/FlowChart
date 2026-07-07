import React, { useMemo } from "react";
import type { Task } from "./types";
import { useLanguage } from "@/components/layout/LanguageContext";

const ROW_HEIGHT = 40;
const DAY_WIDTH = 40;

function addDays(d: Date, days: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + days);
  return c;
}

export function GanttView({ tasks, onEditTask }: { tasks: Task[]; onEditTask: (t: Task) => void }) {
  const { lang } = useLanguage();

  // Find min start and max end to determine grid span
  const { minDate, maxDate, taskTimeline } = useMemo(() => {
    let min = new Date();
    let max = new Date();
    max.setDate(max.getDate() + 14); // At least 2 weeks

    const tml = tasks.filter(t => !t.parentId && t.status !== "Done").map(t => {
      const start = t.startDate ? new Date(t.startDate) : new Date(t.createdAt);
      const end = t.dueDate ? new Date(t.dueDate) : addDays(start, 3);
      if (start < min) min = new Date(start);
      if (end > max) max = new Date(end);
      return { task: t, start, end };
    });

    // Add padding
    min = addDays(min, -2);
    max = addDays(max, 5);

    return { minDate: min, maxDate: max, taskTimeline: tml };
  }, [tasks]);

  const daysDiff = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 3600 * 24));
  const days = Array.from({ length: daysDiff }, (_, i) => addDays(minDate, i));

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflowX: "auto" }}>
      <div style={{ display: "flex", minWidth: 300 + daysDiff * DAY_WIDTH }}>
        
        {/* Left Column (Task List) */}
        <div style={{ width: 300, borderRight: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ height: 40, borderBottom: "1px solid var(--border)", padding: "0 16px", display: "flex", alignItems: "center", fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", background: "var(--surface-hover)" }}>
            {lang === "es" ? "Tarea" : "Task"}
          </div>
          {taskTimeline.map(({ task }) => (
            <div
              key={task.id}
              onClick={() => onEditTask(task)}
              style={{
                height: ROW_HEIGHT, borderBottom: "1px solid var(--border)", padding: "0 16px",
                display: "flex", alignItems: "center", fontSize: 12, color: "var(--foreground)",
                cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--surface-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {task.title}
            </div>
          ))}
        </div>

        {/* Right Column (Timeline Grid) */}
        <div style={{ flex: 1, position: "relative" }}>
          <div style={{ display: "flex", height: 40, borderBottom: "1px solid var(--border)", background: "var(--surface-hover)" }}>
            {days.map((d, i) => {
              const isToday = d.toDateString() === new Date().toDateString();
              return (
                <div key={i} style={{
                  width: DAY_WIDTH, flexShrink: 0, borderRight: "1px solid var(--border)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  background: isToday ? "var(--cyan-dim)" : "transparent"
                }}>
                  <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{d.toLocaleDateString(lang === "es" ? "es-MX" : "en-US", { weekday: "short" })}</span>
                  <span style={{ fontSize: 11, fontWeight: isToday ? 700 : 500, color: isToday ? "var(--cyan)" : "var(--foreground)" }}>{d.getDate()}</span>
                </div>
              )
            })}
          </div>

          <div style={{ position: "relative" }}>
            {/* Grid lines */}
            <div style={{ position: "absolute", inset: 0, display: "flex", pointerEvents: "none" }}>
               {days.map((d, i) => (
                 <div key={i} style={{ width: DAY_WIDTH, flexShrink: 0, borderRight: "1px solid var(--border)", background: d.toDateString() === new Date().toDateString() ? "rgba(var(--cyan-rgb), 0.05)" : "transparent" }} />
               ))}
            </div>

            {/* Bars */}
            {taskTimeline.map(({ task, start, end }, rowIndex) => {
              const startDiff = Math.floor((start.getTime() - minDate.getTime()) / (1000 * 3600 * 24));
              const durDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) || 1;
              const left = startDiff * DAY_WIDTH;
              const width = durDays * DAY_WIDTH;

              const isBlocked = task.blockedBy && task.blockedBy.length > 0;

              return (
                <div key={task.id} style={{ height: ROW_HEIGHT, borderBottom: "1px solid var(--border)", position: "relative" }}>
                  <div
                    style={{
                      position: "absolute", top: 8, height: 24, left: Math.max(0, left), width,
                      background: isBlocked ? "var(--amber)" : "var(--cyan)",
                      borderRadius: 4, display: "flex", alignItems: "center", padding: "0 8px",
                      color: "#fff", fontSize: 10, fontWeight: 700, overflow: "hidden",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      opacity: task.status === "Done" ? 0.5 : 1
                    }}
                  >
                    {durDays > 1 && task.title}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
