import { Platform } from "./types";
import { MessageSquare, MessageCircle, AtSign } from "lucide-react";

export function relativeTime(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "ahora";
    if (diffMin < 60) return `${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    return `${Math.floor(diffH / 24)}d`;
}

export function formatTime(date: Date): string {
    return date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(date: Date): string {
    const today = new Date();
    const d = new Date(date);
    if (d.toDateString() === today.toDateString()) return "Hoy";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Ayer";
    return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

export function getPlatformConfig(platform: Platform) {
    switch (platform) {
    case "fb_messenger":
      return { label: "Messenger", color: "#0084ff", icon: MessageSquare, bgAlpha: "rgba(0,132,255,0.12)" };
    case "ig_dm":
      return { label: "Instagram", color: "#E1306C", icon: MessageCircle, bgAlpha: "rgba(225,48,108,0.12)" };
    case "ig_comment":
    case "instagram_comment":
      return { label: "Comentario IG", color: "#F77737", icon: AtSign, bgAlpha: "rgba(247,119,55,0.12)" };
    case "fb_comment":
      return { label: "Comentario FB", color: "#1877F2", icon: MessageSquare, bgAlpha: "rgba(24,119,242,0.12)" };
    }
}

export function getInitials(name: string): string {
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export const SAVED_REPLIES = [
      "¡Hola! Gracias por contactarnos. ¿En qué podemos ayudarte?",
      "Nuestro horario de atención es de Lunes a Viernes, 9:00 AM a 6:00 PM.",
      "Hacemos envíos a toda la República Mexicana. Envío gratis en compras mayores a $500.",
      "Te comparto el enlace de nuestro catálogo: [enlace]",
      "Gracias por tu compra. ¡Esperamos verte pronto!",
    ];
export const TEAM_MEMBERS = ["Sin asignar", "Ana", "Luis", "Martha", "Diego"];
