import React from "react";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = "", style = {} }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{
        backgroundColor: "rgba(0, 212, 255, 0.05)",
        backgroundImage: "linear-gradient(90deg, rgba(0, 212, 255, 0) 0%, rgba(0, 212, 255, 0.05) 50%, rgba(0, 212, 255, 0) 100%)",
        backgroundSize: "200% 100%",
        animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        ...style,
      }}
    />
  );
}
