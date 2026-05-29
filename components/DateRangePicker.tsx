"use client";

import { useState, useEffect, useRef } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

/* ═══════════════════════════════════════
   PRESETS
   ═══════════════════════════════════════ */

const DATE_PRESETS = [
  { id: "today",           label: "Hoy" },
  { id: "yesterday",       label: "Ayer" },
  { id: "today_yesterday", label: "Hoy y ayer" },
  { id: "last_7d",         label: "Últimos 7 días" },
  { id: "last_14d",        label: "Últimos 14 días" },
  { id: "last_28d",        label: "Últimos 28 días" },
  { id: "last_30d",        label: "Últimos 30 días" },
  { id: "this_week_sun_today",  label: "Esta semana" },
  { id: "last_week_sun_sat",    label: "La semana pasada" },
  { id: "this_month",      label: "Este mes" },
  { id: "last_month",      label: "El mes pasado" },
  { id: "maximum",         label: "Máximo" },
  { id: "custom",          label: "Personalizado" },
];

const MONTH_NAMES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTH_NAMES_LONG = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/* ═══════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════ */

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// Monday = 0, Sunday = 6
function getFirstDayOfWeekMondayBased(year: number, month: number) {
  const day = new Date(year, month, 1).getDay(); // 0=Sun
  return day === 0 ? 6 : day - 1;
}

function fmt(d: Date) {
  return d.toISOString().split("T")[0];
}

function fmtDisplay(d: Date) {
  return `${d.getDate()} de ${MONTH_NAMES_LONG[d.getMonth()]} de ${d.getFullYear()}`;
}

function fmtShort(d: Date) {
  return `${d.getDate()} de ${MONTH_NAMES[d.getMonth()]} ...`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getPresetLabel(presetId: string): string {
  return DATE_PRESETS.find(p => p.id === presetId)?.label || "Seleccionar rango";
}

function getPresetDates(presetId: string): { start: Date | null; end: Date | null } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  switch (presetId) {
    case "today":
      return { start: today, end: today };
    case "yesterday":
      return { start: yesterday, end: yesterday };
    case "today_yesterday":
      return { start: yesterday, end: today };
    case "last_7d": {
      const s = new Date(today);
      s.setDate(s.getDate() - 6);
      return { start: s, end: today };
    }
    case "last_14d": {
      const s = new Date(today);
      s.setDate(s.getDate() - 13);
      return { start: s, end: today };
    }
    case "last_28d": {
      const s = new Date(today);
      s.setDate(s.getDate() - 27);
      return { start: s, end: today };
    }
    case "last_30d": {
      const s = new Date(today);
      s.setDate(s.getDate() - 29);
      return { start: s, end: today };
    }
    case "this_week_sun_today": {
      const dayOfWeek = today.getDay();
      const s = new Date(today);
      s.setDate(s.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      return { start: s, end: today };
    }
    case "last_week_sun_sat": {
      const dayOfWeek = today.getDay();
      const thisMonday = new Date(today);
      thisMonday.setDate(thisMonday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(lastMonday.getDate() - 7);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastSunday.getDate() + 6);
      return { start: lastMonday, end: lastSunday };
    }
    case "this_month":
      return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: today };
    case "last_month": {
      const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const e = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: s, end: e };
    }
    default:
      return { start: null, end: null };
  }
}

/* ═══════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════ */

interface DateRangePickerProps {
  datePreset: string;
  dateStart: string;
  dateEnd: string;
  showDatePicker: boolean;
  setShowDatePicker: (v: boolean) => void;
  onPresetSelect: (preset: string) => void;
  onCustomRange: (start: string, end: string) => void;
}

