/**
 * CustomTooltip — Sodare premium chart tooltip
 * Sólido (sin blur), JetBrains Mono para valores, acento cyan izquierdo
 */

interface TooltipEntry {
  name: string;
  value: number | string;
  color: string;
  unit?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | string;
    color?: string;
    fill?: string;
    stroke?: string;
    unit?: string;
  }>;
  label?: string;
  /** (name, value) => displayString — or legacy (value, name) => [valueStr, labelStr] */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formatter?: (name: any, value: any) => any;
  labelFormatter?: (label: string) => string;
}

export function CustomTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
}: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const displayLabel = labelFormatter ? labelFormatter(label ?? "") : (label ?? "");

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-strong)",
        borderLeft: "3px solid var(--cyan)",
        borderRadius: 8,
        padding: "10px 14px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)",
        minWidth: 160,
        pointerEvents: "none",
      }}
    >
      {/* Date / Label */}
      {displayLabel && (
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: 8,
          }}
        >
          {displayLabel}
        </p>
      )}

      {/* Rows */}
      {payload.map((entry, i) => {
        const color = entry.color || entry.fill || entry.stroke || "var(--cyan)";
        const rawValue = entry.value;
        // Support legacy formatter that returns [valueStr, labelStr] array
        const fmtResult = formatter ? formatter(entry.name, rawValue) : null;
        const displayValue = fmtResult != null
          ? (Array.isArray(fmtResult) ? String(fmtResult[0]) : String(fmtResult))
          : (typeof rawValue === "number" ? rawValue.toLocaleString("es-MX") : String(rawValue));
        const displayName = Array.isArray(fmtResult) && fmtResult[1] != null ? String(fmtResult[1]) : entry.name;

        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: i < payload.length - 1 ? 5 : 0,
            }}
          >
            {/* Dot + name */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: color,
                  flexShrink: 0,
                  boxShadow: `0 0 5px ${color}80`,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                {displayName}
              </span>
            </div>

            {/* Value in JetBrains Mono */}
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--foreground)",
                letterSpacing: "0.02em",
              }}
            >
              {displayValue}
              {entry.unit && (
                <span style={{ color: "var(--text-muted)", marginLeft: 2 }}>{entry.unit}</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
