/**
 * Tests del camino LLM del Copilot de Aria (lib/ai/providers + saneo de historial).
 *
 * Mockea fetch para fijar el CONTRATO de cada adapter: forma exacta del payload
 * (system top-level, mapeo de roles, thinkingConfig en Gemini flash), unión de
 * respuestas multi-parte, y errores claros ante respuesta vacía o refusal —
 * los modos de falla que en el chat se verían como burbujas vacías o 400s.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { geminiProvider } from "@/lib/ai/providers/gemini";
import { anthropicProvider } from "@/lib/ai/providers/anthropic";
import { LLMProviderError } from "@/lib/ai/types";
import { sanitizeChatHistory } from "@/lib/crecimiento/llm/history";

const fetchMock = vi.fn();

function mockJsonResponse(json: unknown, ok = true, status = 200) {
  fetchMock.mockResolvedValueOnce({
    ok,
    status,
    json: async () => json,
  });
}

function lastRequestBody(): Record<string, any> {
  const [, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return JSON.parse(init.body);
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  vi.stubEnv("OPENAI_API_KEY", "test-key");
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const CHAT = {
  system: "Eres Aria.",
  messages: [
    { role: "user" as const, content: "Hola" },
    { role: "assistant" as const, content: "Hola, soy Aria." },
    { role: "user" as const, content: "¿Cuántos modelos tengo?" },
  ],
  maxTokens: 1024,
};

describe("geminiProvider.complete (camino del copilot)", () => {
  it("arma el payload correcto: systemInstruction, roles user/model y maxOutputTokens", async () => {
    mockJsonResponse({ candidates: [{ content: { parts: [{ text: "Tienes 3 modelos." }] } }] });
    const r = await geminiProvider.complete(CHAT);
    expect(r.text).toBe("Tienes 3 modelos.");
    const body = lastRequestBody();
    expect(body.systemInstruction.parts[0].text).toBe("Eres Aria.");
    expect(body.contents.map((c: any) => c.role)).toEqual(["user", "model", "user"]);
    expect(body.generationConfig.maxOutputTokens).toBe(1024);
  });

  it("desactiva thinking en modelos flash (el razonamiento consume maxOutputTokens)", async () => {
    mockJsonResponse({ candidates: [{ content: { parts: [{ text: "ok" }] } }] });
    await geminiProvider.complete({ ...CHAT, model: "gemini-2.5-flash" });
    expect(lastRequestBody().generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
  });

  it("NO manda thinkingConfig a modelos pro (no aceptan thinkingBudget 0)", async () => {
    mockJsonResponse({ candidates: [{ content: { parts: [{ text: "ok" }] } }] });
    await geminiProvider.complete({ ...CHAT, model: "gemini-2.5-pro" });
    expect(lastRequestBody().generationConfig.thinkingConfig).toBeUndefined();
  });

  it("une respuestas multi-parte en un solo texto", async () => {
    mockJsonResponse({
      candidates: [{ content: { parts: [{ text: "Parte 1. " }, { text: "Parte 2." }] } }],
    });
    const r = await geminiProvider.complete(CHAT);
    expect(r.text).toBe("Parte 1. Parte 2.");
  });

  it("lanza error claro ante respuesta vacía (no burbuja vacía en el chat)", async () => {
    mockJsonResponse({ candidates: [{ content: { parts: [] }, finishReason: "MAX_TOKENS" }] });
    await expect(geminiProvider.complete(CHAT)).rejects.toThrowError(LLMProviderError);
    mockJsonResponse({ candidates: [{ content: { parts: [] }, finishReason: "MAX_TOKENS" }] });
    await expect(geminiProvider.complete(CHAT)).rejects.toThrow(/vacía.*MAX_TOKENS/);
  });

  it("propaga errores HTTP como LLMProviderError con el status upstream", async () => {
    mockJsonResponse({ error: { message: "quota exceeded" } }, false, 429);
    await expect(geminiProvider.complete(CHAT)).rejects.toMatchObject({
      provider: "gemini",
      status: 429,
    });
  });

  it("adjunta imágenes como inlineData en el último turno de usuario (GridIA multimodal)", async () => {
    mockJsonResponse({ candidates: [{ content: { parts: [{ text: "ok" }] } }] });
    await geminiProvider.complete({
      ...CHAT,
      attachments: [{ mimeType: "image/png", data: "QUJD" }],
    });
    const contents = lastRequestBody().contents;
    const lastUser = contents[contents.length - 1];
    expect(lastUser.role).toBe("user");
    expect(lastUser.parts).toHaveLength(2);
    expect(lastUser.parts[1]).toEqual({ inlineData: { mimeType: "image/png", data: "QUJD" } });
    // Los turnos anteriores no se tocan.
    expect(contents[0].parts).toHaveLength(1);
  });

  it("mueve mensajes role=system del historial a systemInstruction (Gemini no acepta role system)", async () => {
    mockJsonResponse({ candidates: [{ content: { parts: [{ text: "ok" }] } }] });
    await geminiProvider.complete({
      messages: [
        { role: "system", content: "Instrucción extra" },
        { role: "user", content: "Hola" },
      ],
    });
    const body = lastRequestBody();
    expect(body.systemInstruction.parts[0].text).toContain("Instrucción extra");
    expect(body.contents).toHaveLength(1);
    expect(body.contents[0].role).toBe("user");
  });
});

describe("anthropicProvider.complete (camino del copilot)", () => {
  it("arma el payload correcto: system top-level, sin temperature/top_p, max_tokens presente", async () => {
    mockJsonResponse({ content: [{ type: "text", text: "Tienes 3 modelos." }] });
    const r = await anthropicProvider.complete(CHAT);
    expect(r.text).toBe("Tienes 3 modelos.");
    const body = lastRequestBody();
    expect(body.system).toBe("Eres Aria.");
    expect(body.max_tokens).toBe(1024);
    // Estos parámetros devuelven 400 en la familia Claude 4.x — no deben existir.
    expect(body).not.toHaveProperty("temperature");
    expect(body).not.toHaveProperty("top_p");
    expect(body).not.toHaveProperty("thinking");
    expect(body.messages.map((m: any) => m.role)).toEqual(["user", "assistant", "user"]);
  });

  it("une múltiples bloques de texto de la respuesta", async () => {
    mockJsonResponse({
      content: [
        { type: "text", text: "Bloque 1. " },
        { type: "tool_use" },
        { type: "text", text: "Bloque 2." },
      ],
    });
    const r = await anthropicProvider.complete(CHAT);
    expect(r.text).toBe("Bloque 1. Bloque 2.");
  });

  it("convierte stop_reason refusal en error claro", async () => {
    mockJsonResponse({ content: [], stop_reason: "refusal" });
    await expect(anthropicProvider.complete(CHAT)).rejects.toMatchObject({
      provider: "anthropic",
      status: 502,
    });
  });

  it("adjunta imágenes como bloques image antes del texto (GridIA multimodal)", async () => {
    mockJsonResponse({ content: [{ type: "text", text: "ok" }] });
    await anthropicProvider.complete({
      ...CHAT,
      attachments: [{ mimeType: "image/jpeg", data: "QUJD" }],
    });
    const msgs = lastRequestBody().messages;
    const lastUser = msgs[msgs.length - 1];
    expect(Array.isArray(lastUser.content)).toBe(true);
    expect(lastUser.content[0]).toEqual({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: "QUJD" },
    });
    expect(lastUser.content[1]).toEqual({ type: "text", text: "¿Cuántos modelos tengo?" });
  });
});

describe("openaiProvider.complete — multimodal", () => {
  it("adjunta imágenes como image_url data-URL en el último mensaje de usuario", async () => {
    mockJsonResponse({ choices: [{ message: { content: "ok" } }] });
    const { openaiProvider } = await import("@/lib/ai/providers/openai");
    await openaiProvider.complete({
      ...CHAT,
      attachments: [{ mimeType: "image/png", data: "QUJD" }],
    });
    const msgs = lastRequestBody().messages;
    const lastUser = msgs[msgs.length - 1];
    expect(Array.isArray(lastUser.content)).toBe(true);
    expect(lastUser.content[0]).toEqual({ type: "text", text: "¿Cuántos modelos tengo?" });
    expect(lastUser.content[1]).toEqual({
      type: "image_url",
      image_url: { url: "data:image/png;base64,QUJD" },
    });
  });
});

describe("sanitizeChatHistory (saneo del historial del chat)", () => {
  it("recorta saludos/errores del asistente al inicio (Claude exige empezar con user)", () => {
    const out = sanitizeChatHistory([
      { role: "assistant", content: "¡Hola! Soy Aria." },
      { role: "user", content: "Hola" },
      { role: "assistant", content: "¿En qué te ayudo?" },
    ]);
    expect(out[0]).toEqual({ role: "user", content: "Hola" });
    expect(out).toHaveLength(2);
  });

  it("descarta mensajes vacíos o de puro whitespace", () => {
    const out = sanitizeChatHistory([
      { role: "user", content: "   " },
      { role: "user", content: "Hola" },
      { role: "assistant", content: "" },
      { role: "assistant", content: "Respuesta" },
    ]);
    expect(out).toEqual([
      { role: "user", content: "Hola" },
      { role: "assistant", content: "Respuesta" },
    ]);
  });

  it("historial sin mensajes de user → vacío (solo queda el mensaje nuevo)", () => {
    expect(sanitizeChatHistory([{ role: "assistant", content: "Bienvenido" }])).toEqual([]);
    expect(sanitizeChatHistory(undefined)).toEqual([]);
    expect(sanitizeChatHistory([])).toEqual([]);
  });
});
