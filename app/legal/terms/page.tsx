import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos de Servicio — Zefirus",
  description: "Términos y condiciones de uso de la plataforma Zefirus. Centro de mando de marketing multicanal para agencias y marcas.",
};

const LAST_UPDATED = "25 de junio de 2025";
const COMPANY = "Zefirus";
const CONTACT_EMAIL = "legal@zefirus.com";
const WEBSITE = "https://zefirus.com";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 48 }}>
      <h2 style={{
        fontFamily: "var(--font-display)",
        fontSize: 15,
        fontWeight: 700,
        color: "#5b9bff",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        marginBottom: 16,
        paddingBottom: 8,
        borderBottom: "1px solid rgba(59,130,246,0.15)",
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
          <span style={{ color: "#5b9bff", marginRight: 8 }}>›</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "60px 24px 80px" }}>
      {/* Header */}
      <div style={{ marginBottom: 56 }}>
        <div style={{
          display: "inline-block",
          background: "var(--cyan-dim)",
          border: "1px solid rgba(59,130,246,0.2)",
          borderRadius: 6,
          padding: "4px 14px",
          fontSize: 11,
          fontWeight: 700,
          color: "#5b9bff",
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
          Términos de Servicio
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
          Última actualización: <strong style={{ color: "var(--text-muted)" }}>{LAST_UPDATED}</strong>
        </p>
        <div style={{
          marginTop: 24,
          padding: "16px 20px",
          background: "var(--cyan-dim)",
          border: "1px solid rgba(59,130,246,0.12)",
          borderRadius: 8,
          fontSize: 13,
          color: "var(--text-muted)",
          lineHeight: 1.6,
        }}>
          Al acceder y utilizar la plataforma Zefirus, usted acepta los presentes Términos de Servicio en su totalidad.
          Si no está de acuerdo con estos términos, no debe utilizar nuestros servicios.
        </div>
      </div>

      {/* Sections */}
      <Section title="1. Definiciones">
        <P>Para los efectos de estos Términos de Servicio, se entiende por:</P>
        <Ul items={[
          "«Plataforma»: el software y servicios en línea proporcionados por Zefirus, incluyendo el dashboard de gestión, las integraciones con plataformas de terceros y todas las funcionalidades asociadas.",
          "«Usuario»: toda persona natural o jurídica que acceda y utilice la Plataforma.",
          "«Workspace»: el entorno de trabajo de un equipo u organización dentro de la Plataforma.",
          "«Datos del Usuario»: toda información, contenido y material que el Usuario cargue, publique o procese a través de la Plataforma.",
          "«Servicio»: el conjunto de funcionalidades ofrecidas por Zefirus, incluidas gestión de campañas, análisis de conversaciones, automatización de marketing y publicación de contenido.",
        ]} />
      </Section>

      <Section title="2. Aceptación de los Términos">
        <P>
          Al crear una cuenta, acceder o utilizar la Plataforma, usted declara que:
        </P>
        <Ul items={[
          "Tiene capacidad legal para celebrar contratos vinculantes.",
          "Si actúa en nombre de una empresa u organización, tiene autorización para aceptar estos términos en su nombre.",
          "Ha leído, comprendido y acepta estar vinculado por estos Términos de Servicio y nuestra Política de Privacidad.",
          "Cumplirá con todas las leyes y regulaciones aplicables en el uso de la Plataforma.",
        ]} />
      </Section>

      <Section title="3. Descripción del Servicio">
        <P>
          Zefirus es una plataforma SaaS de inteligencia de marketing multicanal que permite a agencias y marcas:
        </P>
        <Ul items={[
          "Gestionar y publicar contenido en redes sociales (Meta, TikTok, WhatsApp, Google y otras).",
          "Supervisar campañas publicitarias y analizar resultados en tiempo real.",
          "Gestionar conversaciones e interacciones con clientes a través de múltiples canales.",
          "Automatizar flujos de trabajo de marketing y atención al cliente mediante inteligencia artificial.",
          "Generar reportes y análisis de rendimiento de campañas.",
          "Administrar proyectos, equipos y permisos de trabajo.",
        ]} />
        <P>
          Zefirus se reserva el derecho de modificar, suspender o discontinuar cualquier funcionalidad de la Plataforma en cualquier momento, con o sin previo aviso.
        </P>
      </Section>

      <Section title="4. Registro y Cuentas">
        <P>
          Para utilizar la Plataforma, el Usuario debe crear una cuenta proporcionando información veraz, completa y actualizada. El Usuario es responsable de:
        </P>
        <Ul items={[
          "Mantener la confidencialidad de sus credenciales de acceso.",
          "Todas las actividades realizadas bajo su cuenta.",
          "Notificar inmediatamente a Zefirus cualquier uso no autorizado de su cuenta.",
          "No compartir su cuenta con terceros no autorizados.",
        ]} />
        <P>
          Zefirus se reserva el derecho de suspender o cancelar cuentas que violen estos términos o que se utilicen de manera fraudulenta.
        </P>
      </Section>

      <Section title="5. Uso Aceptable">
        <P>
          El Usuario se compromete a utilizar la Plataforma únicamente para fines legítimos y de conformidad con estos términos. Está estrictamente prohibido:
        </P>
        <Ul items={[
          "Publicar o transmitir contenido ilegal, difamatorio, obsceno, fraudulento o que infrinja derechos de terceros.",
          "Utilizar la Plataforma para enviar spam, contenido no solicitado o realizar prácticas de marketing engañosas.",
          "Acceder de forma no autorizada a sistemas, datos o cuentas de otros usuarios.",
          "Interferir o interrumpir la integridad o el rendimiento de la Plataforma.",
          "Realizar ingeniería inversa, descompilar o desensamblar cualquier parte de la Plataforma.",
          "Utilizar bots, scrapers u otros medios automatizados no autorizados para acceder a la Plataforma.",
          "Infringir las políticas de uso de las plataformas de terceros integradas (Meta, TikTok, Google, WhatsApp, etc.).",
          "Revender, sublicenciar o transferir el acceso a la Plataforma sin autorización expresa de Zefirus.",
        ]} />
      </Section>

      <Section title="6. Integraciones con Plataformas de Terceros">
        <P>
          Zefirus se integra con plataformas de terceros como Meta (Facebook, Instagram), TikTok, WhatsApp Business, Google Ads y otras. Al conectar estas integraciones:
        </P>
        <Ul items={[
          "El Usuario autoriza a Zefirus a acceder y gestionar los datos y funcionalidades de dichas plataformas en su nombre.",
          "El Usuario declara que cumple con los Términos de Servicio y Políticas de uso de cada plataforma de terceros.",
          "Zefirus no es responsable de cambios, interrupciones o decisiones en las APIs de plataformas de terceros.",
          "El acceso a las integraciones puede depender de aprobaciones por parte de las plataformas de terceros.",
          "El uso de datos obtenidos a través de estas integraciones debe cumplir con las políticas de cada plataforma.",
        ]} />
      </Section>

      <Section title="7. Propiedad Intelectual">
        <P>
          <strong style={{ color: "var(--foreground)" }}>Propiedad de Zefirus:</strong> La Plataforma, incluyendo su código fuente, diseño, logotipos, marcas, interfaces y documentación, son propiedad exclusiva de Zefirus y están protegidos por las leyes de propiedad intelectual aplicables.
        </P>
        <P>
          <strong style={{ color: "var(--foreground)" }}>Licencia de uso:</strong> Zefirus otorga al Usuario una licencia limitada, no exclusiva, no transferible y revocable para utilizar la Plataforma de conformidad con estos Términos.
        </P>
        <P>
          <strong style={{ color: "var(--foreground)" }}>Contenido del Usuario:</strong> El Usuario retiene todos los derechos sobre el contenido que publique o cargue en la Plataforma. Al utilizarla, el Usuario otorga a Zefirus una licencia para procesar, almacenar y transmitir dicho contenido en la medida necesaria para prestar el servicio.
        </P>
      </Section>

      <Section title="8. Privacidad y Protección de Datos">
        <P>
          El tratamiento de datos personales se rige por nuestra{" "}
          <a href="/legal/privacy" style={{ color: "#5b9bff", textDecoration: "none" }}>
            Política de Privacidad
          </a>
          , la cual forma parte integral de estos Términos de Servicio. Al utilizar la Plataforma, el Usuario consiente el tratamiento de sus datos de conformidad con dicha política.
        </P>
        <P>
          Zefirus implementa medidas de seguridad técnicas y organizativas apropiadas para proteger los datos contra accesos no autorizados, pérdida o divulgación indebida.
        </P>
      </Section>

      <Section title="9. Pagos y Facturación">
        <P>
          El acceso a ciertas funcionalidades de la Plataforma puede requerir el pago de una suscripción. Las condiciones específicas de pago se establecen en el plan seleccionado por el Usuario. En general:
        </P>
        <Ul items={[
          "Los precios se indican en USD (dólares estadounidenses) salvo indicación contraria.",
          "Los pagos se realizan de forma anticipada por el período contratado.",
          "Las suscripciones se renuevan automáticamente salvo cancelación previa.",
          "No se realizarán reembolsos por períodos parciales salvo disposición legal aplicable.",
          "Zefirus se reserva el derecho de modificar sus precios con previo aviso de 30 días.",
        ]} />
      </Section>

      <Section title="10. Limitación de Responsabilidad">
        <P>
          La Plataforma se proporciona «tal como está» y «según disponibilidad», sin garantías de ningún tipo, ya sean expresas o implícitas. En la máxima medida permitida por la ley aplicable:
        </P>
        <Ul items={[
          "Zefirus no garantiza que la Plataforma esté libre de errores, interrupciones o vulnerabilidades.",
          "Zefirus no será responsable por daños indirectos, incidentales, especiales o consecuentes.",
          "La responsabilidad total de Zefirus no excederá los importes pagados por el Usuario en los últimos 3 meses.",
          "Zefirus no es responsable de pérdidas derivadas de interrupciones en plataformas de terceros integradas.",
        ]} />
      </Section>

      <Section title="11. Modificaciones de los Términos">
        <P>
          Zefirus se reserva el derecho de modificar estos Términos de Servicio en cualquier momento. Los cambios materiales serán notificados con al menos 15 días de anticipación a través de la Plataforma o por correo electrónico. El uso continuado de la Plataforma tras la notificación implica la aceptación de los nuevos términos.
        </P>
      </Section>

      <Section title="12. Terminación">
        <P>
          Cualquiera de las partes puede terminar la relación en cualquier momento. Zefirus puede suspender o cancelar el acceso del Usuario de forma inmediata si:
        </P>
        <Ul items={[
          "El Usuario incumple estos Términos de Servicio.",
          "Existen indicios de uso fraudulento o actividad ilegal.",
          "El pago de la suscripción está en mora.",
        ]} />
        <P>
          Tras la terminación, Zefirus podrá eliminar los datos del Usuario de acuerdo con su política de retención de datos, salvo que la ley exija su conservación.
        </P>
      </Section>

      <Section title="13. Ley Aplicable y Jurisdicción">
        <P>
          Estos Términos de Servicio se rigen por las leyes aplicables en el territorio donde opere Zefirus. Cualquier disputa que no pueda resolverse amigablemente será sometida a la jurisdicción de los tribunales competentes del domicilio de Zefirus, renunciando expresamente las partes a cualquier otro fuero.
        </P>
      </Section>

      <Section title="14. Contacto">
        <P>
          Para cualquier consulta relacionada con estos Términos de Servicio, puede contactarnos en:
        </P>
        <div style={{
          background: "var(--cyan-dim)",
          border: "1px solid rgba(59,130,246,0.12)",
          borderRadius: 8,
          padding: "16px 20px",
          fontSize: 13,
        }}>
          <p style={{ margin: "0 0 4px", color: "var(--foreground)", fontWeight: 600 }}>{COMPANY}</p>
          <p style={{ margin: "0 0 4px", color: "var(--text-muted)" }}>
            Correo electrónico:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "#5b9bff", textDecoration: "none" }}>
              {CONTACT_EMAIL}
            </a>
          </p>
          <p style={{ margin: 0, color: "var(--text-muted)" }}>
            Sitio web:{" "}
            <a href={WEBSITE} style={{ color: "#5b9bff", textDecoration: "none" }}>
              {WEBSITE}
            </a>
          </p>
        </div>
      </Section>
    </main>
  );
}
