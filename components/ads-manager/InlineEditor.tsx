import React, { useState, useEffect, useRef } from "react";
import { Edit3, Check, X } from "lucide-react";

interface InlineEditorProps {
  value: string | number;
  type?: "text" | "number";
  prefix?: string;
  onSave: (val: string | number) => Promise<boolean>;
}

export function InlineEditor({ value, type = "text", prefix = "", onSave }: InlineEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currVal, setCurrVal] = useState(value);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrVal(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (currVal === value) {
      setIsEditing(false);
      return;
    }
    setLoading(true);
    const success = await onSave(type === "number" ? parseFloat(currVal as string) || 0 : currVal);
    setLoading(false);
    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setCurrVal(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ display: "flex", alignItems: "center", gap: "4px" }}
      >
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          {prefix && (
            <span
              style={{
                position: "absolute",
                left: "6px",
                fontSize: "11px",
                color: "var(--text-muted)",
              }}
            >
              {prefix}
            </span>
          )}
          <input
            ref={inputRef}
            type={type}
            value={currVal}
            onChange={(e) => setCurrVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
            disabled={loading}
            style={{
              background: "var(--surface-hover)",
              border: "1px solid var(--cyan)",
              borderRadius: "4px",
              color: "var(--foreground)",
              fontSize: "11px",
              fontWeight: 500,
              padding: "4px 6px",
              paddingLeft: prefix ? "16px" : "6px",
              outline: "none",
              width: type === "number" ? "80px" : "160px",
            }}
          />
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            background: "var(--surface)",
            border: "1px solid rgba(52,183,124,0.3)",
            borderRadius: "4px",
            color: "var(--emerald)",
            padding: "4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleCancel}
          disabled={loading}
          style={{
            background: "var(--red-dim)",
            border: "1px solid rgba(229,72,77,0.3)",
            borderRadius: "4px",
            color: "var(--red)",
            padding: "4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className="group"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        cursor: "pointer",
        padding: "2px 4px",
        borderRadius: "4px",
        transition: "background-color 0.2s",
      }}
    >
      <span style={{ fontSize: "11px", fontWeight: 500 }}>
        {prefix}
        {type === "number" ? Number(value).toLocaleString() : value}
      </span>
      <Edit3
        className="w-3 h-3 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ marginTop: "-1px" }}
      />
    </div>
  );
}
