/**
 * SODARE Email Templates
 * Star Wars-inspired holographic design — dark theme, cyan accents, scan lines.
 * Pure inline CSS (email-safe). No external stylesheets.
 */

function baseWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#020409;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <!-- Outer border glow -->
    <div style="
      background: linear-gradient(135deg, rgba(0,240,255,0.08), rgba(0,128,255,0.04));
      border: 1px solid rgba(0,240,255,0.15);
      border-radius: 4px;
      overflow: hidden;
    ">
      <!-- Top accent bar -->
      <div style="height:3px;background:linear-gradient(90deg,transparent,#00f0ff,#0080ff,#00f0ff,transparent);"></div>
      
      <!-- Header with logo -->
      <div style="padding:32px 32px 24px;text-align:center;">
        <!-- Hexagonal S logo (inline table hack for email) -->
        <div style="display:inline-block;margin-bottom:16px;">
          <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
            <tr>
              <td style="
                width:52px;height:52px;
                background:rgba(0,15,30,0.9);
                border:2px solid #00f0ff;
                text-align:center;
                vertical-align:middle;
                font-family:'Courier New',monospace;
                font-size:28px;
                font-weight:900;
                color:#00f0ff;
                letter-spacing:-2px;
                border-radius:4px;
                box-shadow:0 0 20px rgba(0,240,255,0.2);
              ">S</td>
            </tr>
          </table>
        </div>
        <!-- Wordmark -->
        <div style="
          font-family:'Courier New',Consolas,monospace;
          font-size:22px;
          font-weight:900;
          letter-spacing:8px;
          color:#e2e8f0;
          text-shadow:0 0 15px rgba(0,240,255,0.25);
        ">SODARE</div>
        <!-- Decorative line -->
        <div style="margin:12px auto 0;display:flex;align-items:center;justify-content:center;gap:8px;max-width:200px;">
          <div style="flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(0,240,255,0.3));"></div>
          <div style="width:4px;height:4px;background:#00f0ff;transform:rotate(45deg);"></div>
          <div style="flex:1;height:1px;background:linear-gradient(90deg,rgba(0,240,255,0.3),transparent);"></div>
        </div>
      </div>

      <!-- Scan line decoration -->
      <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(0,240,255,0.1),transparent);margin:0 32px;"></div>

      <!-- Content area -->
      <div style="padding:24px 32px 32px;">
        ${content}
      </div>

      <!-- Footer -->
      <div style="
        padding:20px 32px;
        border-top:1px solid rgba(0,240,255,0.08);
        text-align:center;
      ">
        <!-- Bottom scan lines -->
        <div style="margin-bottom:12px;">
          <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(0,240,255,0.06),transparent);margin-bottom:3px;"></div>
          <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(0,240,255,0.04),transparent);"></div>
        </div>
        <p style="margin:0;font-size:10px;color:rgba(100,116,139,0.6);letter-spacing:2px;font-family:'Courier New',monospace;">
          SODARE &bull; MULTICHANNEL INTELLIGENCE
        </p>
        <p style="margin:6px 0 0;font-size:9px;color:rgba(100,116,139,0.3);letter-spacing:1px;">
          SISTEMA OPERATIVO DE MARKETING DIGITAL
        </p>
      </div>

      <!-- Bottom accent bar -->
      <div style="height:2px;background:linear-gradient(90deg,transparent,rgba(0,128,255,0.4),transparent);"></div>
    </div>

    <!-- External security note -->
    <p style="text-align:center;font-size:9px;color:rgba(100,116,139,0.25);margin-top:16px;letter-spacing:1px;font-family:'Courier New',monospace;">
      COMUNICACION ENCRIPTADA &bull; NO REENVIAR
    </p>
  </div>
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
  const roleLabel = role === "ADMIN" ? "Administrador" : "Miembro";
  const roleColor = role === "ADMIN" ? "#ffbe0b" : "#06d6a0";

  const content = `
    <!-- Mission briefing header -->
    <div style="
      background:rgba(0,240,255,0.03);
      border:1px solid rgba(0,240,255,0.1);
      border-radius:2px;
      padding:16px 20px;
      margin-bottom:24px;
    ">
      <p style="margin:0 0 4px;font-size:9px;color:rgba(0,240,255,0.5);letter-spacing:3px;font-family:'Courier New',monospace;">
        TRANSMISION ENTRANTE
      </p>
      <p style="margin:0;font-size:14px;color:#e2e8f0;line-height:1.6;">
        <strong style="color:#00f0ff;">${inviterName}</strong> te ha invitado a unirte al equipo
      </p>
    </div>

    <!-- Workspace info card -->
    <div style="
      background:rgba(0,15,30,0.6);
      border:1px solid rgba(0,240,255,0.12);
      border-left:3px solid #00f0ff;
      padding:20px;
      margin-bottom:24px;
      border-radius:0 2px 2px 0;
    ">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="padding-bottom:12px;">
            <p style="margin:0;font-size:9px;color:rgba(148,163,184,0.5);letter-spacing:2px;font-family:'Courier New',monospace;">
              WORKSPACE
            </p>
            <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#e2e8f0;letter-spacing:1px;">
              ${workspaceName}
            </p>
          </td>
        </tr>
        <tr>
          <td>
            <p style="margin:0;font-size:9px;color:rgba(148,163,184,0.5);letter-spacing:2px;font-family:'Courier New',monospace;">
              ROL ASIGNADO
            </p>
            <p style="margin:4px 0 0;">
              <span style="
                display:inline-block;
                font-size:11px;
                font-weight:700;
                color:${roleColor};
                background:${role === 'ADMIN' ? 'rgba(255,190,11,0.1)' : 'rgba(6,214,160,0.1)'};
                border:1px solid ${role === 'ADMIN' ? 'rgba(255,190,11,0.3)' : 'rgba(6,214,160,0.3)'};
                padding:3px 10px;
                border-radius:2px;
                letter-spacing:2px;
                font-family:'Courier New',monospace;
              ">${roleLabel.toUpperCase()}</span>
            </p>
          </td>
        </tr>
      </table>
    </div>

    <!-- CTA Button -->
    <div style="text-align:center;margin:28px 0;">
      <a href="${inviteUrl}" style="
        display:inline-block;
        padding:14px 40px;
        background:linear-gradient(135deg,#00f0ff,#0080ff);
        color:#020409;
        font-weight:800;
        font-size:13px;
        text-decoration:none;
        border-radius:2px;
        letter-spacing:2px;
        font-family:'Courier New',monospace;
        box-shadow:0 0 25px rgba(0,240,255,0.3);
      ">ACEPTAR MISION &rarr;</a>
    </div>

    <!-- Expiry notice -->
    <div style="
      text-align:center;
      padding:12px 0;
      border-top:1px solid rgba(0,240,255,0.06);
    ">
      <p style="margin:0;font-size:10px;color:rgba(100,116,139,0.5);font-family:'Courier New',monospace;letter-spacing:1px;">
        &#9202; TRANSMISION EXPIRA EN 7 DIAS
      </p>
    </div>

    <!-- Fallback link -->
    <div style="margin-top:16px;padding:12px;background:rgba(0,0,0,0.3);border-radius:2px;">
      <p style="margin:0 0 6px;font-size:9px;color:rgba(148,163,184,0.4);letter-spacing:1px;font-family:'Courier New',monospace;">
        ENLACE DE ACCESO DIRECTO:
      </p>
      <p style="margin:0;font-size:10px;color:#00f0ff;word-break:break-all;line-height:1.5;">
        ${inviteUrl}
      </p>
    </div>
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
    <!-- Alert header -->
    <div style="
      background:rgba(255,45,85,0.04);
      border:1px solid rgba(255,45,85,0.15);
      border-radius:2px;
      padding:16px 20px;
      margin-bottom:24px;
    ">
      <p style="margin:0 0 4px;font-size:9px;color:rgba(255,45,85,0.6);letter-spacing:3px;font-family:'Courier New',monospace;">
        ALERTA DE SEGURIDAD
      </p>
      <p style="margin:0;font-size:14px;color:#e2e8f0;line-height:1.6;">
        Solicitud de restablecimiento de contrase&ntilde;a
      </p>
    </div>

    <!-- User greeting -->
    <div style="
      background:rgba(0,15,30,0.6);
      border:1px solid rgba(0,240,255,0.1);
      border-left:3px solid rgba(255,45,85,0.5);
      padding:20px;
      margin-bottom:24px;
      border-radius:0 2px 2px 0;
    ">
      <p style="margin:0;font-size:13px;color:rgba(226,232,240,0.8);line-height:1.7;">
        Hola <strong style="color:#e2e8f0;">${userName}</strong>,
      </p>
      <p style="margin:8px 0 0;font-size:13px;color:rgba(148,163,184,0.6);line-height:1.7;">
        Recibimos una solicitud para restablecer la contrase&ntilde;a de tu cuenta. Si no la solicitaste, puedes ignorar este mensaje.
      </p>
    </div>

    <!-- CTA Button -->
    <div style="text-align:center;margin:28px 0;">
      <a href="${resetUrl}" style="
        display:inline-block;
        padding:14px 40px;
        background:linear-gradient(135deg,#ff2d55,#ff6b35);
        color:#ffffff;
        font-weight:800;
        font-size:13px;
        text-decoration:none;
        border-radius:2px;
        letter-spacing:2px;
        font-family:'Courier New',monospace;
        box-shadow:0 0 25px rgba(255,45,85,0.25);
      ">RESTABLECER ACCESO &rarr;</a>
    </div>

    <!-- Expiry notice -->
    <div style="
      text-align:center;
      padding:12px 0;
      border-top:1px solid rgba(255,45,85,0.08);
    ">
      <p style="margin:0;font-size:10px;color:rgba(100,116,139,0.5);font-family:'Courier New',monospace;letter-spacing:1px;">
        &#9202; ENLACE EXPIRA EN 1 HORA
      </p>
    </div>

    <!-- Security notice -->
    <div style="margin-top:16px;padding:12px;background:rgba(255,45,85,0.03);border:1px solid rgba(255,45,85,0.08);border-radius:2px;">
      <p style="margin:0;font-size:10px;color:rgba(148,163,184,0.4);line-height:1.6;font-family:'Courier New',monospace;">
        &#9888; Si no solicitaste este cambio, tu cuenta esta segura. Ningun cambio se ha realizado.
      </p>
    </div>

    <!-- Fallback link -->
    <div style="margin-top:16px;padding:12px;background:rgba(0,0,0,0.3);border-radius:2px;">
      <p style="margin:0 0 6px;font-size:9px;color:rgba(148,163,184,0.4);letter-spacing:1px;font-family:'Courier New',monospace;">
        ENLACE DE ACCESO DIRECTO:
      </p>
      <p style="margin:0;font-size:10px;color:#ff2d55;word-break:break-all;line-height:1.5;">
        ${resetUrl}
      </p>
    </div>
  `;

  return baseWrapper(content);
}

