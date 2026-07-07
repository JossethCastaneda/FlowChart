"use client";
import React, { useState } from "react";
import { ChevronDown, ChevronUp, MessageCircle } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
}

const MAX_CHARS = 2200;

export function FirstCommentExpander({ value, onChange, visible }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!visible) return null;

  const charCount = value.length;
  const charPercent = Math.min((charCount / MAX_CHARS) * 100, 100);
  const isOverLimit = charCount > MAX_CHARS;
  const isNearLimit = charPercent > 90 && !isOverLimit;

  return (
    <div>
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "10px 20px",
          background: "rgba(225,48,108,0.04)",
          border: "1px solid var(--hairline)",
          borderBottom: expanded ? "1px solid rgba(255,255,255,0.06)" : "none",
          borderLeft: "none",
          borderRight: "none",
          cursor: "pointer",
          transition: "background 0.15s",
          textAlign: "left",
        }}
      >
        <MessageCircle
          style={{ width: 15, height: 15, color: "#E1306C", flexShrink: 0 }}
        />
        <span
          style={{
            flex: 1,
            fontSize: 12,
            fontWeight: 500,
            color: "#bc5fb2",
            fontFamily: "var(--font-sans)",
          }}
        >
          Agregar primer comentario en Instagram
        </span>
        {expanded ? (
          <ChevronUp style={{ width: 14, height: 14, color: "#bc5fb2" }} />
        ) : (
          <ChevronDown style={{ width: 14, height: 14, color: "#bc5fb2" }} />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: "12px 20px" }}>
          {/* Textarea */}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={MAX_CHARS}
            placeholder="Ej: #hashtags, llamada a la acción, link en bio..."
            style={{
              width: "100%",
              minHeight: 90,
              background: "rgba(225,48,108,0.04)",
              border: "1px solid rgba(225,48,108,0.15)",
              borderRadius: 8,
              outline: "none",
              resize: "none",
              padding: "12px 14px",
              color: "var(--foreground)",
              fontSize: 13,
              lineHeight: 1.6,
              fontFamily: "var(--font-sans)",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(225,48,108,0.35)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(225,48,108,0.15)";
            }}
          />

          {/* Char counter + progress bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 8,
              justifyContent: "flex-end",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: isOverLimit
                  ? "var(--red)"
                  : isNearLimit
                  ? "var(--amber)"
                  : "var(--text-muted)",
              }}
            >
              {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </span>
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                background: "var(--surface-hover)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${charPercent}%`,
                  height: "100%",
                  borderRadius: 2,
                  background: isOverLimit
                    ? "var(--red)"
                    : isNearLimit
                    ? "var(--amber)"
                    : "#E1306C",
                  transition: "all 0.3s",
                }}
              />
            </div>
          </div>

          {/* Info note */}
          <div
            style={{
              marginTop: 10,
              fontSize: 11,
              color: "var(--text-muted)",
              fontStyle: "italic",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ color: "#E1306C", fontSize: 14 }}>ℹ</span>
            Se publica automáticamente justo después del post
          </div>
        </div>
      )}
    </div>
  );
}
