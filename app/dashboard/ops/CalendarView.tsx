"use client";

import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, isWithinInterval } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Task, Member } from "./types";

interface CalendarViewProps {
  tasks: Task[];
  members: Member[];
  lang: "es" | "en";
  onTaskClick: (task: Task) => void;
}

export function CalendarView({ tasks, members, lang, onTaskClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  
  // Adjust to start on Monday
  const startDay = getDay(monthStart); // 0=Sunday, 1=Monday
  const daysToPrepend = startDay === 0 ? 6 : startDay - 1;
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(calendarStart.getDate() - daysToPrepend);
  
  const endDay = getDay(monthEnd);
  const daysToAppend = endDay === 0 ? 0 : 7 - endDay;
  const calendarEnd = new Date(monthEnd);
  calendarEnd.setDate(calendarEnd.getDate() + daysToAppend);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const tasksWithDates = useMemo(() => {
    return tasks.filter(t => t.dueDate || t.startDate);
  }, [tasks]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, margin: 0, fontWeight: 700, color: "var(--foreground)", textTransform: "capitalize" }}>
          {format(currentDate, "MMMM yyyy")}
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button 
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            style={{ padding: "6px", borderRadius: 6, background: "var(--surface)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text-secondary)" }}
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            style={{ padding: "6px", borderRadius: 6, background: "var(--surface)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text-secondary)" }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, background: "var(--border)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", flex: 1, minHeight: 600 }}>
        {["L", "M", "X", "J", "V", "S", "D"].map(day => (
          <div key={day} style={{ background: "var(--surface-hover)", padding: "10px", textAlign: "center", fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
            {day}
          </div>
        ))}
        {days.map((day, i) => {
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());
          
          const dayTasks = tasksWithDates.filter(t => {
            const start = t.startDate ? new Date(t.startDate) : t.dueDate ? new Date(t.dueDate) : null;
            const end = t.dueDate ? new Date(t.dueDate) : t.startDate ? new Date(t.startDate) : null;
            if (!start || !end) return false;
            start.setHours(0,0,0,0);
            end.setHours(23,59,59,999);
            return isWithinInterval(day, { start, end });
          });

          return (
            <div key={i} style={{ 
              background: isToday ? "var(--surface-hover)" : "var(--surface)", 
              padding: "8px", 
              minHeight: 100,
              opacity: isCurrentMonth ? 1 : 0.4
            }}>
              <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 500, color: isToday ? "var(--cyan)" : "var(--text-secondary)", marginBottom: 8 }}>
                {format(day, "d")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {dayTasks.map(t => (
                  <div 
                    key={t.id} 
                    onClick={() => onTaskClick(t)}
                    style={{ 
                      fontSize: 11, 
                      padding: "4px 6px", 
                      borderRadius: 4, 
                      background: t.status === "Done" ? "var(--emerald-dim)" : "var(--cyan-dim)", 
                      color: t.status === "Done" ? "var(--emerald)" : "var(--cyan)",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      border: `1px solid ${t.status === "Done" ? "rgba(52, 183, 124, 0.2)" : "rgba(10, 180, 255, 0.2)"}`
                    }}
                  >
                    {t.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
