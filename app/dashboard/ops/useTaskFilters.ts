import { useState, useEffect } from "react";

export function useTaskFilters() {
  const [viewMode, setViewMode] = useState<"kanban" | "table" | "metrics" | "okrs" | "gantt" | "calendar" | "my-tasks">("kanban");
  const [groupBy, setGroupBy] = useState<"status" | "assignee" | "priority">("status");
  const [fAssignee, setFAssignee] = useState("");
  const [fPriority, setFPriority] = useState("");
  const [fTag, setFTag] = useState("");
  const [fArea, setFArea] = useState("");
  const [viewArea, setViewArea] = useState<string>("__all__");

  useEffect(() => {
    try {
      const r = localStorage.getItem("Sodare Core:ops-prefs");
      if (r) {
        const p = JSON.parse(r);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- TODO: [React] Refactor de hooks anti-patrón
        if (p.groupBy) setGroupBy(p.groupBy);
        if (p.viewMode) setViewMode(p.viewMode);
        if (typeof p.fAssignee === "string") setFAssignee(p.fAssignee);
        if (typeof p.fPriority === "string") setFPriority(p.fPriority);
        if (typeof p.fTag === "string") setFTag(p.fTag);
        if (typeof p.fArea === "string") setFArea(p.fArea);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("Sodare Core:ops-prefs", JSON.stringify({ groupBy, viewMode, fAssignee, fPriority, fTag, fArea }));
    } catch { /* ignore */ }
  }, [groupBy, viewMode, fAssignee, fPriority, fTag, fArea]);

  return {
    viewMode, setViewMode,
    groupBy, setGroupBy,
    fAssignee, setFAssignee,
    fPriority, setFPriority,
    fTag, setFTag,
    fArea, setFArea,
    viewArea, setViewArea,
  };
}
