/**
 * FLOWCHART Email Templates v3
 * Responsive Light & Dark Mode Compatible Design.
 * Clean, corporate light mode by default with cyberpunk/holographic Dark Mode fallback.
 */

function baseWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    /* Base Resets */
    body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased; margin: 0; padding: 0; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    
    /* Dark Mode Overrides */
    @media (prefers-color-scheme: dark) {
      .bg-body { background-color: #000000 !important; }
      .bg-card { 
        background: linear-gradient(180deg,#060c1a 0%,#030508 100%) !important; 
        border: 1px solid rgba(91,155,255,0.12) !important;
        box-shadow: 0 0 60px rgba(91,155,255,0.06), 0 0 120px rgba(0,128,255,0.03) !important;
      }
      .bg-inner-card {
        background: linear-gradient(135deg,rgba(0,20,40,0.8),rgba(0,10,25,0.6)) !important;
        border: 1px solid rgba(91,155,255,0.1) !important;
        box-shadow: 0 4px 24px rgba(0,0,0,0.3) !important;
      }
      .bg-banner { background: linear-gradient(135deg,rgba(91,155,255,0.04),rgba(0,128,255,0.02)) !important; border: 1px solid rgba(91,155,255,0.12) !important; }
      
      .text-main { color: #f0f4f8 !important; }
      .text-muted { color: #94a3b8 !important; }
      .text-accent { color: #5b9bff !important; }
      
      .logo-emblem { background: linear-gradient(135deg,#040a18,#0a1628) !important; border-color: #5b9bff !important; color: #5b9bff !important; box-shadow: 0 0 30px rgba(91,155,255,0.25),inset 0 0 20px rgba(91,155,255,0.05) !important; }
      .logo-text { color: #f0f4f8 !important; text-shadow: 0 0 20px rgba(91,155,255,0.3),0 0 40px rgba(91,155,255,0.1) !important; }
      
      .border-line { background: linear-gradient(90deg,transparent,rgba(91,155,255,0.08),transparent) !important; }
      .footer-text { color: rgba(148,163,184,0.5) !important; }
    }
  </style>
  <!--[if mso]>
  <style>body{font-family:Arial,sans-serif!important;}</style>
  <![endif]-->
</head>
<body class="bg-body" style="margin:0;padding:0;background-color:#f8fafc;font-family:'Segoe UI',Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    FLOWCHART — Sistema Operativo de Marketing Digital
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-body" style="background-color:#f8fafc;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <!-- Main container -->
        <table width="100%" style="max-width:580px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);" cellpadding="0" cellspacing="0" border="0" class="bg-card">
          <!-- TOP ACCENT BAR -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#2563eb,#5b9bff,#5b9bff,#2563eb);"></td>
          </tr>

          <!-- LOGO SECTION -->
          <tr>
            <td align="center" style="padding:40px 40px 28px;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px;">
                <tr>
                  <td class="logo-emblem" style="width:60px;height:60px;background-color:#f1f5f9;border:2px solid #cbd5e1;text-align:center;vertical-align:middle;font-family:'Courier New',Consolas,monospace;font-size:32px;font-weight:900;color:#0f172a;border-radius:6px;">S</td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td class="logo-text" style="font-family:'Courier New',Consolas,monospace;font-size:28px;font-weight:900;letter-spacing:10px;color:#0f172a;padding-bottom:12px;">FLOWCHART</td>
                </tr>
              </table>

              <table width="220" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td class="border-line" style="height:1px;background-color:#cbd5e1;"></td>
                  <td width="12" align="center" style="padding:0 4px;">
                    <div style="width:6px;height:6px;background-color:#2563eb;border-radius:1px;transform:rotate(45deg);"></div>
                  </td>
                  <td class="border-line" style="height:1px;background-color:#cbd5e1;"></td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" border="0" style="margin:10px auto 0;">
                <tr>
                  <td class="text-muted" style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:4px;color:#64748b;">MULTICHANNEL INTELLIGENCE</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- SCAN LINE -->
          <tr>
            <td style="padding:0 32px;">
              <div class="border-line" style="height:1px;background-color:#f1f5f9;"></div>
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td style="padding:28px 36px 36px;">
              ${content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:0 36px;">
              <div class="border-line" style="height:1px;background-color:#f1f5f9;"></div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 36px 28px;">
              <p class="footer-text" style="margin:0;font-family:'Courier New',monospace;font-size:9px;color:#94a3b8;letter-spacing:3px;">
                FLOWCHART
              </p>
              <p class="footer-text" style="margin:4px 0 0;font-family:'Courier New',monospace;font-size:8px;color:#94a3b8;letter-spacing:2px;">
                SISTEMA OPERATIVO DE MARKETING DIGITAL
              </p>
            </td>
          </tr>

          <!-- BOTTOM ACCENT -->
          <tr>
            <td style="height:2px;background:linear-gradient(90deg,transparent,rgba(0,128,255,0.3),transparent);"></td>
          </tr>
        </table>

        <!-- Security disclaimer -->
        <table width="100%" style="max-width:580px;" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding:16px 0 0;">
              <p class="footer-text" style="margin:0;font-family:'Courier New',monospace;font-size:8px;color:#94a3b8;letter-spacing:2px;">
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
  const roleColorLight = role === "ADMIN" ? "#d97706" : "#2b9a67";
  const roleBgLight = role === "ADMIN" ? "#fef3c7" : "#d1fae5";
  const roleBorderLight = role === "ADMIN" ? "#fde68a" : "#a7f3d0";
  
  const content = `
    <!-- Mission briefing banner -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-banner" style="background-color:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px;margin-bottom:24px;">
      <tr>
        <td style="padding:18px 22px;">
          <p class="text-muted" style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:9px;color:#64748b;letter-spacing:4px;">
            TRANSMISION ENTRANTE
          </p>
          <p class="text-main" style="margin:0;font-size:15px;color:#0f172a;line-height:1.6;">
            <strong class="text-accent" style="color:#2563eb;">${inviterName}</strong> te ha invitado a unirte al equipo
          </p>
        </td>
      </tr>
    </table>

    <!-- Workspace info card -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-inner-card" style="background-color:#ffffff;border:1px solid #e2e8f0;border-left:3px solid #2563eb;border-radius:0 4px 4px 0;margin-bottom:28px;">
      <tr>
        <td style="padding:24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td class="border-line" style="padding-bottom:16px;border-bottom:1px solid #f1f5f9;">
                <p class="text-muted" style="margin:0 0 4px;font-family:'Courier New',monospace;font-size:8px;color:#94a3b8;letter-spacing:3px;">
                  WORKSPACE
                </p>
                <p class="text-main" style="margin:0;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:1px;">
                  ${workspaceName}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding-top:16px;">
                <p class="text-muted" style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:8px;color:#94a3b8;letter-spacing:3px;">
                  ROL ASIGNADO
                </p>
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-family:'Courier New',monospace;font-size:11px;font-weight:800;color:${roleColorLight};background-color:${roleBgLight};border:1px solid ${roleBorderLight};padding:5px 14px;border-radius:3px;letter-spacing:3px;">
                      ${roleLabel}
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
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding:4px 0 32px;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background:linear-gradient(135deg,#00e0ff,#2563eb);border-radius:4px;box-shadow:0 4px 16px rgba(0,128,255,0.3);">
                <a href="${inviteUrl}" target="_blank" style="display:inline-block;padding:16px 48px;font-family:'Courier New',monospace;font-size:13px;font-weight:900;color:#ffffff;text-decoration:none;letter-spacing:3px;">ACEPTAR MISION &#8594;</a>
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
          <div class="border-line" style="height:1px;background-color:#e2e8f0;margin-bottom:16px;"></div>
          <p class="text-muted" style="margin:0;font-family:'Courier New',monospace;font-size:9px;color:#94a3b8;letter-spacing:2px;">
            &#9202; TRANSMISION EXPIRA EN 7 DIAS
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
    <table width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-banner" style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:4px;margin-bottom:24px;">
      <tr>
        <td style="padding:18px 22px;">
          <p style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:9px;color:#dc2626;letter-spacing:4px;">
            ALERTA DE SEGURIDAD
          </p>
          <p class="text-main" style="margin:0;font-size:15px;color:#0f172a;line-height:1.6;">
            Solicitud de restablecimiento de contraseña
          </p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-inner-card" style="background-color:#ffffff;border:1px solid #e2e8f0;border-left:3px solid #e5484d;border-radius:0 4px 4px 0;margin-bottom:28px;">
      <tr>
        <td style="padding:24px;">
          <p class="text-main" style="margin:0 0 8px;font-size:14px;color:#0f172a;line-height:1.7;">
            Hola <strong>${userName}</strong>,
          </p>
          <p class="text-muted" style="margin:0;font-size:13px;color:#64748b;line-height:1.7;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta en FLOWCHART. Haz clic en el botón de abajo para continuar.
          </p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding:4px 0 32px;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background:linear-gradient(135deg,#e5484d,#d98843);border-radius:4px;">
                <a href="${resetUrl}" target="_blank" style="display:inline-block;padding:16px 48px;font-family:'Courier New',monospace;font-size:13px;font-weight:900;color:#ffffff;text-decoration:none;letter-spacing:3px;">RESTABLECER ACCESO &#8594;</a>
              </td>
            </tr>
          </table>
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
    <table width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-banner" style="background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:4px;margin-bottom:24px;">
      <tr>
        <td style="padding:18px 22px;">
          <p style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:9px;color:#2b9a67;letter-spacing:4px;">
            SISTEMA ACTIVADO
          </p>
          <p class="text-main" style="margin:0;font-size:15px;color:#0f172a;line-height:1.6;">
            Bienvenido al Command Center
          </p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-inner-card" style="background-color:#ffffff;border:1px solid #e2e8f0;border-left:3px solid #10b981;border-radius:0 4px 4px 0;margin-bottom:28px;">
      <tr>
        <td style="padding:24px;">
          <p class="text-main" style="margin:0 0 8px;font-size:14px;color:#0f172a;line-height:1.7;">
            Hola <strong>${userName}</strong>,
          </p>
          <p class="text-muted" style="margin:0;font-size:13px;color:#64748b;line-height:1.7;">
            Tu cuenta en FLOWCHART ha sido creada exitosamente. Ahora tienes acceso completo a la plataforma de inteligencia multicanal.
          </p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding:4px 0 32px;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background:linear-gradient(135deg,#34b77c,#00b894);border-radius:4px;">
                <a href="${dashboardUrl}" target="_blank" style="display:inline-block;padding:16px 48px;font-family:'Courier New',monospace;font-size:13px;font-weight:900;color:#ffffff;text-decoration:none;letter-spacing:3px;">INICIAR SESION &#8594;</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  return baseWrapper(content);
}

// ─────────────────────────────────────────────────
// TASK ASSIGNED EMAIL
// ─────────────────────────────────────────────────
export function getTaskAssignedEmailHtml({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  assigneeName,
  taskTitle,
  assignerName,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  priority,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  dueDate,
  taskUrl,
}: {
  assigneeName: string;
  taskTitle: string;
  assignerName: string;
  priority: string;
  dueDate: string | null;
  taskUrl: string;
}): string {
  const content = `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-banner" style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:4px;margin-bottom:24px;">
      <tr>
        <td style="padding:18px 22px;">
          <p class="text-muted" style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:9px;color:#3b82f6;letter-spacing:4px;">
            NUEVA MISION ASIGNADA
          </p>
          <p class="text-main" style="margin:0;font-size:15px;color:#0f172a;line-height:1.6;">
            <strong>${assignerName}</strong> te asignó una tarea
          </p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-inner-card" style="background-color:#ffffff;border:1px solid #e2e8f0;border-left:3px solid #3b82f6;border-radius:0 4px 4px 0;margin-bottom:28px;">
      <tr>
        <td style="padding:24px;">
          <p class="text-muted" style="margin:0 0 4px;font-family:'Courier New',monospace;font-size:8px;color:#64748b;letter-spacing:3px;">TAREA</p>
          <p class="text-main" style="margin:0 0 16px;font-size:18px;font-weight:800;color:#0f172a;">${taskTitle}</p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding:4px 0 32px;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background:linear-gradient(135deg,#00e0ff,#2563eb);border-radius:4px;">
                <a href="${taskUrl}" target="_blank" style="display:inline-block;padding:16px 48px;font-family:'Courier New',monospace;font-size:13px;font-weight:900;color:#ffffff;text-decoration:none;letter-spacing:3px;">VER TAREA &#8594;</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  return baseWrapper(content);
}

// ─────────────────────────────────────────────────
// SLA WARNING EMAIL
// ─────────────────────────────────────────────────
export function getSLAWarningEmailHtml({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  userName,
  taskTitle,
  hoursLeft,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  dueDate,
  taskUrl,
}: {
  userName: string;
  taskTitle: string;
  hoursLeft: number;
  dueDate: string;
  taskUrl: string;
}): string {
  const isOverdue = hoursLeft <= 0;
  const alertColor = isOverdue ? "#dc2626" : "#d97706";
  const alertLabel = isOverdue ? "SLA VENCIDO" : "SLA POR VENCER";
  const timeLabel = isOverdue ? "Vencido" : "Próximo a vencer";

  const content = `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-banner" style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:4px;margin-bottom:24px;">
      <tr>
        <td style="padding:18px 22px;">
          <p style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:9px;color:${alertColor};letter-spacing:4px;">
            ${alertLabel}
          </p>
          <p class="text-main" style="margin:0;font-size:15px;color:#0f172a;line-height:1.6;">
            ${timeLabel}
          </p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-inner-card" style="background-color:#ffffff;border:1px solid #e2e8f0;border-left:3px solid ${alertColor};border-radius:0 4px 4px 0;margin-bottom:28px;">
      <tr>
        <td style="padding:24px;">
          <p class="text-muted" style="margin:0 0 4px;font-family:'Courier New',monospace;font-size:8px;color:#64748b;letter-spacing:3px;">TAREA</p>
          <p class="text-main" style="margin:0 0 12px;font-size:18px;font-weight:800;color:#0f172a;">${taskTitle}</p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding:4px 0 32px;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background:linear-gradient(135deg,${alertColor},#ea580c);border-radius:4px;">
                <a href="${taskUrl}" target="_blank" style="display:inline-block;padding:16px 48px;font-family:'Courier New',monospace;font-size:13px;font-weight:900;color:#ffffff;text-decoration:none;letter-spacing:3px;">ATENDER AHORA &#8594;</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  return baseWrapper(content);
}
