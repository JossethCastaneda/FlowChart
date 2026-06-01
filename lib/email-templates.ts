/**
 * SODARE Email Templates v2
 * Premium Star Wars-inspired holographic design.
 * Fully email-client compatible (inline CSS, tables, no flexbox).
 */

function baseWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!--[if mso]>
  <style>body{font-family:Arial,sans-serif!important;}</style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background:#000000;font-family:'Segoe UI',Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Preheader (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    SODARE — Multichannel Intelligence Platform
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#000000;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <!-- Main container -->
        <table width="580" cellpadding="0" cellspacing="0" border="0" style="
          background:linear-gradient(180deg,#060c1a 0%,#030508 100%);
          border:1px solid rgba(0,240,255,0.12);
          border-radius:8px;
          overflow:hidden;
          box-shadow:0 0 60px rgba(0,240,255,0.06),0 0 120px rgba(0,128,255,0.03);
        ">
          <!-- ═══ TOP ACCENT BAR ═══ -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#0080ff,#00f0ff,#00f0ff,#0080ff);"></td>
          </tr>

          <!-- ═══ LOGO SECTION ═══ -->
          <tr>
            <td align="center" style="padding:40px 40px 28px;">
              <!-- Logo emblem -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px;">
                <tr>
                  <td style="
                    width:60px;height:60px;
                    background:linear-gradient(135deg,#040a18,#0a1628);
                    border:2px solid #00f0ff;
                    text-align:center;
                    vertical-align:middle;
                    font-family:'Courier New',Consolas,monospace;
                    font-size:32px;
                    font-weight:900;
                    color:#00f0ff;
                    border-radius:6px;
                    box-shadow:0 0 30px rgba(0,240,255,0.25),inset 0 0 20px rgba(0,240,255,0.05);
                  ">S</td>
                </tr>
              </table>

              <!-- Wordmark -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td style="
                    font-family:'Courier New',Consolas,monospace;
                    font-size:28px;
                    font-weight:900;
                    letter-spacing:10px;
                    color:#f0f4f8;
                    text-shadow:0 0 20px rgba(0,240,255,0.3),0 0 40px rgba(0,240,255,0.1);
                    padding-bottom:12px;
                  ">SODARE</td>
                </tr>
              </table>

              <!-- Decorative divider -->
              <table width="220" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td style="height:1px;background:linear-gradient(90deg,transparent,rgba(0,240,255,0.4));"></td>
                  <td width="12" align="center" style="padding:0 4px;">
                    <div style="width:6px;height:6px;background:#00f0ff;border-radius:1px;transform:rotate(45deg);box-shadow:0 0 8px rgba(0,240,255,0.6);"></div>
                  </td>
                  <td style="height:1px;background:linear-gradient(90deg,rgba(0,240,255,0.4),transparent);"></td>
                </tr>
              </table>

              <!-- Subtitle -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin:10px auto 0;">
                <tr>
                  <td style="
                    font-family:'Courier New',monospace;
                    font-size:9px;
                    letter-spacing:4px;
                    color:rgba(0,240,255,0.35);
                  ">MULTICHANNEL INTELLIGENCE</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══ SCAN LINE ═══ -->
          <tr>
            <td style="padding:0 32px;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(0,240,255,0.08),transparent);"></div>
            </td>
          </tr>

          <!-- ═══ CONTENT ═══ -->
          <tr>
            <td style="padding:28px 36px 36px;">
              ${content}
            </td>
          </tr>

          <!-- ═══ FOOTER ═══ -->
          <tr>
            <td style="padding:0 36px;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(0,240,255,0.06),transparent);"></div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 36px 28px;">
              <!-- Footer scan lines -->
              <div style="margin-bottom:16px;">
                <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(0,240,255,0.05),transparent);margin-bottom:4px;"></div>
                <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(0,240,255,0.03),transparent);"></div>
              </div>
              <p style="margin:0;font-family:'Courier New',monospace;font-size:9px;color:rgba(100,116,139,0.5);letter-spacing:3px;">
                SODARE
              </p>
              <p style="margin:4px 0 0;font-family:'Courier New',monospace;font-size:8px;color:rgba(100,116,139,0.25);letter-spacing:2px;">
                SISTEMA OPERATIVO DE MARKETING DIGITAL
              </p>
            </td>
          </tr>

          <!-- ═══ BOTTOM ACCENT ═══ -->
          <tr>
            <td style="height:2px;background:linear-gradient(90deg,transparent,rgba(0,128,255,0.3),transparent);"></td>
          </tr>
        </table>

        <!-- Security disclaimer -->
        <table width="580" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding:16px 0 0;">
              <p style="margin:0;font-family:'Courier New',monospace;font-size:8px;color:rgba(100,116,139,0.2);letter-spacing:2px;">
                COMUNICACION SEGURA &#8226; NO REENVIAR
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─────────────────────────────────────────────────
// INVITE EMAIL
// ─────────────────────────────────────────────────
export function getInviteEmailHtml({
  inviterName,
  workspaceName,
  role,
  inviteUrl,
}: {
  inviterName: string;
  workspaceName: string;
  role: string;
  inviteUrl: string;
}): string {
  const roleLabel = role === "ADMIN" ? "ADMINISTRADOR" : "MIEMBRO";
  const roleColor = role === "ADMIN" ? "#ffbe0b" : "#06d6a0";
  const roleBg = role === "ADMIN" ? "rgba(255,190,11,0.08)" : "rgba(6,214,160,0.08)";
  const roleBorder = role === "ADMIN" ? "rgba(255,190,11,0.25)" : "rgba(6,214,160,0.25)";

  const content = `
    <!-- Mission briefing banner -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="
      background:linear-gradient(135deg,rgba(0,240,255,0.04),rgba(0,128,255,0.02));
      border:1px solid rgba(0,240,255,0.12);
      border-radius:4px;
      margin-bottom:24px;
    ">
      <tr>
        <td style="padding:18px 22px;">
          <p style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:9px;color:rgba(0,240,255,0.45);letter-spacing:4px;">
            TRANSMISION ENTRANTE
          </p>
          <p style="margin:0;font-size:15px;color:#e8ecf1;line-height:1.6;">
            <strong style="color:#00f0ff;">${inviterName}</strong> te ha invitado a unirte al equipo
          </p>
        </td>
      </tr>
    </table>

    <!-- Workspace info card -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="
      background:linear-gradient(135deg,rgba(0,20,40,0.8),rgba(0,10,25,0.6));
      border:1px solid rgba(0,240,255,0.1);
      border-left:3px solid #00f0ff;
      border-radius:0 4px 4px 0;
      margin-bottom:28px;
      box-shadow:0 4px 24px rgba(0,0,0,0.3);
    ">
      <tr>
        <td style="padding:24px;">
          <!-- Workspace name -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-bottom:16px;border-bottom:1px solid rgba(0,240,255,0.06);">
                <p style="margin:0 0 4px;font-family:'Courier New',monospace;font-size:8px;color:rgba(148,163,184,0.4);letter-spacing:3px;">
                  WORKSPACE
                </p>
                <p style="margin:0;font-size:22px;font-weight:800;color:#f0f4f8;letter-spacing:1px;text-shadow:0 0 10px rgba(0,240,255,0.1);">
                  ${workspaceName}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding-top:16px;">
                <p style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:8px;color:rgba(148,163,184,0.4);letter-spacing:3px;">
                  ROL ASIGNADO
                </p>
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="
                      font-family:'Courier New',monospace;
                      font-size:11px;
                      font-weight:800;
                      color:${roleColor};
                      background:${roleBg};
                      border:1px solid ${roleBorder};
                      padding:5px 14px;
                      border-radius:3px;
                      letter-spacing:3px;
                    ">${roleLabel}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding:4px 0 32px;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="
                background:linear-gradient(135deg,#00e0ff,#0080ff);
                border-radius:4px;
                box-shadow:0 0 30px rgba(0,240,255,0.25),0 4px 16px rgba(0,128,255,0.3);
              ">
                <a href="${inviteUrl}" target="_blank" style="
                  display:inline-block;
                  padding:16px 48px;
                  font-family:'Courier New',monospace;
                  font-size:13px;
                  font-weight:900;
                  color:#020409;
                  text-decoration:none;
                  letter-spacing:3px;
                ">ACEPTAR MISION &#8594;</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Expiry -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding:0 0 20px;">
          <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(0,240,255,0.06),transparent);margin-bottom:16px;"></div>
          <p style="margin:0;font-family:'Courier New',monospace;font-size:9px;color:rgba(100,116,139,0.45);letter-spacing:2px;">
            &#9202; TRANSMISION EXPIRA EN 7 DIAS
          </p>
        </td>
      </tr>
    </table>

    <!-- Fallback link -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="
      background:rgba(0,8,16,0.6);
      border:1px solid rgba(0,240,255,0.06);
      border-radius:4px;
    ">
      <tr>
        <td style="padding:14px 18px;">
          <p style="margin:0 0 8px;font-family:'Courier New',monospace;font-size:8px;color:rgba(148,163,184,0.3);letter-spacing:2px;">
            ENLACE DE ACCESO DIRECTO:
          </p>
          <p style="margin:0;font-size:11px;line-height:1.6;">
            <a href="${inviteUrl}" style="color:#00d4ff;word-break:break-all;text-decoration:none;">${inviteUrl}</a>
          </p>
        </td>
      </tr>
    </table>
  `;

  return baseWrapper(content);
}

