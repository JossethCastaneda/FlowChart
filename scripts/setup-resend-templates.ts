/**
 * Script para crear templates de email en Resend.
 * Ejecutar una sola vez: npx ts-node scripts/setup-resend-templates.ts
 * 
 * Requiere: RESEND_API_KEY en .env o como variable de entorno
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  console.error("❌ Falta RESEND_API_KEY. Configura la variable de entorno.");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${RESEND_API_KEY}`,
};

const templates = [
  {
    name: "sodare-password-reset",
    subject: "Recuperar contraseña — SODARE",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background:#0a0a0a; font-family:Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a; padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:linear-gradient(145deg, #0f172a, #030508); border:1px solid rgba(0,240,255,0.12); border-radius:16px; overflow:hidden;">
        
        <!-- Header -->
        <tr><td style="padding:32px 32px 0; text-align:center;">
          <div style="font-size:28px; font-weight:800; letter-spacing:3px;">
            <span style="color:#00f0ff;">⚡</span>
            <span style="color:#e2e8f0;"> SODARE</span>
          </div>
          <div style="width:60px; height:2px; background:linear-gradient(90deg, #00f0ff, #0080ff); margin:16px auto 0;"></div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="color:#94a3b8; font-size:15px; line-height:1.6; margin:0 0 8px;">
            Hola <strong style="color:#e2e8f0;">{{{NAME}}}</strong>,
          </p>
          <p style="color:#94a3b8; font-size:15px; line-height:1.6; margin:0 0 24px;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta.
          </p>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 24px;">
              <a href="{{{RESET_URL}}}" style="display:inline-block; padding:14px 32px; background:linear-gradient(135deg, #00f0ff, #0080ff); color:#030508; font-weight:700; font-size:14px; text-decoration:none; border-radius:8px; letter-spacing:1px;">
                RESTABLECER CONTRASEÑA →
              </a>
            </td></tr>
          </table>

          <p style="color:#64748b; font-size:13px; line-height:1.5; margin:0 0 16px;">
            Si no solicitaste este cambio, puedes ignorar este email. Tu contraseña no será modificada.
          </p>

          <!-- Fallback URL -->
          <div style="background:rgba(0,240,255,0.04); border:1px solid rgba(0,240,255,0.08); border-radius:8px; padding:12px 16px; margin-top:16px;">
            <p style="color:#475569; font-size:11px; margin:0 0 4px;">Si el botón no funciona, copia este enlace:</p>
            <p style="color:#00f0ff; font-size:11px; word-break:break-all; margin:0;">{{{RESET_URL}}}</p>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:0 32px 32px; border-top:1px solid rgba(100,116,139,0.1); padding-top:24px;">
          <p style="color:#334155; font-size:11px; text-align:center; margin:0; line-height:1.5;">
            Este enlace expira en 1 hora.<br/>
            © SODARE — Marketing Intelligence Platform
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim(),
    variables: [
      { key: "NAME", type: "string", fallbackValue: "usuario" },
      { key: "RESET_URL", type: "string", fallbackValue: "https://sodare.vercel.app/reset-password/token" },
    ],
  },
  {
    name: "sodare-workspace-invite",
    subject: "Te invitaron a {{{WORKSPACE_NAME}}} — SODARE",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background:#0a0a0a; font-family:Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a; padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:linear-gradient(145deg, #0f172a, #030508); border:1px solid rgba(0,240,255,0.12); border-radius:16px; overflow:hidden;">
        
        <!-- Header -->
        <tr><td style="padding:32px 32px 0; text-align:center;">
          <div style="font-size:28px; font-weight:800; letter-spacing:3px;">
            <span style="color:#00f0ff;">⚡</span>
            <span style="color:#e2e8f0;"> SODARE</span>
          </div>
          <div style="width:60px; height:2px; background:linear-gradient(90deg, #00f0ff, #0080ff); margin:16px auto 0;"></div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="color:#94a3b8; font-size:15px; line-height:1.6; margin:0 0 8px;">
            Hola,
          </p>
          <p style="color:#94a3b8; font-size:15px; line-height:1.6; margin:0 0 24px;">
            <strong style="color:#e2e8f0;">{{{INVITER_NAME}}}</strong> te ha invitado a unirte al workspace 
            <strong style="color:#00f0ff;">{{{WORKSPACE_NAME}}}</strong> con el rol de 
            <strong style="color:#e2e8f0;">{{{ROLE}}}</strong>.
          </p>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 24px;">
              <a href="{{{INVITE_URL}}}" style="display:inline-block; padding:14px 32px; background:linear-gradient(135deg, #00f0ff, #0080ff); color:#030508; font-weight:700; font-size:14px; text-decoration:none; border-radius:8px; letter-spacing:1px;">
                ACEPTAR INVITACIÓN →
              </a>
            </td></tr>
          </table>

          <div style="background:rgba(0,240,255,0.04); border:1px solid rgba(0,240,255,0.08); border-radius:8px; padding:12px 16px;">
            <p style="color:#475569; font-size:11px; margin:0 0 4px;">Si el botón no funciona, copia este enlace:</p>
            <p style="color:#00f0ff; font-size:11px; word-break:break-all; margin:0;">{{{INVITE_URL}}}</p>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:0 32px 32px; border-top:1px solid rgba(100,116,139,0.1); padding-top:24px;">
          <p style="color:#334155; font-size:11px; text-align:center; margin:0; line-height:1.5;">
            Esta invitación expira en 7 días.<br/>
            © SODARE — Marketing Intelligence Platform
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim(),
    variables: [
      { key: "INVITER_NAME", type: "string", fallbackValue: "Un administrador" },
      { key: "WORKSPACE_NAME", type: "string", fallbackValue: "Workspace" },
      { key: "ROLE", type: "string", fallbackValue: "MEMBER" },
      { key: "INVITE_URL", type: "string", fallbackValue: "https://sodare.vercel.app/invite/token" },
    ],
  },
];

async function main() {
  console.log("🚀 Creando templates en Resend...\n");

  for (const tpl of templates) {
    try {
      const res = await fetch("https://api.resend.com/templates", {
        method: "POST",
        headers,
        body: JSON.stringify(tpl),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(`❌ ${tpl.name}:`, data);
        continue;
      }

      console.log(`✅ ${tpl.name} → ID: ${data.id}`);

      // Publicar template
      const pubRes = await fetch(`https://api.resend.com/templates/${data.id}/publish`, {
        method: "POST",
        headers,
      });

      if (pubRes.ok) {
        console.log(`   📢 Publicado\n`);
      }
    } catch (err) {
      console.error(`❌ ${tpl.name}:`, err);
    }
  }

  console.log("\n🎯 Guarda los IDs arriba y agrégalos como variables de entorno:");
  console.log("   RESEND_TEMPLATE_PASSWORD_RESET = <id>");
  console.log("   RESEND_TEMPLATE_WORKSPACE_INVITE = <id>");
}

main();
