"use client";

import React from "react";
import Link from "next/link";

export default function CondicionesDelServicio() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, var(--background) 0%, var(--background) 100%)",
      color: "var(--foreground)",
      fontFamily: "Inter, system-ui, sans-serif",
      padding: "80px 20px 40px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      <div style={{
        maxWidth: "800px",
        width: "100%",
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        borderRadius: "16px",
        padding: "40px",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
        backdropFilter: "blur(12px)",
      }}>
        {/* Header */}
        <div style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "24px", marginBottom: "32px" }}>
          <h1 style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "28px",
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "0.05em",
            marginBottom: "8px",
          }}>
            Condiciones del Servicio
          </h1>
          <p style={{ fontSize: "14px", color: "rgba(148, 163, 184, 0.6)" }}>
            Última actualización: 2 de junio de 2026
          </p>
        </div>

        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", lineHeight: "1.7", fontSize: "15px" }}>
          <section>
            <p>
              Bienvenido a <strong>SODARE</strong> (sodare.xyz). Al acceder o utilizar nuestra plataforma, aceptas cumplir y estar sujeto a las siguientes Condiciones del Servicio. Por favor, léelas atentamente.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "18px", color: "#ffffff", fontWeight: 600, marginBottom: "12px" }}>
              1. Aceptación de los Términos
            </h2>
            <p>
              Al utilizar el servicio de SODARE, conectar tu cuenta de Meta/Facebook Ads, o interactuar con nuestra plataforma, confirmas tu conformidad y aceptación total de estos términos. Si no estás de acuerdo con alguna parte de estas condiciones, no debes utilizar la plataforma.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "18px", color: "#ffffff", fontWeight: 600, marginBottom: "12px" }}>
              2. Descripción del Servicio
            </h2>
            <p>
              SODARE es una plataforma de inteligencia multicanal que permite a los usuarios consolidar y gestionar métricas de campañas publicitarias en Meta (Facebook, Instagram, etc.), programar contenidos y automatizar tareas operativas de marketing digital. Los servicios se proveen "tal cual" y según disponibilidad.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "18px", color: "#ffffff", fontWeight: 600, marginBottom: "12px" }}>
              3. Integración con Meta (Facebook) API
            </h2>
            <p style={{ marginBottom: "8px" }}>
              Nuestra plataforma requiere conectarse a tu cuenta de Meta para extraer datos e información de tus cuentas de anuncios. Al utilizar estas integraciones, aceptas que:
            </p>
            <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <li>Eres el titular legítimo o administrador autorizado de las cuentas de anuncios y páginas conectadas.</li>
              <li>Cumples con las Políticas de Publicidad de Meta y sus Condiciones del Servicio.</li>
              <li>Nos otorgas permiso para realizar consultas de lectura y acciones de modificación permitidas (como pausar o activar campañas) conforme a las acciones que ejecutes en nuestra interfaz.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: "18px", color: "#ffffff", fontWeight: 600, marginBottom: "12px" }}>
              4. Responsabilidades del Usuario
            </h2>
            <p>
              Eres responsable de mantener la confidencialidad de tus credenciales de inicio de sesión de SODARE y de cualquier actividad que ocurra bajo tu cuenta. Asimismo, te comprometes a no utilizar el servicio para fines ilegales o no autorizados por la legislación aplicable o las normativas de las redes sociales integradas.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "18px", color: "#ffffff", fontWeight: 600, marginBottom: "12px" }}>
              5. Limitación de Responsabilidad
            </h2>
            <p>
              SODARE no se hace responsable por pérdidas económicas, interrupciones comerciales o variaciones en el desempeño de tus campañas publicitarias provocadas por cambios de algoritmo de Meta, caídas del servicio de la API de Meta, o por configuraciones realizadas directamente por el usuario a través de nuestra plataforma.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "18px", color: "#ffffff", fontWeight: 600, marginBottom: "12px" }}>
              6. Modificaciones de los Términos
            </h2>
            <p>
              Nos reservamos el derecho de modificar o reemplazar estas Condiciones del Servicio en cualquier momento. La fecha de la última actualización se indicará en la parte superior de esta página. El uso continuo de SODARE tras cualquier cambio constituye la aceptación de las nuevas condiciones.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "18px", color: "#ffffff", fontWeight: 600, marginBottom: "12px" }}>
              7. Contacto y Soporte
            </h2>
            <p>
              Si tienes alguna pregunta acerca de estas Condiciones del Servicio, puedes contactarnos a través de:{" "}
              <a href="mailto:soporte@sodare.xyz" style={{ color: "var(--cyan)", textDecoration: "none" }}>
                soporte@sodare.xyz
              </a>
            </p>
          </section>
        </div>

        {/* Footer */}
        <div style={{ marginTop: "40px", paddingTop: "24px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", textAlign: "center" }}>
          <Link href="/" style={{
            display: "inline-block",
            padding: "10px 24px",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "8px",
            color: "#ffffff",
            fontSize: "14px",
            textDecoration: "none",
            transition: "all 0.2s ease",
          }}>
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