// ─────────────────────────────────────────────────
// PASSWORD RESET EMAIL
// ─────────────────────────────────────────────────
export function getPasswordResetEmailHtml({
  userName,
  resetUrl,
}: {
  userName: string;
  resetUrl: string;
}): string {
  const content = `
    <!-- Security alert banner -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="
      background:linear-gradient(135deg,rgba(255,45,85,0.05),rgba(255,107,53,0.02));
      border:1px solid rgba(255,45,85,0.15);
      border-radius:4px;
      margin-bottom:24px;
    ">
      <tr>
        <td style="padding:18px 22px;">
          <p style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:9px;color:rgba(255,45,85,0.55);letter-spacing:4px;">
            ALERTA DE SEGURIDAD
          </p>
          <p style="margin:0;font-size:15px;color:#e8ecf1;line-height:1.6;">
            Solicitud de restablecimiento de contrase&ntilde;a
          </p>
        </td>
      </tr>
    </table>

    <!-- Message card -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="
      background:linear-gradient(135deg,rgba(0,20,40,0.8),rgba(0,10,25,0.6));
      border:1px solid rgba(255,45,85,0.08);
      border-left:3px solid rgba(255,45,85,0.5);
      border-radius:0 4px 4px 0;
      margin-bottom:28px;
      box-shadow:0 4px 24px rgba(0,0,0,0.3);
    ">
      <tr>
        <td style="padding:24px;">
          <p style="margin:0 0 8px;font-size:14px;color:#e8ecf1;line-height:1.7;">
            Hola <strong style="color:#f0f4f8;">${userName}</strong>,
          </p>
          <p style="margin:0;font-size:13px;color:rgba(148,163,184,0.65);line-height:1.7;">
            Recibimos una solicitud para restablecer la contrase&ntilde;a de tu cuenta en SODARE. Haz clic en el bot&oacute;n de abajo para continuar.
          </p>
        </td>
      </tr>
    </table>

    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding:4px 0 32px;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="
                background:linear-gradient(135deg,#ff2d55,#ff6b35);
                border-radius:4px;
                box-shadow:0 0 30px rgba(255,45,85,0.2),0 4px 16px rgba(255,107,53,0.25);
              ">
                <a href="${resetUrl}" target="_blank" style="
                  display:inline-block;
                  padding:16px 48px;
                  font-family:'Courier New',monospace;
                  font-size:13px;
                  font-weight:900;
                  color:#ffffff;
                  text-decoration:none;
                  letter-spacing:3px;
                ">RESTABLECER ACCESO &#8594;</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Expiry -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding:0 0 20px;">
          <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,45,85,0.06),transparent);margin-bottom:16px;"></div>
          <p style="margin:0;font-family:'Courier New',monospace;font-size:9px;color:rgba(100,116,139,0.45);letter-spacing:2px;">
            &#9202; ENLACE EXPIRA EN 1 HORA
          </p>
        </td>
      </tr>
    </table>

    <!-- Security warning -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="
      background:rgba(255,45,85,0.03);
      border:1px solid rgba(255,45,85,0.08);
      border-radius:4px;
      margin-bottom:16px;
    ">
      <tr>
        <td style="padding:14px 18px;">
          <p style="margin:0;font-family:'Courier New',monospace;font-size:9px;color:rgba(148,163,184,0.4);line-height:1.8;letter-spacing:1px;">
            &#9888; Si no solicitaste este cambio, tu cuenta esta segura. Ningun cambio se ha realizado.
          </p>
        </td>
      </tr>
    </table>

    <!-- Fallback link -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="
      background:rgba(0,8,16,0.6);
      border:1px solid rgba(255,45,85,0.05);
      border-radius:4px;
    ">
      <tr>
        <td style="padding:14px 18px;">
          <p style="margin:0 0 8px;font-family:'Courier New',monospace;font-size:8px;color:rgba(148,163,184,0.3);letter-spacing:2px;">
            ENLACE DE ACCESO DIRECTO:
          </p>
          <p style="margin:0;font-size:11px;line-height:1.6;">
            <a href="${resetUrl}" style="color:#ff5c7c;word-break:break-all;text-decoration:none;">${resetUrl}</a>
          </p>
        </td>
      </tr>
    </table>
  `;

  return baseWrapper(content);
}