export default function DateRangePicker({
  datePreset,
  dateStart,
  dateEnd,
  showDatePicker,
  setShowDatePicker,
  onPresetSelect,
  onCustomRange,
}: DateRangePickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [calMonth, setCalMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selStart, setSelStart] = useState<Date | null>(null);
  const [selEnd, setSelEnd] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [pendingPreset, setPendingPreset] = useState<string>(datePreset);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync on open
  useEffect(() => {
    if (showDatePicker) {
      setPendingPreset(datePreset);
      if (datePreset === "custom" && dateStart && dateEnd) {
        setSelStart(new Date(dateStart + "T00:00:00"));
        setSelEnd(new Date(dateEnd + "T00:00:00"));
      } else {
        const { start, end } = getPresetDates(datePreset);
        setSelStart(start);
        setSelEnd(end);
      }
      setCalMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDatePicker]);

  // Click outside
  useEffect(() => {
    if (!showDatePicker) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDatePicker, setShowDatePicker]);

  const handlePresetClick = (presetId: string) => {
    setPendingPreset(presetId);
    if (presetId === "custom") {
      setSelStart(null);
      setSelEnd(null);
      return;
    }
    if (presetId === "maximum") {
      setSelStart(null);
      setSelEnd(null);
      return;
    }
    const { start, end } = getPresetDates(presetId);
    setSelStart(start);
    setSelEnd(end);
    if (start) {
      setCalMonth(new Date(start.getFullYear(), start.getMonth(), 1));
    }
  };

  const handleDayClick = (date: Date) => {
    setPendingPreset("custom");
    if (!selStart || (selStart && selEnd)) {
      setSelStart(date);
      setSelEnd(null);
    } else {
      if (date < selStart) {
        setSelEnd(selStart);
        setSelStart(date);
      } else {
        setSelEnd(date);
      }
    }
  };

  const handleApply = () => {
    if (pendingPreset === "maximum") {
      onPresetSelect("maximum");
      setShowDatePicker(false);
      return;
    }
    if (pendingPreset !== "custom" && pendingPreset !== "maximum") {
      // Use the Facebook preset directly
      onPresetSelect(pendingPreset);
      setShowDatePicker(false);
      return;
    }
    if (selStart && selEnd) {
      onCustomRange(fmt(selStart), fmt(selEnd));
      setShowDatePicker(false);
    }
  };

  const handleCancel = () => {
    setShowDatePicker(false);
  };

  // Calendar helpers
  const isInRange = (date: Date) => {
    if (!selStart) return false;
    const end = selEnd || hoverDate;
    if (!end) return false;
    const s = selStart < end ? selStart : end;
    const e = selStart < end ? end : selStart;
    return date >= s && date <= e;
  };

  const isRangeStart = (date: Date) => {
    if (!selStart) return false;
    return sameDay(date, selStart);
  };

  const isRangeEnd = (date: Date) => {
    if (!selEnd && !hoverDate) return false;
    const end = selEnd || hoverDate;
    if (!end) return false;
    if (selStart && end < selStart) return sameDay(date, selStart);
    return sameDay(date, end);
  };

  const nextMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1);

  const buttonLabel = (() => {
    if (datePreset === "custom" && dateStart && dateEnd) {
      const s = new Date(dateStart + "T00:00:00");
      const e = new Date(dateEnd + "T00:00:00");
      return `${s.getDate()} ${MONTH_NAMES[s.getMonth()]} ${s.getFullYear()} – ${e.getDate()} ${MONTH_NAMES[e.getMonth()]} ${e.getFullYear()}`;
    }
    return getPresetLabel(datePreset);
  })();

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Trigger Button */}
      <button
        onClick={() => setShowDatePicker(!showDatePicker)}
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          background: showDatePicker ? "rgba(0,212,255,0.08)" : "rgba(10,15,30,0.6)",
          border: showDatePicker ? "1px solid rgba(0,212,255,0.3)" : "1px solid var(--border)",
          padding: "7px 14px", borderRadius: "8px", fontSize: "12px", color: "#e2e8f0",
          cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap", fontWeight: 500
        }}
      >
        <Calendar className="w-3.5 h-3.5" style={{ color: "var(--cyan)" }} />
        <span>{buttonLabel}</span>
        <ChevronRight
          className="w-3 h-3"
          style={{
            opacity: 0.4, marginLeft: "2px", transition: "transform 0.2s",
            transform: showDatePicker ? "rotate(90deg)" : "rotate(90deg)"
          }}
        />
      </button>

      {/* Dropdown Panel */}
      {showDatePicker && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 9999,
          background: "#1a1f2e", border: "1px solid rgba(148,163,184,0.15)", borderRadius: "12px",
          boxShadow: "0 25px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(148,163,184,0.05)",
          display: "flex", flexDirection: "column", overflow: "hidden"
        }}>
          {/* Main content area */}
          <div style={{ display: "flex" }}>

            {/* ── LEFT: Presets ── */}
            <div style={{
              width: "170px", borderRight: "1px solid rgba(148,163,184,0.1)",
              overflowY: "auto", maxHeight: "400px",
              padding: "8px 0"
            }}>
              {DATE_PRESETS.map(p => {
                const active = pendingPreset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handlePresetClick(p.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      width: "100%", textAlign: "left", padding: "8px 14px",
                      fontSize: "12px", border: "none", cursor: "pointer",
                      background: active ? "rgba(0,212,255,0.06)" : "transparent",
                      color: active ? "var(--cyan)" : "rgba(255,255,255,0.7)",
                      fontWeight: active ? 600 : 400,
                      transition: "all 0.15s"
                    }}
                  >
                    {/* Radio button */}
                    <div style={{
                      width: "14px", height: "14px", borderRadius: "50%",
                      border: active ? "2px solid var(--cyan)" : "2px solid rgba(148,163,184,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, transition: "all 0.15s"
                    }}>
                      {active && (
                        <div style={{
                          width: "7px", height: "7px", borderRadius: "50%",
                          background: "var(--cyan)"
                        }} />
                      )}
                    </div>
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* ── RIGHT: Calendars ── */}
            <div style={{ flex: 1, padding: "16px 20px", minWidth: "460px" }}>
              {/* Month navigation */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <button
                  onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
                  style={{
                    background: "none", border: "1px solid rgba(148,163,184,0.15)", borderRadius: "6px",
                    padding: "4px", cursor: "pointer", color: "rgba(255,255,255,0.7)", display: "flex",
                    transition: "all 0.15s"
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div style={{ display: "flex", gap: "80px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "white" }}>
                    {MONTH_NAMES_LONG[calMonth.getMonth()]} {calMonth.getFullYear()}
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "white" }}>
                    {MONTH_NAMES_LONG[nextMonth.getMonth()]} {nextMonth.getFullYear()}
                  </span>
                </div>

                <button
                  onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
                  style={{
                    background: "none", border: "1px solid rgba(148,163,184,0.15)", borderRadius: "6px",
                    padding: "4px", cursor: "pointer", color: "rgba(255,255,255,0.7)", display: "flex",
                    transition: "all 0.15s"
                  }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Dual calendar grid */}
              <div style={{ display: "flex", gap: "24px" }}>
                <MonthGrid
                  monthDate={calMonth}
                  today={today}
                  selStart={selStart}
                  selEnd={selEnd}
                  hoverDate={hoverDate}
                  isInRange={isInRange}
                  isRangeStart={isRangeStart}
                  isRangeEnd={isRangeEnd}
                  onDayClick={handleDayClick}
                  onDayHover={setHoverDate}
                />
                <MonthGrid
                  monthDate={nextMonth}
                  today={today}
                  selStart={selStart}
                  selEnd={selEnd}
                  hoverDate={hoverDate}
                  isInRange={isInRange}
                  isRangeStart={isRangeStart}
                  isRangeEnd={isRangeEnd}
                  onDayClick={handleDayClick}
                  onDayHover={setHoverDate}
                />
              </div>

              {/* Selection summary */}
              <div style={{
                display: "flex", alignItems: "center", gap: "12px",
                marginTop: "16px", paddingTop: "12px",
                borderTop: "1px solid rgba(148,163,184,0.1)"
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  background: "rgba(10,15,30,0.5)", border: "1px solid rgba(148,163,184,0.1)",
                  borderRadius: "6px", padding: "6px 12px", fontSize: "11px", color: "rgba(148,163,184,0.6)",
                  flex: 1
                }}>
                  {selStart ? fmtDisplay(selStart) : "Fecha inicio"}
                </div>
                <span style={{ color: "rgba(148,163,184,0.3)", fontSize: "11px" }}>–</span>
                <div style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  background: "rgba(10,15,30,0.5)", border: "1px solid rgba(148,163,184,0.1)",
                  borderRadius: "6px", padding: "6px 12px", fontSize: "11px", color: "rgba(148,163,184,0.6)",
                  flex: 1
                }}>
                  {selEnd ? fmtDisplay(selEnd) : "Fecha fin"}
                </div>
              </div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 20px",
            borderTop: "1px solid rgba(148,163,184,0.1)",
            background: "rgba(10,15,30,0.3)"
          }}>
            <span style={{ fontSize: "10px", color: "rgba(148,163,184,0.35)" }}>
              Las fechas se muestran en la Hora de Ciudad de México (Centro)
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleCancel}
                style={{
                  padding: "7px 20px", fontSize: "12px", fontWeight: 500, borderRadius: "6px",
                  background: "transparent", border: "1px solid rgba(148,163,184,0.2)",
                  color: "rgba(255,255,255,0.7)", cursor: "pointer", transition: "all 0.15s"
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleApply}
                disabled={pendingPreset === "custom" && (!selStart || !selEnd)}
                style={{
                  padding: "7px 20px", fontSize: "12px", fontWeight: 600, borderRadius: "6px",
                  background: (pendingPreset !== "custom" || (selStart && selEnd)) ? "var(--cyan)" : "rgba(148,163,184,0.15)",
                  color: (pendingPreset !== "custom" || (selStart && selEnd)) ? "#0a0f1e" : "rgba(148,163,184,0.3)",
                  border: "none", cursor: (pendingPreset !== "custom" || (selStart && selEnd)) ? "pointer" : "default",
                  transition: "all 0.15s", letterSpacing: "0.02em"
                }}
              >
                Actualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   MONTH GRID SUB-COMPONENT
   ═══════════════════════════════════════ */

function MonthGrid({
  monthDate, today, selStart, selEnd, hoverDate,
  isInRange, isRangeStart, isRangeEnd,
  onDayClick, onDayHover
}: {
  monthDate: Date;
  today: Date;
  selStart: Date | null;
  selEnd: Date | null;
  hoverDate: Date | null;
  isInRange: (d: Date) => boolean;
  isRangeStart: (d: Date) => boolean;
  isRangeEnd: (d: Date) => boolean;
  onDayClick: (d: Date) => void;
  onDayHover: (d: Date | null) => void;
}) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeekMondayBased(year, month);

  const days: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));

  return (
    <div style={{ flex: 1 }}>
      {/* Day labels */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0" }}>
        {DAY_LABELS.map(d => (
          <div key={d} style={{
            textAlign: "center", fontSize: "10px", color: "rgba(148,163,184,0.4)",
            padding: "0 0 8px 0", fontWeight: 600
          }}>
            {d}
          </div>
        ))}
      </div>
      {/* Day cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0" }}>
        {days.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} style={{ height: "32px" }} />;

          const isToday = sameDay(date, today);
          const isFuture = date > today;
          const inRange = isInRange(date);
          const isStart = isRangeStart(date);
          const isEnd = isRangeEnd(date);
          const isEdge = isStart || isEnd;

          return (
            <div
              key={date.toISOString()}
              style={{
                position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
                height: "32px",
                background: inRange && !isEdge ? "rgba(0,212,255,0.12)" : "transparent",
                borderRadius: isStart ? "6px 0 0 6px" : isEnd ? "0 6px 6px 0" : "0"
              }}
            >
              <button
                onClick={() => !isFuture && onDayClick(date)}
                onMouseEnter={() => !isFuture && onDayHover(date)}
                onMouseLeave={() => onDayHover(null)}
                disabled={isFuture}
                style={{
                  width: "28px", height: "28px", fontSize: "12px",
                  borderRadius: "6px", cursor: isFuture ? "default" : "pointer",
                  border: isToday && !isEdge ? "1px solid var(--cyan)" : "1px solid transparent",
                  background: isEdge ? "var(--cyan)" : "transparent",
                  color: isFuture ? "rgba(148,163,184,0.15)" : isEdge ? "#0a0f1e" : isToday ? "var(--cyan)" : inRange ? "var(--cyan)" : "rgba(255,255,255,0.8)",
                  fontWeight: isEdge || isToday ? 700 : 400,
                  transition: "all 0.1s", display: "flex", alignItems: "center", justifyContent: "center",
                  padding: 0
                }}
              >
                {date.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