// ─────────────────────────────────────────────────
// WELCOME EMAIL (for future use)
// ─────────────────────────────────────────────────
export function getWelcomeEmailHtml({
  userName,
  dashboardUrl,
}: {
  userName: string;
  dashboardUrl: string;
}): string {
  const content = `
    <!-- Welcome header -->
    <div style="
      background:rgba(6,214,160,0.04);
      border:1px solid rgba(6,214,160,0.15);
      border-radius:2px;
      padding:16px 20px;
      margin-bottom:24px;
    ">
      <p style="margin:0 0 4px;font-size:9px;color:rgba(6,214,160,0.6);letter-spacing:3px;font-family:'Courier New',monospace;">
        SISTEMA ACTIVADO
      </p>
      <p style="margin:0;font-size:14px;color:#e2e8f0;line-height:1.6;">
        Bienvenido al Command Center
      </p>
    </div>

    <!-- Greeting -->
    <div style="
      background:rgba(0,15,30,0.6);
      border:1px solid rgba(6,214,160,0.1);
      border-left:3px solid #06d6a0;
      padding:20px;
      margin-bottom:24px;
      border-radius:0 2px 2px 0;
    ">
      <p style="margin:0;font-size:13px;color:rgba(226,232,240,0.8);line-height:1.7;">
        Hola <strong style="color:#e2e8f0;">${userName}</strong>,
      </p>
      <p style="margin:8px 0 0;font-size:13px;color:rgba(148,163,184,0.6);line-height:1.7;">
        Tu cuenta en SODARE ha sido creada exitosamente. Ahora tienes acceso completo a la plataforma de inteligencia multicanal.
      </p>
    </div>

    <!-- CTA Button -->
    <div style="text-align:center;margin:28px 0;">
      <a href="${dashboardUrl}" style="
        display:inline-block;
        padding:14px 40px;
        background:linear-gradient(135deg,#06d6a0,#00b894);
        color:#020409;
        font-weight:800;
        font-size:13px;
        text-decoration:none;
        border-radius:2px;
        letter-spacing:2px;
        font-family:'Courier New',monospace;
        box-shadow:0 0 25px rgba(6,214,160,0.25);
      ">INICIAR SESION &rarr;</a>
    </div>
  `;

  return baseWrapper(content);
}
