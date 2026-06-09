/**
 * geminiClient.ts
 *
 * Client-side helper for the GridIA feature.
 * The GEMINI_API_KEY is NOT present in this file.
 * All calls go through the server-side proxy at POST /api/gridia.
 */

import { GridFormData, ContentGridData } from "./types";

/**
 * Generates a content grid by calling the server-side Gemini proxy.
 * The API key never reaches the browser.
 */
export async function generateContentGridClient(formData: GridFormData): Promise<ContentGridData> {
  const res = await fetch("/api/gridia", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Error al generar la parrilla: ${res.status}`
    );
  }

  return res.json();
}
