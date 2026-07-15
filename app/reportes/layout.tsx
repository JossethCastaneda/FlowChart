/* 
  Layout para vistas públicas de reportes (sin sidebar, sin auth).
  Aplica el tema 1A Comando y la fuente Orbitron.
*/

import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reporte — Zefirus",
  description: "Reporte de resultados de marketing digital",
};

export default function PublicReportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {children}
    </div>
  );
}