// ─────────────────────────────────────────────────
// WELCOME EMAIL
// ─────────────────────────────────────────────────
export function getWelcomeEmailHtml({
  userName,
  dashboardUrl,
}: {
  userName: string;
  dashboardUrl: string;
}): string {
  const content = `
    <!-- Welcome banner -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="
      background:linear-gradient(135deg,rgba(6,214,160,0.05),rgba(0,184,148,0.02));
      border:1px solid rgba(6,214,160,0.15);
      border-radius:4px;
      margin-bottom:24px;
    ">
      <tr>
        <td style="padding:18px 22px;">
          <p style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:9px;color:rgba(6,214,160,0.55);letter-spacing:4px;">
            SISTEMA ACTIVADO
          </p>
          <p style="margin:0;font-size:15px;color:#e8ecf1;line-height:1.6;">
            Bienvenido al Command Center
          </p>
        </td>
      </tr>
    </table>

    <!-- Greeting card -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="
      background:linear-gradient(135deg,rgba(0,20,40,0.8),rgba(0,10,25,0.6));
      border:1px solid rgba(6,214,160,0.1);
      border-left:3px solid #06d6a0;
      border-radius:0 4px 4px 0;
      margin-bottom:28px;
      box-shadow:0 4px 24px rgba(0,0,0,0.3);
    ">
      <tr>
        <td style="padding:24px;">
          <p style="margin:0 0 8px;font-size:14px;color:#e8ecf1;line-height:1.7;">
            Hola <strong style="color:#f0f4f8;">${userName}</strong>,
          </p>
          <p style="margin:0;font-size:13px;color:rgba(148,163,184,0.65);line-height:1.7;">
            Tu cuenta en SODARE ha sido creada exitosamente. Ahora tienes acceso completo a la plataforma de inteligencia multicanal.
          </p>
        </td>
      </tr>
    </table>

    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding:4px 0 32px;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="
                background:linear-gradient(135deg,#06d6a0,#00b894);
                border-radius:4px;
                box-shadow:0 0 30px rgba(6,214,160,0.2),0 4px 16px rgba(0,184,148,0.25);
              ">
                <a href="${dashboardUrl}" target="_blank" style="
                  display:inline-block;
                  padding:16px 48px;
                  font-family:'Courier New',monospace;
                  font-size:13px;
                  font-weight:900;
                  color:#020409;
                  text-decoration:none;
                  letter-spacing:3px;
                ">INICIAR SESION &#8594;</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  return baseWrapper(content);
}
