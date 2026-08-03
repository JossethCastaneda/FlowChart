"use client";

import React, { useMemo, useState } from "react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragOverEvent, DragEndEvent } from "@dnd-kit/core";
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";
import type { Task } from "./types";
import { PRIO_CFG } from "./types";

function sla(due: string | null, status: string, lang: "es" | "en") {
  if (!due || status === "Done") return { i: "none", bg: "transparent", c: "transparent", l: "" };
  const d = new Date(due).getTime() - new Date().getTime();
  const days = Math.ceil(d / (1000 * 3600 * 24));
  if (days < 0) return { i: "danger", bg: "var(--red-dim)", c: "var(--red)", l: lang === "es" ? "Vencida" : "Overdue" };
  if (days === 0) return { i: "warning", bg: "var(--amber-dim)", c: "var(--amber)", l: lang === "es" ? "Hoy" : "Today" };
  if (days <= 2) return { i: "warning", bg: "var(--amber-dim)", c: "var(--amber)", l: lang === "es" ? `En ${days}d` : `In ${days}d` };
  return { i: "ok", bg: "var(--surface-hover)", c: "var(--text-secondary)", l: lang === "es" ? `En ${days}d` : `In ${days}d` };
}

// ─── SORTABLE CARD ───

function SortableKanbanCard({ task, onEdit, lang }: { task: Task; onEdit: (t: Task) => void; lang: "es" | "en" }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { type: "Task", task } });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const sl = sla(task.dueDate, task.status, lang);
  const pri = PRIO_CFG[task.priority] || PRIO_CFG.P2;
  const childDone = task.children?.filter(c => c.status === "Done").length || 0;
  const childTotal = task.children?.length || 0;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 8, padding: "12px 14px", cursor: "grab",
        borderLeft: `4px solid ${pri.c}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        touchAction: "none" // Prevents scrolling on touch devices while dragging
      }}
      {...attributes}
      {...listeners}
      onClick={() => onEdit(task)}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.background = "var(--surface-hover)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface)"; }}
    >
      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 8, lineHeight: 1.4 }}>{task.title}</p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: pri.bg, color: pri.c, fontWeight: 700 }}>{pri.label}</span>
        {task.assignee && <span style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 500 }}>{task.assignee}</span>}
        {sl.i !== "none" && <span style={{ fontSize: 9, color: sl.c, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: sl.bg }}>{sl.l}</span>}
      </div>
      {task.tags?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 8 }}>
          {task.tags.map((tg, i) => <span key={i} style={{ fontSize: 8, padding: "1px 6px", background: "var(--cyan-dim)", color: "var(--cyan)", border: "1px solid var(--border)", borderRadius: 4 }}>{tg}</span>)}
        </div>
      )}
      {childTotal > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-secondary)", marginBottom: 4 }}>
            <span>Subtareas</span>
            <span style={{ fontWeight: 600 }}>{childDone}/{childTotal}</span>
          </div>
          <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(childDone / childTotal) * 100}%`, background: "var(--emerald)", borderRadius: 2, transition: "width 0.3s" }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── KANBAN BOARD ───

export interface KanbanBoardProps {
  tasks: Task[];
  dynamicGroups: Array<{
    key: string;
    label: string;
    color: string;
    wipLimit?: number;
    match: (t: Task) => boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    createDefaults: any;
  }>;
  myPerms: { canAccessOps: boolean };
  lang: "es" | "en";
  onTaskClick: (task: Task) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  onTaskUpdate: (taskId: string, data: any) => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  onCreateTask: (data: any) => Promise<void>;
  groupBy: string; // "status", "assignee", etc to know which field to patch
}

