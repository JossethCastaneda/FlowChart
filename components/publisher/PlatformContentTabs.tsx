"use client";
import React from "react";

interface Props {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  activePlatform: "facebook" | "instagram";
  onPlatformChange: (p: "facebook" | "instagram") => void;
  fbContent: string;
  onFbContentChange: (v: string) => void;
  igContent: string;
  onIgContentChange: (v: string) => void;
  generalContent: string;
}

const LIMITS: Record<string, number> = {
  facebook: 63206,
  instagram: 2200,
};

export function PlatformContentTabs({
  enabled,
  onToggle,
  activePlatform,
  onPlatformChange,
  fbContent,
  onFbContentChange,
  igContent,
  onIgContentChange,
  generalContent,
}: Props) {
  const activeContent = activePlatform === "facebook" ? fbContent : igContent;
  const activeOnChange = activePlatform === "facebook" ? onFbContentChange : onIgContentChange;
  const charLimit = LIMITS[activePlatform];
  const charCount = activeContent.length;
  const charPercent = Math.min((charCount / charLimit) * 100, 100);
  const isOverLimit = charCount > charLimit;
  const isNearLimit = charPercent > 90 && !isOverLimit;

  return (
    <div>
      {/* Toggle row */}
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "10px 20px",
          border: "1px solid var(--hairline)",
        }}
      >
        <button
          onClick={() => onToggle(false)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 14px",
            borderRadius: 20,
            background: !enabled ? "rgba(255,255,255,0.09)" : "transparent",
            border: !enabled
              ? "1px solid var(--hairline)"
              : "1px solid rgba(255,255,255,0.06)",
            color: !enabled ? "var(--fc-text)" : "var(--fc-text-muted)",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.2s",
            fontFamily: "var(--font-sans)",
          }}
        >
          Mismo texto
        </button>
        <button
          onClick={() => onToggle(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 14px",
            borderRadius: 20,
            background: enabled ? "rgba(59,130,246,0.12)" : "transparent",
            border: enabled
              ? "1px solid rgba(59,130,246,0.3)"
              : "1px solid rgba(255,255,255,0.06)",
            color: enabled ? "var(--fc-accent)" : "var(--fc-text-muted)",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.2s",
            fontFamily: "var(--font-sans)",
          }}
        >
          Por plataforma
        </button>
      </div>

      {/* Platform tabs + editor (only when enabled) */}
      {enabled && (
        <div>
          {/* Platform tabs */}
          <div
            style={{
              display: "flex",
              border: "1px solid var(--hairline)",
              padding: "0 20px",
            }}
          >
            {/* Facebook tab */}
            <button
              onClick={() => onPlatformChange("facebook")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                borderBottom:
                  activePlatform === "facebook"
                    ? "2px solid #1877f2"
                    : "2px solid transparent",
                color: activePlatform === "facebook" ? "var(--fc-accent)" : "var(--fc-text-muted)",
                fontSize: 12,
                fontWeight: activePlatform === "facebook" ? 600 : 500,
                cursor: "pointer",
                transition: "all 0.2s",
                fontFamily: "var(--font-sans)",
              }}
            >
              Facebook
            </button>
            {/* Instagram tab */}
            <button
              onClick={() => onPlatformChange("instagram")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                borderBottom:
                  activePlatform === "instagram"
                    ? "2px solid #E1306C"
                    : "2px solid transparent",
                color: activePlatform === "instagram" ? "#bc5fb2" : "var(--fc-text-muted)",
                fontSize: 12,
                fontWeight: activePlatform === "instagram" ? 600 : 500,
                cursor: "pointer",
                transition: "all 0.2s",
                fontFamily: "var(--font-sans)",
              }}
            >
              Instagram
            </button>
          </div>

          {/* Textarea */}
          <div style={{ padding: "0 20px" }}>
            <textarea
              value={activeContent}
              onChange={(e) => activeOnChange(e.target.value)}
              placeholder={
                generalContent ||
                (activePlatform === "facebook"
                  ? "Texto para Facebook..."
                  : "Texto para Instagram...")
              }
              style={{
                width: "100%",
                minHeight: 120,
                background: "transparent",
                border: "none",
                outline: "none",
                resize: "none",
                padding: "14px 0",
                color: "var(--fc-text)",
                fontSize: 14,
                lineHeight: 1.6,
                fontFamily: "var(--font-sans)",
              }}
            />
          </div>

          {/* Char counter + progress bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 20px 12px",
              justifyContent: "flex-end",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: isOverLimit
                  ? "var(--fc-danger)"
                  : isNearLimit
                  ? "var(--fc-warning)"
                  : "var(--fc-text-muted)",
              }}
            >
              {charCount.toLocaleString()} / {charLimit.toLocaleString()}
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
                    ? "var(--fc-danger)"
                    : isNearLimit
                    ? "var(--fc-warning)"
                    : "var(--fc-accent)",
                  transition: "all 0.3s",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
