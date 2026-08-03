"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

/**
 * useBrowserNotifications — Notificaciones nativas del navegador + sonido.
 *
 * Se monta globalmente en ClientMainWrapper. Funciona incluso si la pestaña
 * está inactiva (background tab), siempre que el navegador esté abierto.
 *
 * Estrategia:
 * - Cuando el usuario NO está en /dashboard/inbox, hace polling ligero cada 10s
 *   al endpoint de conversaciones para detectar nuevos mensajes no leídos.
 * - Cuando SÍ está en /dashboard/inbox, el SSE del inbox ya maneja la data;
 *   este hook se desactiva para no duplicar conexiones.
 *
 * Dispara:
 * 1. Una notificación nativa del sistema (pop-up de Windows/macOS)
 * 2. Un sonido de notificación tipo "ding-dong" vía AudioContext
 */

// ── Sound generation via HTML Audio Element ──
let audioRef: HTMLAudioElement | null = null;

function playNotificationSound(): void {
  try {
    if (typeof window === "undefined") return;
    
    if (!audioRef) {
      audioRef = new Audio("/sounds/inbox-notification.mp3");
      // Pre-cargar el audio
      audioRef.load();
    }
    
    // Si ya se está reproduciendo, reiniciar al principio
    audioRef.currentTime = 0;
    
    // Ignorar promesa para evitar errores no capturados si el usuario
    // no ha interactuado con la página (política de auto-play)
    audioRef.play().catch(() => {
      // Silently fail if autoplay is blocked
    });
  } catch {
    // Failsafe catch
  }
}

// ── Platform labels for notification title ──
const PLATFORM_LABELS: Record<string, string> = {
  facebook_messenger: "Messenger",
  instagram_dm: "Instagram DM",
  instagram_comment: "Instagram",
  facebook_comment: "Facebook",
  whatsapp: "WhatsApp",
};

interface ConvSnapshot {
  id: string;
  contactName: string | null;
  platform: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: boolean;
}

const POLL_INTERVAL = 10_000; // 10s when NOT on inbox page
const INBOX_POLL_INTERVAL = 5_000; // 5s when ON inbox page (just for notification, SSE handles UI)

export function useBrowserNotifications() {
  const pathname = usePathname();
  const permissionRef = useRef<NotificationPermission>("default");
  const lastSnapshotRef = useRef<Map<string, string>>(new Map());
  const initializedRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Throttle: evitar spam de sonidos — mínimo 3s entre notificaciones
  const lastNotifTimeRef = useRef(0);

  // ── Solicitar permiso al montar ──
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    permissionRef.current = Notification.permission;
    if (Notification.permission === "default") {
      Notification.requestPermission().then((p) => {
        permissionRef.current = p;
      });
    }
  }, []);



  // ── Verificar nuevos mensajes y disparar notificaciones ──
  const checkForNewMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/inbox/conversations?_t=${Date.now()}`);
      if (!res.ok) return;
      const data = await res.json();
      const conversations: ConvSnapshot[] = data?.conversations || [];

      if (!initializedRef.current) {
        // Primera carga — cachear snapshot, no notificar
        for (const c of conversations) {
          lastSnapshotRef.current.set(c.id, c.lastMessageAt || "");
        }
        initializedRef.current = true;
        return;
      }

      const newUnread: ConvSnapshot[] = [];

      for (const c of conversations) {
        if (!c.unread) continue;
        const prev = lastSnapshotRef.current.get(c.id);
        if (c.lastMessageAt && c.lastMessageAt !== prev) {
          newUnread.push(c);
        }
      }

      // Actualizar snapshot
      for (const c of conversations) {
        lastSnapshotRef.current.set(c.id, c.lastMessageAt || "");
      }

      if (newUnread.length === 0) return;

      // Throttle — no spamear
      const now = Date.now();
      if (now - lastNotifTimeRef.current < 3000) return;
      lastNotifTimeRef.current = now;

      // ── Sonido ──
      playNotificationSound();

      // ── Notificación nativa ──
      if (permissionRef.current !== "granted") return;

      if (newUnread.length === 1) {
        const c = newUnread[0];
        const platform = PLATFORM_LABELS[c.platform] || "Mensaje";
        const title = `${c.contactName || "Nuevo mensaje"} — ${platform}`;
        const body = c.lastMessage?.slice(0, 120) || "Tienes un nuevo mensaje";

        const notification = new Notification(title, {
          body,
          icon: "/icon.svg",
          badge: "/icon.svg",
          tag: `flowchart-inbox-${c.id}`,
          silent: true, // Nosotros manejamos el sonido
        });

        notification.onclick = () => {
          window.focus();
          window.location.href = `/dashboard/inbox`;
          notification.close();
        };

        setTimeout(() => notification.close(), 6000);
      } else {
        // Múltiples mensajes — notificación agrupada
        const notification = new Notification(
          ` ${newUnread.length} nuevos mensajes`,
          {
            body: newUnread
              .slice(0, 4)
              .map((c) => {
                const name = c.contactName || "Usuario";
                const msg = (c.lastMessage || "").slice(0, 40);
                return `${name}: ${msg}`;
              })
              .join("\n"),
            icon: "/icon.svg",
            badge: "/icon.svg",
            tag: "flowchart-inbox-batch",
            silent: true,
          }
        );

        notification.onclick = () => {
          window.focus();
          window.location.href = `/dashboard/inbox`;
          notification.close();
        };

        setTimeout(() => notification.close(), 8000);
      }
    } catch {
      // Network error — silently ignore
    }
  }, []);

  // ── Polling loop ──
  useEffect(() => {
    // Carga inicial del snapshot (sin notificar)
    checkForNewMessages();

    const isInbox = pathname?.startsWith("/dashboard/inbox");
    const interval = isInbox ? INBOX_POLL_INTERVAL : POLL_INTERVAL;

    pollTimerRef.current = setInterval(() => {
      checkForNewMessages();
    }, interval);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [checkForNewMessages, pathname]);
}
