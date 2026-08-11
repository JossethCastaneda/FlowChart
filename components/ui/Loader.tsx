import React from "react";

interface LoaderProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Loader({ size = 24, className = "", style }: LoaderProps) {
  const barWidth = Math.max(2, size * 0.2);
  
  return (
    <div
      role="status"
      aria-label="Cargando..."
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: Math.max(1, size * 0.15),
        width: size,
        height: size,
        ...style,
      }}
    >
      <span className="sr-only" style={{ 
        position: "absolute", 
        width: 1, 
        height: 1, 
        padding: 0, 
        margin: -1, 
        overflow: "hidden", 
        clip: "rect(0, 0, 0, 0)", 
        whiteSpace: "nowrap", 
        border: 0 
      }}>
        Cargando...
      </span>
      <div style={{
        width: barWidth,
        height: "40%",
        backgroundColor: "var(--fc-accent)",
        borderRadius: "999px",
        transformOrigin: "bottom",
        animation: "fc-b1 1.2s ease-in-out infinite",
      }} />
      <div style={{
        width: barWidth,
        height: "70%",
        backgroundColor: "var(--fc-accent)",
        borderRadius: "999px",
        transformOrigin: "bottom",
        animation: "fc-b2 1.2s ease-in-out infinite",
        animationDelay: "0.1s",
      }} />
      <div style={{
        width: barWidth,
        height: "100%",
        backgroundColor: "var(--fc-accent)",
        borderRadius: "999px",
        transformOrigin: "bottom",
        animation: "fc-b3 1.2s ease-in-out infinite",
        animationDelay: "0.2s",
      }} />
    </div>
  );
}
