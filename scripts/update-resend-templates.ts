/**
 * Actualiza los templates de Resend con diseño premium SODARE.
 * Ejecutar: npx tsx scripts/update-resend-templates.ts
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) {
  console.error("Falta RESEND_API_KEY");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${RESEND_API_KEY}`,
};

const PASSWORD_RESET_ID = "0714fcce-9f7e-4b8a-b5a3-4375b2310c0d";
const WORKSPACE_INVITE_ID = "15897827-b6e8-4831-b28c-6fa6cc035bca";

// ── Shared components ──
const sodareHeader = `
<tr><td style="padding:40px 40px 0; text-align:center;">
  <!-- Logo mark -->
  <table cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
    <tr>
      <td style="width:44px; height:44px; border:2px solid #00f0ff; border-radius:10px; text-align:center; vertical-align:middle;">
        <span style="color:#00f0ff; font-size:22px; font-weight:900; line-height:44px;">&#x2607;</span>
      </td>
      <td style="padding-left:14px;">
        <span style="font-size:24px; font-weight:800; letter-spacing:6px; color:#e2e8f0; font-family:'Segoe UI',Arial,sans-serif;">SODARE</span>
      </td>
    </tr>
  </table>
  <!-- Accent line -->
  <table cellpadding="0" cellspacing="0" align="center" style="margin:20px auto 0;">
    <tr>
      <td style="width:24px; height:1px; background:#00f0ff;"></td>
      <td style="width:8px;"></td>
      <td style="width:60px; height:2px; background:linear-gradient(90deg, #00f0ff, #0080ff); border-radius:1px;"></td>
      <td style="width:8px;"></td>
      <td style="width:24px; height:1px; background:#0080ff;"></td>
    </tr>
  </table>
</td></tr>`;

const sodareFooter = (note: string) => `
<tr><td style="padding:0 40px 12px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="height:1px; background:linear-gradient(90deg, transparent, rgba(0,240,255,0.12), transparent);"></td></tr>
  </table>
</td></tr>
<tr><td style="padding:0 40px 40px; text-align:center;">
  <p style="color:#334155; font-size:11px; margin:0 0 4px; line-height:1.6; font-family:'Segoe UI',Arial,sans-serif;">
    ${note}
  </p>
  <p style="color:#1e293b; font-size:10px; margin:12px 0 0; letter-spacing:2px; font-family:'Segoe UI',Arial,sans-serif;">
    SODARE &#x2022; MARKETING INTELLIGENCE PLATFORM
  </p>
</td></tr>`;

// ── Password Reset Template ──
const passwordResetHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Restablecer contrase&#xF1;a</title>
</head>
<body style="margin:0; padding:0; background:#050508; font-family:'Segoe UI',Roboto,Arial,sans-serif; -webkit-font-smoothing:antialiased;">

<!-- Outer wrapper with subtle pattern -->
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#050508;">
<tr><td style="padding:48px 20px;" align="center">

  <!-- Card -->
  <table width="520" cellpadding="0" cellspacing="0" role="presentation" style="
    background:#0a0e17;
    border:1px solid rgba(0,240,255,0.08);
    border-radius:16px;
    overflow:hidden;
    box-shadow: 0 0 80px rgba(0,128,255,0.04), 0 0 40px rgba(0,240,255,0.02);
  ">
    <!-- Top glow bar -->
    <tr><td style="height:3px; background:linear-gradient(90deg, transparent 5%, #00f0ff 30%, #0080ff 70%, transparent 95%);"></td></tr>

    ${sodareHeader}

    <!-- Body -->
    <tr><td style="padding:32px 40px 40px;">
      <!-- Greeting -->
      <p style="color:#94a3b8; font-size:15px; line-height:1.7; margin:0 0 6px; font-family:'Segoe UI',Arial,sans-serif;">
        Hola <strong style="color:#e2e8f0;">{{{NAME}}}</strong>,
      </p>
      <p style="color:#64748b; font-size:14px; line-height:1.7; margin:0 0 28px; font-family:'Segoe UI',Arial,sans-serif;">
        Recibimos una solicitud para restablecer la contrase&#xF1;a de tu cuenta. 
        Usa el bot&#xF3;n de abajo para crear una nueva.
      </p>

      <!-- CTA Button -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr><td align="center" style="padding:4px 0 32px;">
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="
                background:linear-gradient(135deg, #00f0ff 0%, #0080ff 100%);
                border-radius:8px;
                box-shadow: 0 4px 24px rgba(0,240,255,0.2), 0 2px 8px rgba(0,128,255,0.15);
              ">
                <a href="{{{RESET_URL}}}" target="_blank" style="
                  display:inline-block;
                  padding:14px 36px;
                  color:#030508;
                  font-weight:700;
                  font-size:13px;
                  text-decoration:none;
                  letter-spacing:1.5px;
                  font-family:'Segoe UI',Arial,sans-serif;
                ">RESTABLECER CONTRASE&#xD1;A &nbsp;&#x2192;</a>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>

      <!-- Security notice -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="
        background:rgba(0,240,255,0.03);
        border:1px solid rgba(0,240,255,0.06);
        border-radius:8px;
      ">
        <tr>
          <td style="padding:14px 18px; vertical-align:top; width:28px;">
            <span style="display:inline-block; width:20px; height:20px; border:1.5px solid rgba(0,240,255,0.3); border-radius:50%; text-align:center; line-height:20px; color:#00f0ff; font-size:11px;">&#x2139;</span>
          </td>
          <td style="padding:14px 18px 14px 0;">
            <p style="color:#475569; font-size:12px; line-height:1.5; margin:0; font-family:'Segoe UI',Arial,sans-serif;">
              Si no solicitaste este cambio, puedes ignorar este email de forma segura. Tu contrase&#xF1;a no ser&#xE1; modificada.
            </p>
          </td>
        </tr>
      </table>

      <!-- Fallback URL -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:20px;">
        <tr><td>
          <p style="color:#334155; font-size:10px; margin:0 0 6px; letter-spacing:1px; font-family:'Segoe UI',Arial,sans-serif;">
            &#x25B8; ENLACE DIRECTO
          </p>
          <p style="color:#0080ff; font-size:10px; word-break:break-all; margin:0; line-height:1.5; font-family:'Segoe UI',Arial,sans-serif;">
            {{{RESET_URL}}}
          </p>
        </td></tr>
      </table>
    </td></tr>

    ${sodareFooter("Este enlace expira en 1 hora por seguridad.")}

    <!-- Bottom glow bar -->
    <tr><td style="height:2px; background:linear-gradient(90deg, transparent 10%, #0080ff 50%, transparent 90%);"></td></tr>
  </table>

</td></tr>
</table>
</body>
</html>`.trim();

// ── Workspace Invite Template ──
const workspaceInviteHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Invitaci&#xF3;n a workspace</title>
</head>
<body style="margin:0; padding:0; background:#050508; font-family:'Segoe UI',Roboto,Arial,sans-serif; -webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#050508;">
<tr><td style="padding:48px 20px;" align="center">

  <!-- Card -->
  <table width="520" cellpadding="0" cellspacing="0" role="presentation" style="
    background:#0a0e17;
    border:1px solid rgba(0,240,255,0.08);
    border-radius:16px;
    overflow:hidden;
    box-shadow: 0 0 80px rgba(0,128,255,0.04), 0 0 40px rgba(0,240,255,0.02);
  ">
    <!-- Top glow bar -->
    <tr><td style="height:3px; background:linear-gradient(90deg, transparent 5%, #00f0ff 30%, #0080ff 70%, transparent 95%);"></td></tr>

    ${sodareHeader}

    <!-- Body -->
    <tr><td style="padding:32px 40px 40px;">
      <!-- Greeting -->
      <p style="color:#94a3b8; font-size:15px; line-height:1.7; margin:0 0 24px; font-family:'Segoe UI',Arial,sans-serif;">
        <strong style="color:#e2e8f0;">{{{INVITER_NAME}}}</strong> te ha invitado a unirte a un workspace en SODARE.
      </p>

      <!-- Workspace card -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="
        background:rgba(0,240,255,0.03);
        border:1px solid rgba(0,240,255,0.08);
        border-radius:10px;
        margin-bottom:28px;
      ">
        <tr>
          <td style="padding:20px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <!-- Workspace name -->
              <tr>
                <td style="padding-bottom:12px;">
                  <p style="color:#475569; font-size:10px; margin:0 0 4px; letter-spacing:2px; font-family:'Segoe UI',Arial,sans-serif;">WORKSPACE</p>
                  <p style="color:#00f0ff; font-size:18px; font-weight:700; margin:0; letter-spacing:1px; font-family:'Segoe UI',Arial,sans-serif;">{{{WORKSPACE_NAME}}}</p>
                </td>
              </tr>
              <!-- Divider -->
              <tr><td style="height:1px; background:rgba(0,240,255,0.06);"></td></tr>
              <!-- Role -->
              <tr>
                <td style="padding-top:12px;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-right:8px;">
                        <span style="display:inline-block; width:8px; height:8px; background:#00f0ff; border-radius:50;"></span>
                      </td>
                      <td>
                        <p style="color:#475569; font-size:10px; margin:0; letter-spacing:2px; font-family:'Segoe UI',Arial,sans-serif;">
                          ROL ASIGNADO
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>
                        <p style="color:#e2e8f0; font-size:14px; font-weight:600; margin:4px 0 0; font-family:'Segoe UI',Arial,sans-serif;">
                          {{{ROLE}}}
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- CTA Button -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr><td align="center" style="padding:0 0 28px;">
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="
                background:linear-gradient(135deg, #00f0ff 0%, #0080ff 100%);
                border-radius:8px;
                box-shadow: 0 4px 24px rgba(0,240,255,0.2), 0 2px 8px rgba(0,128,255,0.15);
              ">
                <a href="{{{INVITE_URL}}}" target="_blank" style="
                  display:inline-block;
                  padding:14px 36px;
                  color:#030508;
                  font-weight:700;
                  font-size:13px;
                  text-decoration:none;
                  letter-spacing:1.5px;
                  font-family:'Segoe UI',Arial,sans-serif;
                ">ACEPTAR INVITACI&#xD3;N &nbsp;&#x2192;</a>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>

      <!-- Fallback URL -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr><td>
          <p style="color:#334155; font-size:10px; margin:0 0 6px; letter-spacing:1px; font-family:'Segoe UI',Arial,sans-serif;">
            &#x25B8; ENLACE DIRECTO
          </p>
          <p style="color:#0080ff; font-size:10px; word-break:break-all; margin:0; line-height:1.5; font-family:'Segoe UI',Arial,sans-serif;">
            {{{INVITE_URL}}}
          </p>
        </td></tr>
      </table>
    </td></tr>

    ${sodareFooter("Esta invitaci&#xF3;n expira en 7 d&#xED;as.")}

    <!-- Bottom glow bar -->
    <tr><td style="height:2px; background:linear-gradient(90deg, transparent 10%, #0080ff 50%, transparent 90%);"></td></tr>
  </table>

</td></tr>
</table>
</body>
</html>`.trim();

async function updateTemplate(id: string, name: string, html: string) {
  const res = await fetch(`https://api.resend.com/templates/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ name, html }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`  ${name}:`, data);
    return false;
  }
  console.log(`  ${name} actualizado`);

  // Publicar
  const pubRes = await fetch(`https://api.resend.com/templates/${id}/publish`, {
    method: "POST",
    headers,
  });
  if (pubRes.ok) {
    console.log(`  ${name} publicado\n`);
  }
  return true;
}

async function main() {
  console.log("\n  SODARE — Actualizando templates de email\n");
  console.log("  ────────────────────────────────────────\n");

  await updateTemplate(PASSWORD_RESET_ID, "sodare-password-reset", passwordResetHtml);
  await updateTemplate(WORKSPACE_INVITE_ID, "sodare-workspace-invite", workspaceInviteHtml);

  console.log("  Listo.\n");
}

main();
