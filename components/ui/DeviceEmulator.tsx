"use client";

import React from "react";
import { Wifi, Battery, Signal } from "lucide-react";

export type DeviceType = "ios" | "android";

interface DeviceEmulatorProps {
  type: DeviceType;
  theme?: "dark" | "light";
  children?: React.ReactNode;
}

export default function DeviceEmulator({ type, theme = "light", children }: DeviceEmulatorProps) {
  const isIOS = type === "ios";

  // Simulate current time for the status bar
  const time = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: isIOS });

  return (
    <div style={{
      width: 320,
      height: 640,
      background: "var(--background)",
      borderRadius: isIOS ? 46 : 36,
      border: "10px solid #1a1b23", // Device frame color
      boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.1), inset 0 0 2px 2px rgba(255,255,255,0.05)",
      position: "relative",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      margin: "0 auto",
      flexShrink: 0,
    }}>
      {/* Device specific hardware */}
      {isIOS ? (
        <>
          {/* Action Button */}
          <div style={{ position: "absolute", top: 120, left: -12, width: 3, height: 26, background: "#1a1b23", borderRadius: "3px 0 0 3px" }} />
          {/* Volume Up */}
          <div style={{ position: "absolute", top: 165, left: -12, width: 3, height: 50, background: "#1a1b23", borderRadius: "3px 0 0 3px" }} />
          {/* Volume Down */}
          <div style={{ position: "absolute", top: 225, left: -12, width: 3, height: 50, background: "#1a1b23", borderRadius: "3px 0 0 3px" }} />
          {/* Power Button */}
          <div style={{ position: "absolute", top: 180, right: -12, width: 3, height: 75, background: "#1a1b23", borderRadius: "0 3px 3px 0" }} />
          
          {/* Dynamic Island */}
          <div style={{
            position: "absolute",
            top: 8,
            left: "50%",
            transform: "translateX(-50%)",
            width: 104,
            height: 32,
            background: "#000",
            borderRadius: 16,
            zIndex: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 8px",
            boxShadow: "inset 0 0 2px rgba(255,255,255,0.2)"
          }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#0a0a0a", boxShadow: "inset 0 0 2px rgba(255,255,255,0.1)" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#080808", border: "2px solid #0f0f0f", position: "relative" }}>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 4, height: 4, background: "#111", borderRadius: "50%" }} />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Volume Rocker */}
          <div style={{ position: "absolute", top: 130, right: -12, width: 3, height: 90, background: "#1a1b23", borderRadius: "0 3px 3px 0" }} />
          {/* Power Button */}
          <div style={{ position: "absolute", top: 240, right: -12, width: 3, height: 45, background: "#1a1b23", borderRadius: "0 3px 3px 0" }} />
          
          {/* Android Hole Punch */}
          <div style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            width: 18,
            height: 18,
            background: "#000",
            borderRadius: "50%",
            zIndex: 40,
            border: "1px solid #111",
            boxShadow: "inset 0 0 4px rgba(255,255,255,0.1)"
          }}>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 6, height: 6, background: "#111", borderRadius: "50%" }} />
          </div>
        </>
      )}

      {/* Status Bar */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 20px 8px",
        fontSize: 12,
        fontWeight: 600,
        color: theme === "dark" ? "#fff" : "var(--fc-text)",
        zIndex: 30,
        pointerEvents: "none",
      }}>
        {isIOS ? (
          <>
            <span style={{ fontSize: 13.5, letterSpacing: -0.5, paddingLeft: 10 }}>{time}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, paddingRight: 6 }}>
              {/* Fake Signal */}
              <div style={{ display: "flex", gap: 1, alignItems: "flex-end", height: 10, paddingBottom: 1 }}>
                {[4, 6, 8, 10].map(h => <div key={h} style={{ width: 3, height: h, background: "currentColor", borderRadius: 1 }} />)}
              </div>
              <Wifi size={16} strokeWidth={2.5} />
              {/* Fake Battery */}
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <div style={{ width: 22, height: 11, border: "1px solid currentColor", borderRadius: 3, padding: 1, display: "flex" }}>
                  <div style={{ background: "currentColor", height: "100%", width: "80%", borderRadius: 1.5 }} />
                </div>
                <div style={{ width: 1.5, height: 4, background: "currentColor", borderTopRightRadius: 2, borderBottomRightRadius: 2, marginLeft: 1, opacity: 0.8 }} />
              </div>
            </div>
          </>
        ) : (
          <>
            <span style={{ fontSize: 12, paddingLeft: 6 }}>{time}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Wifi size={14} strokeWidth={2.5} />
              <div style={{ display: "flex", gap: 1, alignItems: "flex-end", height: 10, paddingBottom: 1 }}>
                {[4, 6, 8, 10].map(h => <div key={h} style={{ width: 3, height: h, background: "currentColor", borderRadius: 1 }} />)}
              </div>
              <div style={{ width: 22, height: 11, border: "1px solid currentColor", borderRadius: 2, padding: 1, display: "flex", alignItems: "center" }}>
                <div style={{ background: "currentColor", height: "100%", width: "70%", borderRadius: 1 }} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Screen Content Area */}
      <div style={{
        flex: 1,
        width: "100%",
        height: "100%",
        overflowY: "auto",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        background: "transparent",
      }}>
        {children}
      </div>
      
      {/* iOS Home Indicator / Android Nav Bar */}
      {isIOS ? (
        <div style={{
          position: "absolute",
          bottom: 8,
          left: "50%",
          transform: "translateX(-50%)",
          width: 110,
          height: 4,
          background: theme === "dark" ? "#fff" : "#000",
          borderRadius: 4,
          zIndex: 40,
        }} />
      ) : (
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: 24,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 40,
          background: "transparent",
          zIndex: 40,
        }}>
          <div style={{ width: 30, height: 4, borderRadius: 2, background: theme === "dark" ? "#fff" : "#000", opacity: 0.8 }} />
        </div>
      )}
    </div>
  );
}
