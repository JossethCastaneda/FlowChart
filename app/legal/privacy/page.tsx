import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad — Zefirus",
  description: "Política de privacidad y protección de datos de la plataforma Zefirus. Conoce cómo recopilamos, usamos y protegemos tu información.",
};

const LAST_UPDATED = "25 de junio de 2025";
const COMPANY = "Zefirus";
const CONTACT_EMAIL = "privacy@zefirus.com";
const WEBSITE = "https://zefirus.com";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 48 }}>
      <h2 style={{
        fontFamily: "var(--font-display)",
        fontSize: 15,
        fontWeight: 700,
        color: "var(--c-success)",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        marginBottom: 16,
        paddingBottom: 8,
        borderBottom: "1px solid rgba(52,183,124,0.15)",
      }}>
        {title}
      </h2>
      <div style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-muted)" }}>
        {children}
      </div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ marginBottom: 12 }}>{children}</p>;
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul style={{ paddingLeft: 20, marginBottom: 12 }}>
      {items.map((item, i) => (
        <li key={i} style={{ marginBottom: 6 }}>
          <span style={{ color: "var(--c-success)", marginRight: 8 }}>›</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: "flex",
      gap: 12,
      padding: "10px 0",
      border: "1px solid var(--hairline)",
    }}>
      <span style={{ fontSize: 13, color: "var(--text-muted)", minWidth: 160 }}>{label}</span>
      <span style={{ fontSize: 13, color: "var(--foreground)" }}>{value}</span>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "60px 24px 80px" }}>
      {/* Header */}
      <div style={{ marginBottom: 56 }}>
        <div style={{
          display: "inline-block",
          background: "var(--surface)",
          border: "1px solid rgba(52,183,124,0.2)",
          borderRadius: 6,
          padding: "4px 14px",
          fontSize: 11,
          fontWeight: 700,
          color: "var(--c-success)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 20,
        }}>
          Legal
        </div>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(24px, 4vw, 36px)",
          fontWeight: 700,
          color: "var(--foreground)",
          letterSpacing: "0.04em",
          marginBottom: 12,
          lineHeight: 1.2,
        }}>
          Política de Privacidad
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
          Última actualización: <strong style={{ color: "var(--text-muted)" }}>{LAST_UPDATED}</strong>
        </p>
        <div style={{
          marginTop: 24,
          padding: "16px 20px",
          background: "var(--surface)",
          border: "1px solid rgba(52,183,124,0.12)",
          borderRadius: 8,
          fontSize: 13,
          color: "var(--text-muted)",
          lineHeight: 1.6,
        }}>
          En Zefirus nos comprometemos a proteger tu privacidad. Esta política explica cómo recopilamos, usamos, almacenamos
          y protegemos tu información cuando utilizas nuestra plataforma de marketing multicanal.
        </div>
      </div>

      {/* Summary table */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid rgba(52,183,124,0.12)",
        borderRadius: 12,
        padding: "20px 24px",
        marginBottom: 52,
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--c-success)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
          Resumen rápido
        </p>
        <InfoBox label="Responsable del tratamiento" value={COMPANY} />
        <InfoBox label="Finalidad principal" value="Prestación del servicio de marketing multicanal" />
        <InfoBox label="Datos recopilados" value="Cuenta, uso de plataforma, datos de campañas" />
        <InfoBox label="Bases legales" value="Contrato, consentimiento, interés legítimo" />
        <InfoBox label="Transferencias internacionales" value="Con salvaguardas adecuadas (SCCs)" />
        <InfoBox label="Retención de datos" value="Duración del contrato + períodos legales" />
        <InfoBox label="Tus derechos" value="Acceso, rectificación, supresión, portabilidad" />
        <InfoBox label="Contacto DPO" value={CONTACT_EMAIL} />
      </div>

      <Section title="1. Responsable del Tratamiento">
        <P>
          El responsable del tratamiento de los datos personales recogidos a través de la Plataforma es <strong style={{ color: "var(--foreground)" }}>{COMPANY}</strong>.
          Puedes contactarnos en:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--c-success)", textDecoration: "none" }}>
            {CONTACT_EMAIL}
          </a>
        </P>
      </Section>

      <Section title="2. Datos que Recopilamos">
        <P>
          <strong style={{ color: "var(--foreground)" }}>2.1 Datos de cuenta y registro:</strong>
        </P>
        <Ul items={[
          "Nombre y apellidos.",
          "Correo electrónico y contraseña (almacenada de forma encriptada).",
          "Nombre de la empresa u organización.",
          "Foto de perfil (opcional).",
          "Información de facturación y pago.",
        ]} />

        <P>
          <strong style={{ color: "var(--foreground)" }}>2.2 Datos de uso de la Plataforma:</strong>
        </P>
        <Ul items={[
          "Acciones realizadas en la Plataforma (navegación, clics, configuraciones).",
          "Métricas de uso y estadísticas de rendimiento.",
          "Registros de acceso (IP, navegador, sistema operativo, timestamps).",
          "Preferencias de configuración y personalización.",
        ]} />

        <P>
          <strong style={{ color: "var(--foreground)" }}>2.3 Datos de campañas e integraciones:</strong>
        </P>
        <Ul items={[
          "Datos de cuentas publicitarias conectadas (Meta Ads, TikTok Ads, Google Ads).",
          "Métricas y rendimiento de campañas.",
          "Contenido de publicaciones y creatividades.",
          "Conversaciones y mensajes gestionados a través de la Plataforma.",
          "Datos de contactos e interacciones con clientes finales.",
        ]} />

        <P>
          <strong style={{ color: "var(--foreground)" }}>2.4 Datos técnicos automáticos:</strong>
        </P>
        <Ul items={[
          "Dirección IP y datos de geolocalización aproximada.",
          "Identificadores de dispositivo y cookies de sesión.",
          "Datos de rendimiento y errores de la aplicación.",
        ]} />
      </Section>

      <Section title="3. Finalidades del Tratamiento">
        <P>Tratamos tus datos personales para las siguientes finalidades:</P>
        <Ul items={[
          "Prestación del servicio: gestionar tu cuenta, autenticar accesos, procesar pagos y proporcionar las funcionalidades de la Plataforma.",
          "Integraciones de terceros: conectar con plataformas como Meta, TikTok, WhatsApp Business y Google en tu nombre.",
          "Soporte y comunicación: atender solicitudes de ayuda, enviarte notificaciones del servicio y actualizaciones importantes.",
          "Mejora del producto: analizar el uso de la Plataforma para mejorar funcionalidades y la experiencia del usuario.",
          "Seguridad y prevención de fraude: detectar y prevenir actividades no autorizadas o maliciosas.",
          "Cumplimiento legal: cumplir con obligaciones legales y regulatorias aplicables.",
          "Comunicaciones comerciales: enviarte información sobre nuevas funcionalidades o planes (solo con tu consentimiento, revocable en cualquier momento).",
        ]} />
      </Section>

      <Section title="4. Bases Legales del Tratamiento">
        <Ul items={[
          "Ejecución de contrato: cuando el tratamiento es necesario para prestar el servicio contratado.",
          "Consentimiento: para el envío de comunicaciones comerciales y cookies no esenciales.",
          "Interés legítimo: para la mejora del producto, seguridad y análisis de uso.",
          "Cumplimiento de obligación legal: cuando la ley exige el tratamiento o conservación de datos.",
        ]} />
      </Section>

      <Section title="5. Integraciones y Plataformas de Terceros">
        <P>
          Zefirus actúa como procesador de datos en nombre del Usuario cuando gestiona datos a través de las siguientes integraciones:
        </P>
        <Ul items={[
          "Meta (Facebook e Instagram): acceso a cuentas publicitarias, páginas, conversaciones de Messenger e Instagram.",
          "TikTok for Business: gestión de cuentas publicitarias y acceso a métricas de rendimiento.",
          "WhatsApp Business API: gestión de conversaciones y mensajes empresariales.",
          "Google Ads y Google Analytics: acceso a datos de campañas y métricas de rendimiento.",
          "Otras plataformas conectadas por el Usuario.",
        ]} />
        <P>
          El uso de datos obtenidos de estas plataformas se rige por las políticas de privacidad de cada una de ellas y por los permisos que el Usuario otorgue expresamente. Zefirus no vende ni comparte estos datos con terceros no autorizados.
        </P>
      </Section>

      <Section title="6. Compartición de Datos con Terceros">
        <P>
          Zefirus puede compartir tus datos con terceros únicamente en los siguientes casos:
        </P>
        <Ul items={[
          "Proveedores de servicios: empresas que nos ayudan a operar la Plataforma (almacenamiento en la nube, procesamiento de pagos, análisis), sujetas a acuerdos de procesamiento de datos.",
          "Plataformas integradas: cuando el Usuario lo autoriza expresamente al conectar una integración.",
          "Requisitos legales: cuando estamos obligados por ley, orden judicial o autoridad competente.",
          "Protección de derechos: cuando sea necesario para proteger los derechos, seguridad o propiedad de Zefirus o sus usuarios.",
          "Transacciones corporativas: en caso de fusión, adquisición o venta de activos, con las salvaguardas adecuadas.",
        ]} />
        <P>
          <strong style={{ color: "var(--foreground)" }}>Nunca vendemos tus datos personales a terceros.</strong>
        </P>
      </Section>

      <Section title="7. Transferencias Internacionales de Datos">
        <P>
          Zefirus puede transferir datos a proveedores situados fuera de tu país de residencia. Cuando realizamos transferencias internacionales, implementamos las salvaguardas adecuadas, tales como:
        </P>
        <Ul items={[
          "Cláusulas Contractuales Tipo (CCT / SCCs) aprobadas por la Comisión Europea.",
          "Verificación de que los países destinatarios cuenten con un nivel adecuado de protección de datos.",
          "Medidas técnicas adicionales como encriptación de extremo a extremo.",
        ]} />
      </Section>

      <Section title="8. Retención de Datos">
        <P>Conservamos tus datos personales durante el tiempo necesario para cumplir las finalidades descritas:</P>
        <Ul items={[
          "Datos de cuenta activa: durante toda la duración de la relación contractual.",
          "Datos de facturación: el período que exija la legislación fiscal aplicable (generalmente 5-7 años).",
          "Registros de seguridad y acceso: hasta 12 meses.",
          "Datos de comunicaciones: hasta 2 años desde la última interacción.",
          "Tras la cancelación de la cuenta: los datos se eliminan o anonimizan en un plazo máximo de 90 días, salvo obligación legal de conservación.",
        ]} />
      </Section>

      <Section title="9. Seguridad de los Datos">
        <P>Implementamos medidas de seguridad técnicas y organizativas para proteger tus datos, incluyendo:</P>
        <Ul items={[
          "Encriptación en tránsito mediante TLS/HTTPS.",
          "Encriptación en reposo para datos sensibles.",
          "Control de acceso basado en roles y principio de mínimo privilegio.",
          "Autenticación de dos factores disponible para todos los usuarios.",
          "Auditorías y monitoreo de seguridad periódicos.",
          "Planes de respuesta ante incidentes de seguridad.",
        ]} />
        <P>
          En caso de una brecha de seguridad que afecte tus derechos, te notificaremos en el plazo legalmente establecido.
        </P>
      </Section>

      <Section title="10. Tus Derechos">
        <P>Dependiendo de tu ubicación, puedes tener los siguientes derechos sobre tus datos personales:</P>
        <Ul items={[
          "Acceso: solicitar una copia de los datos que tenemos sobre ti.",
          "Rectificación: corregir datos inexactos o incompletos.",
          "Supresión («derecho al olvido»): solicitar la eliminación de tus datos cuando no sean necesarios.",
          "Limitación del tratamiento: solicitar que restrinjamos el uso de tus datos en determinadas circunstancias.",
          "Portabilidad: recibir tus datos en un formato estructurado y legible por máquina.",
          "Oposición: oponerte al tratamiento basado en interés legítimo o con fines de marketing directo.",
          "Retirada del consentimiento: retirar en cualquier momento el consentimiento previamente otorgado.",
          "Reclamación: presentar una reclamación ante la autoridad de protección de datos competente.",
        ]} />
        <P>
          Para ejercer tus derechos, contáctanos en{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--c-success)", textDecoration: "none" }}>
            {CONTACT_EMAIL}
          </a>
          . Responderemos en el plazo legalmente establecido (generalmente 30 días).
        </P>
      </Section>

      <Section title="11. Cookies y Tecnologías de Seguimiento">
        <P>Utilizamos cookies y tecnologías similares para:</P>
        <Ul items={[
          "Cookies esenciales: necesarias para el funcionamiento de la sesión y autenticación (no requieren consentimiento).",
          "Cookies analíticas: para entender cómo se usa la Plataforma y mejorarla (requieren consentimiento).",
          "Cookies de preferencias: para recordar tus configuraciones de idioma y apariencia.",
        ]} />
        <P>
          Puedes gestionar tus preferencias de cookies desde la configuración de tu navegador. La desactivación de cookies esenciales puede afectar el funcionamiento de la Plataforma.
        </P>
      </Section>

      <Section title="12. Privacidad de Menores">
        <P>
          La Plataforma no está dirigida a personas menores de 18 años. No recopilamos conscientemente datos personales de menores de edad. Si tienes conocimiento de que un menor ha proporcionado datos sin el consentimiento de sus padres o tutores, contáctanos para eliminar dicha información.
        </P>
      </Section>

      <Section title="13. Cambios a esta Política">
        <P>
          Podemos actualizar esta Política de Privacidad periódicamente. Cuando realicemos cambios significativos, te notificaremos a través de la Plataforma o por correo electrónico con al menos 15 días de anticipación. La fecha de «Última actualización» al inicio de este documento indica cuándo fue modificada por última vez.
        </P>
      </Section>

      <Section title="14. Contacto y DPO">
        <P>
          Para cualquier consulta, solicitud o reclamación relacionada con el tratamiento de tus datos personales:
        </P>
        <div style={{
          background: "var(--surface)",
          border: "1px solid rgba(52,183,124,0.12)",
          borderRadius: 8,
          padding: "16px 20px",
          fontSize: 13,
        }}>
          <p style={{ margin: "0 0 4px", color: "var(--foreground)", fontWeight: 600 }}>{COMPANY} — Responsable de Privacidad</p>
          <p style={{ margin: "0 0 4px", color: "var(--text-muted)" }}>
            Correo electrónico:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--c-success)", textDecoration: "none" }}>
              {CONTACT_EMAIL}
            </a>
          </p>
          <p style={{ margin: "0 0 4px", color: "var(--text-muted)" }}>
            Para asuntos generales:{" "}
            <a href="mailto:legal@zefirus.com" style={{ color: "var(--c-success)", textDecoration: "none" }}>
              legal@zefirus.com
            </a>
          </p>
          <p style={{ margin: 0, color: "var(--text-muted)" }}>
            Sitio web:{" "}
            <a href={WEBSITE} style={{ color: "var(--c-success)", textDecoration: "none" }}>
              {WEBSITE}
            </a>
          </p>
        </div>
        <p style={{ marginTop: 16, marginBottom: 12, fontSize: 14, lineHeight: 1.8, color: "var(--text-muted)" }}>
          También tienes derecho a presentar una reclamación ante la autoridad de control de protección de datos de tu país de residencia si consideras que el tratamiento de tus datos infringe la normativa aplicable.
        </p>
      </Section>
    </main>
  );
}
