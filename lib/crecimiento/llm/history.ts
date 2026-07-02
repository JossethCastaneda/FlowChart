/**
 * Saneo del historial de chat del Copilot antes de enviarlo al LLM.
 *
 * Reglas (defensivas — el cliente puede mandar cualquier cosa dentro del schema):
 *  - Sin mensajes vacíos (Gemini rechaza parts sin texto; Claude, contenido vacío).
 *  - El historial debe EMPEZAR con "user": Claude devuelve 400 si el primer
 *    mensaje es del asistente (p.ej. un saludo sembrado por la UI o un recorte
 *    del historial que cayó en un turno del asistente).
 */

import type { LLMMessage } from "@/lib/ai";

export function sanitizeChatHistory(
  history: { role: "user" | "assistant"; content: string }[] | undefined,
): LLMMessage[] {
  const nonEmpty = (history ?? []).filter((m) => m.content.trim() !== "");
  const firstUser = nonEmpty.findIndex((m) => m.role === "user");
  if (firstUser === -1) return [];
  return nonEmpty.slice(firstUser);
}