export function KanbanBoard({ tasks, dynamicGroups, myPerms, lang, onTaskClick, onTaskUpdate, onCreateTask, groupBy }: KanbanBoardProps) {
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Filter out any child tasks since Kanban board only shows root tasks
  const rootTasks = useMemo(() => tasks.filter(t => !t.parentId), [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = rootTasks.find(t => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    
    const taskId = active.id as string;
    const overId = over.id as string;
    
    // Determine the target group. 
    // overId could be a column (group key) or a task ID.
    let targetGroupKey = overId;
    if (!dynamicGroups.find(g => g.key === targetGroupKey)) {
      // overId is a task, find which group it belongs to
      const overTask = rootTasks.find(t => t.id === overId);
      if (overTask) {
        const group = dynamicGroups.find(g => g.match(overTask));
        if (group) targetGroupKey = group.key;
      }
    }

    const group = dynamicGroups.find(g => g.key === targetGroupKey);
    if (group && activeTask) {
      // Only patch if the attribute actually changed
      const currentVal = groupBy === "status" ? activeTask.status : groupBy === "assignee" ? activeTask.assignee : groupBy === "priority" ? activeTask.priority : activeTask.status;
      
      let patchValue = targetGroupKey;
      if (groupBy === "assignee" && targetGroupKey === "__none__") patchValue = ""; // Handle unassigned

      if (currentVal !== patchValue) {
        await onTaskUpdate(taskId, group.createDefaults);
      }
    }
  };

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCorners} 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${dynamicGroups.length}, 1fr)`, gap: 12, minHeight: 400, overflowX: "auto", paddingBottom: 16 }}>
        {dynamicGroups.map(g => {
          const gt = rootTasks.filter(g.match);
          return (
            <div key={g.key} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, borderTop: `4px solid ${g.color}`, display: "flex", flexDirection: "column", minWidth: 280, padding: 6 }}>
              <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: g.color }}>{g.label}</span>
                  <span style={{ fontSize: 10, color: g.wipLimit && gt.length > g.wipLimit ? "var(--red)" : "var(--text-muted)", background: g.wipLimit && gt.length > g.wipLimit ? "var(--red-dim)" : "var(--border)", padding: "1px 6px", borderRadius: 8 }}>
                    {gt.length} {g.wipLimit ? `/ ${g.wipLimit}` : ""}
                  </span>
                </div>
                {myPerms.canAccessOps && (
                  <button onClick={() => { setAddingIn(g.key); setNewTitle(""); }} aria-label="Agregar tarea" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2 }} onMouseEnter={e => e.currentTarget.style.color = g.color} onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}>
                    <Plus style={{ width: 14, height: 14 }} />
                  </button>
                )}
              </div>
              
              <SortableContext id={g.key} items={gt.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 10, flex: 1, overflowY: "auto", minHeight: 150 }}>
                  {gt.map(tsk => <SortableKanbanCard key={tsk.id} task={tsk} onEdit={onTaskClick} lang={lang} />)}
                  {addingIn === g.key && (
                    <input
                      autoFocus
                      value={newTitle} 
                      onChange={e => setNewTitle(e.target.value)}
                      onKeyDown={e => { 
                        if (e.key === "Enter" && newTitle.trim()) { 
                          onCreateTask({ title: newTitle.trim(), ...g.createDefaults }); 
                          setAddingIn(null); setNewTitle(""); 
                        } 
                        if (e.key === "Escape") { setAddingIn(null); setNewTitle(""); } 
                      }}
                      onBlur={() => { 
                        if (newTitle.trim()) {
                          onCreateTask({ title: newTitle.trim(), ...g.createDefaults }); 
                        }
                        setAddingIn(null); setNewTitle(""); 
                      }}
                      placeholder={lang === "es" ? "Nombre..." : "Name..."}
                      style={{ background: "var(--surface-hover)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px", color: "var(--foreground)", fontSize: 12, outline: "none" }}
                    />
                  )}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div style={{ opacity: 0.8, cursor: "grabbing" }}>
            <SortableKanbanCard task={activeTask} onEdit={onTaskClick} lang={lang} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
