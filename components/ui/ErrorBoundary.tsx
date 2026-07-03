"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
  name?: string; // Optional name to log which component failed
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary] ${this.props.name || "Component"} caught error:`, error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className={this.props.className || ""}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            textAlign: "center",
            background: "rgba(229,72,77,0.05)",
            border: "1px solid rgba(229,72,77,0.2)",
            borderRadius: "12px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Top neon accent */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "2px",
            background: "linear-gradient(90deg, transparent, var(--red), transparent)",
          }} />

          <div style={{
            width: "44px", height: "44px", borderRadius: "12px",
            background: "rgba(229,72,77,0.1)",
            border: "1px solid rgba(229,72,77,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: "12px",
            boxShadow: "0 0 20px rgba(229,72,77,0.15)",
          }}>
            <AlertTriangle style={{ width: 20, height: 20, color: "var(--red)" }} />
          </div>

          <p style={{
            fontFamily: "var(--font-display)",
            fontSize: "11px", fontWeight: 700,
            letterSpacing: "0.15em", textTransform: "uppercase",
            color: "var(--red)", marginBottom: "6px",
          }}>
            Error al renderizar
          </p>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px", lineHeight: 1.5 }}>
            {this.state.error?.message || "Ocurrió un error inesperado en esta sección."}
          </p>

          <button
            onClick={this.handleRetry}
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "7px 16px", borderRadius: "6px",
              background: "rgba(229,72,77,0.1)",
              border: "1px solid rgba(229,72,77,0.25)",
              color: "var(--red)", fontSize: "11px", fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.2s",
            }}
          >
            <RefreshCcw style={{ width: 12, height: 12 }} />
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
