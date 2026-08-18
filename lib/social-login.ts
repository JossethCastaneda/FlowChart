/**
 * lib/social-login.ts — Inicio de sesión social, una sola implementación.
 *
 * El botón de "Iniciar sesión con Facebook" existe en dos sitios: la pantalla
 * de login y Ajustes → Perfil (para vincular la cuenta). Estaban implementados
 * distinto —el login abría un popup, el perfil hacía un `signIn()` con
 * redirección de página completa— así que se comportaban distinto y solo uno
 * comprobaba si el proveedor estaba configurado.
 *
 * Aquí vive el flujo único: popup → `/login/popup?provider=X` → NextAuth →
 * `/connect/done`, que avisa al abridor con `CONNECT_DONE` y se cierra.
 * Ventaja del popup sobre el redirect: el usuario no pierde el estado de la
 * página desde la que salió, lo que en Ajustes importa (puede tener cambios
 * a medio escribir en otro campo).
 */

export type SocialProvider = "facebook" | "google";

/** Proveedores que NextAuth tiene realmente configurados en este entorno. */
export interface AuthProviders {
  facebook?: unknown;
  google?: unknown;
  [key: string]: unknown;
}

/**
 * Consulta qué proveedores están disponibles. Sirve para no ofrecer un botón
 * que va a fallar por falta de credenciales en el entorno.
 */
export async function fetchAuthProviders(): Promise<AuthProviders | null> {
  try {
    const res = await fetch("/api/auth/providers");
    if (!res.ok) return null;
    return (await res.json()) as AuthProviders;
  } catch {
    return null;
  }
}

export interface SocialLoginHandlers {
  /** La sesión se completó correctamente. */
  onSuccess?: () => void;
  /** El popup se cerró, con éxito o sin él — para apagar el estado de carga. */
  onClose?: () => void;
}

/**
 * Abre el flujo de inicio de sesión social en un popup centrado.
 *
 * Si el navegador bloquea el popup se cae a navegación en la misma pestaña,
 * que funciona igual aunque sea menos cómodo.
 */
export function openSocialLogin(provider: SocialProvider, handlers: SocialLoginHandlers = {}): void {
  const url = `/login/popup?provider=${provider}`;
  const w = 520;
  const h = 660;
  const left = Math.max(0, (window.screen.width - w) / 2);
  const top = Math.max(0, (window.screen.height - h) / 2);
  const popup = window.open(
    url,
    `connect_oauth_${provider}`,
    `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`
  );

  if (!popup) {
    window.location.href = url;
    return;
  }

  const handler = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type !== "CONNECT_DONE") return;
    window.removeEventListener("message", handler);
    if (event.data.module === "login") handlers.onSuccess?.();
    popup.close();
  };
  window.addEventListener("message", handler);

  // Red de seguridad: si el usuario cierra el popup a mano no llega ningún
  // mensaje, y sin esto el botón se quedaría cargando para siempre.
  const timer = setInterval(() => {
    if (!popup.closed) return;
    clearInterval(timer);
    window.removeEventListener("message", handler);
    handlers.onClose?.();
  }, 500);
}
