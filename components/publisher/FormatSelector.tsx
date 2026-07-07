"use client";
import React from "react";
import { FileText, Video, Camera, Images } from "lucide-react";

export type PostFormat = "post" | "reel" | "story" | "carousel";

interface Props {
  value: PostFormat;
  onChange: (f: PostFormat) => void;
}

const FORMATS: { key: PostFormat; icon: React.ElementType; label: string; badges?: string[] }[] = [
  { key: "post", icon: FileText, label: "Post" },
  { key: "reel", icon: Video, label: "Reel", badges: ["9:16", "máx 90s"] },
  { key: "story", icon: Camera, label: "Story", badges: ["9:16", "24h"] },
  { key: "carousel", icon: Images, label: "Carousel", badges: ["2-10 items"] },
];

export function FormatSelector({ value, onChange }: Props) {
  const activeFormat = FORMATS.find((f) => f.key === value);

  return (
    <div>
      {/* Pill row */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {FORMATS.map((fmt) => {
          const isActive = value === fmt.key;
          const Icon = fmt.icon;
          return (
            <button
              key={fmt.key}
              onClick={() => onChange(fmt.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 16px",
                borderRadius: 20,
                background: isActive
                  ? "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(0,119,182,0.15))"
                  : "rgba(255,255,255,0.06)",
                border: isActive
                  ? "1px solid rgba(59,130,246,0.4)"
                  : "1px solid var(--hairline)",
                color: isActive ? "var(--cyan)" : "var(--text-secondary)",
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
                transition: "all 0.2s",
                fontFamily: "var(--font-sans)",
              }}
            >
              <Icon style={{ width: 15, height: 15 }} />
              {fmt.label}
            </button>
          );
        })}
      </div>

      {/* Badges for active format */}
      {activeFormat?.badges && activeFormat.badges.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginTop: 8, paddingLeft: 4 }}>
          {activeFormat.badges.map((badge) => (
            <span
              key={badge}
              style={{
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: 10,
                background: "var(--cyan-dim)",
                color: "var(--cyan)",
                border: "1px solid rgba(59,130,246,0.2)",
                fontWeight: 500,
                fontFamily: "var(--font-sans)",
              }}
            >
              {badge}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
