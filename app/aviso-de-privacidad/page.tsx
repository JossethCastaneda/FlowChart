"use client";

import React from "react";
import Link from "next/link";

export default function AvisoDePrivacidad() {
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
        background: "var(--surface)",
        border: "1px solid var(--hairline)",
        borderRadius: "16px",
        padding: "40px",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
        
      }}>
        {/* Header */}
        <div style={{ border: "1px solid var(--border)", paddingBottom: "24px", marginBottom: "32px" }}>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "28px",
            fontWeight: 700,
            color: "var(--foreground)",
            letterSpacing: "0.05em",
            marginBottom: "8px",
          }}>
            Aviso de Privacidad
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            Última actualización: 2 de junio de 2026
          </p>
        </div>

        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", lineHeight: "1.7", fontSize: "15px" }}>
          <section>
            <p>
              En <strong>FLOWCHART</strong> (flowchart.lat), la privacidad de nuestros usuarios es de suma importancia. Este Aviso de Privacidad detalla cómo recopilamos, utilizamos, protegemos y permitimos la eliminación de tus datos personales cuando utilizas nuestra plataforma y conectas tus cuentas a través de Meta/Facebook Login y la API de Meta.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "18px", color: "var(--foreground)", fontWeight: 600, marginBottom: "12px" }}>
              1. Datos que Recopilamos
            </h2>
            <p style={{ marginBottom: "8px" }}>
              Al integrar e iniciar sesión con tu cuenta de Meta (Facebook), recopilamos y procesamos los siguientes datos necesarios para proveer el servicio de gestión de campañas:
            </p>
            <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <li><strong>Información básica del perfil:</strong> Nombre, dirección de correo electrónico y foto de perfil.</li>
              <li><strong>Datos de Meta Ads Manager (API):</strong> Cuentas de anuncios asociadas, campañas de publicidad, conjuntos de anuncios (adsets), anuncios (ads), presupuestos, estados de entrega (activo/pausado) y métricas de rendimiento (clics, impresiones, conversiones, gasto, CTR, CPC, etc.).</li>
              <li><strong>Páginas de Meta:</strong> Identificadores, nombres y tokens de acceso de las páginas de Facebook de las que eres administrador, para propósitos de automatización y lectura de métricas de publicidad.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: "18px", color: "var(--foreground)", fontWeight: 600, marginBottom: "12px" }}>
              2. Uso de la Información
            </h2>
            <p style={{ marginBottom: "8px" }}>
              Utilizamos la información recopilada exclusivamente para los siguientes fines:
            </p>
            <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <li>Autenticar tu identidad y mantener la seguridad de tu cuenta en FLOWCHART.</li>
              <li>Presentar en tu panel o dashboard de control las métricas y desempeño de tus campañas de anuncios de Meta.</li>
              <li>Permitirte realizar acciones de optimización, tales como pausar, activar o editar parámetros básicos de tus campañas directamente desde nuestra interfaz.</li>
              <li>Generar plantillas de contenido ("Briefing Grid IA") basadas en tus objetivos comerciales.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: "18px", color: "var(--foreground)", fontWeight: 600, marginBottom: "12px" }}>
              3. Protección de tus Datos
            </h2>
            <p>
              Implementamos medidas de seguridad técnicas y organizativas para salvaguardar tu información. Tus tokens de acceso a Meta se almacenan de manera encriptada y son utilizados estrictamente para realizar las consultas de la API que tú solicites. Nunca compartimos, vendemos ni transferimos tus datos a terceros.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "18px", color: "var(--foreground)", fontWeight: 600, marginBottom: "12px" }}>
              4. Eliminación de Datos del Usuario (Instrucciones de Eliminación)
            </h2>
            <p style={{ marginBottom: "12px" }}>
              De acuerdo con las políticas de Meta para Desarrolladores, proporcionamos una forma clara para que los usuarios soliciten la eliminación de sus datos de nuestra base de datos.
            </p>
            <p style={{ marginBottom: "12px" }}>
              Puedes desconectar tu cuenta de Meta y solicitar la eliminación total de tus datos asociados siguiendo estos pasos:
            </p>
            <ol style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              <li>Ve a la sección de Configuración de tu cuenta de Facebook (Configuración y Privacidad &gt; Configuración).</li>
              <li>Busca la sección de <strong>"Aplicaciones y sitios web"</strong>.</li>
              <li>Busca la aplicación <strong>FLOWCHART</strong> y haz clic en <strong>"Eliminar"</strong>.</li>
              <li>Si deseas iniciar una solicitud formal de eliminación de datos de nuestros servidores inmediatamente, puedes hacerlo a través de nuestra herramienta de autoservicio ingresando aquí: <Link href="/data-deletion" style={{ color: "var(--cyan)", textDecoration: "underline" }}>Página de Solicitud de Eliminación de Datos</Link>.</li>
            </ol>
            <p>
              Una vez recibida la solicitud (ya sea vía la callback de Meta o mediante el formulario web), procesaremos la eliminación definitiva de tu perfil, tokens de acceso e historial en un plazo no mayor a 90 días, entregándote un código de confirmación de eliminación para tu seguimiento.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "18px", color: "var(--foreground)", fontWeight: 600, marginBottom: "12px" }}>
              5. Uso de datos de Google (Divulgación de Uso Limitado)
            </h2>
            <p style={{ marginBottom: "12px" }}>
              El uso que FLOWCHART hace de la información recibida de las APIs de Google se adhiere a la{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--cyan)", textDecoration: "underline" }}
              >
                Política de Datos de Usuario de los Servicios API de Google
              </a>
              , incluidos los requisitos de Uso Limitado (Limited Use).
            </p>
            <p style={{ marginBottom: "12px" }}>
              En concreto: (a) solo usamos los datos de Google para mostrar tus métricas y recursos dentro de
              FLOWCHART cuando tú conectas cada módulo de forma explícita; (b) no transferimos esos datos a
              terceros salvo cuando sea necesario para operar el servicio, por requerimiento legal o con tu
              consentimiento; (c) no usamos esos datos para publicidad; y (d) ningún humano lee esos datos,
              salvo con tu consentimiento explícito, por motivos de seguridad o para cumplir la ley.
            </p>
            <p>
              Puedes revocar el acceso de FLOWCHART a tu cuenta de Google en cualquier momento desde la sección
              de Integraciones de la app (lo que también revoca el permiso ante Google) o directamente en{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--cyan)", textDecoration: "underline" }}
              >
                los permisos de tu cuenta de Google
              </a>
              .
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "18px", color: "var(--foreground)", fontWeight: 600, marginBottom: "12px" }}>
              6. Contacto
            </h2>
            <p>
              Si tienes alguna duda o comentario sobre este Aviso de Privacidad o deseas ejercer tus derechos ARCO, por favor contáctanos vía correo electrónico a:{" "}
              <a href="mailto:soporte@flowchart.lat" style={{ color: "var(--cyan)", textDecoration: "none" }}>
                soporte@flowchart.lat
              </a>
            </p>
          </section>
        </div>

        {/* Footer */}
        <div style={{ marginTop: "40px", paddingTop: "24px", border: "1px solid var(--border)", textAlign: "center" }}>
          <Link href="/" style={{
            display: "inline-block",
            padding: "10px 24px",
            background: "var(--surface-hover)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--foreground)",
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
