/**
 * Adapter Google Gemini (generateContent). Extrae y generaliza el patrón ya
 * probado en app/api/gridia/route.ts. La key vive solo en el servidor.
 */

import type {
  CompleteOptions,
  CompleteResult,
  CompleteStructuredOptions,
  CompleteStructuredResult,
  LLMProvider,
} from "../types";
import { LLMProviderError } from "../types";
import { toGeminiSchema } from "../schema";

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  error?: { message?: string };
}

/** Une TODAS las parts de texto (Gemini puede responder multi-parte). */
function extractText(data: GeminiResponse): string {
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p) => p.text ?? "").join("");
}

/**
 * gemini-2.5-flash* razona ("thinking") por defecto y ese gasto CUENTA dentro de
 * maxOutputTokens: con presupuestos chicos puede consumirlo pensando y devolver
 * texto vacío. Para el chat lo desactivamos (thinkingBudget: 0 — soportado solo
 * en flash; pro no permite 0, por eso el gate por nombre de modelo).
 */
function thinkingConfigFor(model: string): { thinkingBudget: number } | undefined {
  return model.includes("flash") ? { thinkingBudget: 0 } : undefined;
}

function endpoint(model: string, key: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
}

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

function buildPayload(opts: CompleteOptions): {
  systemInstruction?: { parts: { text: string }[] };
  contents: { role: string; parts: GeminiPart[] }[];
} {
  const systemParts: string[] = [];
  if (opts.system) systemParts.push(opts.system);
  const contents: { role: string; parts: GeminiPart[] }[] = [];
  for (const m of opts.messages) {
    if (m.role === "system") {
      systemParts.push(m.content);
      continue;
    }
    contents.push({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] });
  }
  // Adjuntos multimodales → inlineData en el último turno de usuario.
  if (opts.attachments?.length) {
    const lastUser = [...contents].reverse().find((c) => c.role === "user");
    if (lastUser) {
      for (const a of opts.attachments) {
        lastUser.parts.push({ inlineData: { mimeType: a.mimeType, data: a.data } });
      }
    }
  }
  return {
    systemInstruction: systemParts.length > 0 ? { parts: [{ text: systemParts.join("\n\n") }] } : undefined,
    contents,
  };
}

export const geminiProvider: LLMProvider = {
  id: "gemini",
  defaultModel: "gemini-2.5-flash",

  isConfigured() {
    return !!process.env.GEMINI_API_KEY;
  },

  async complete(opts: CompleteOptions): Promise<CompleteResult> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new LLMProviderError("gemini", 500, "GEMINI_API_KEY no configurada");
    const model = opts.model ?? this.defaultModel;
    const payload = buildPayload(opts);
    const thinkingConfig = thinkingConfigFor(model);
    const body = {
      contents: payload.contents,
      ...(payload.systemInstruction ? { systemInstruction: payload.systemInstruction } : {}),
      generationConfig: {
        ...(opts.maxTokens ? { maxOutputTokens: opts.maxTokens } : {}),
        ...(thinkingConfig ? { thinkingConfig } : {}),
      },
    };
    const res = await fetch(endpoint(model, key), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
    if (!res.ok) {
      const e = (await res.json().catch(() => ({}))) as GeminiResponse;
      throw new LLMProviderError("gemini", res.status, e.error?.message ?? `HTTP ${res.status}`);
    }
    const data = (await res.json()) as GeminiResponse;
    const text = extractText(data);
    if (text.trim() === "") {
      // Respuesta vacía (p.ej. presupuesto agotado en razonamiento o filtro del
      // proveedor): mejor un error claro que una burbuja vacía en el chat.
      const reason = data.candidates?.[0]?.finishReason ?? "sin candidates";
      throw new LLMProviderError("gemini", 502, `Respuesta vacía del modelo (${reason})`);
    }
    return { text, model, provider: "gemini" };
  },

  async completeStructured<T>(
    opts: CompleteStructuredOptions<T>,
  ): Promise<CompleteStructuredResult<T>> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new LLMProviderError("gemini", 500, "GEMINI_API_KEY no configurada");
    const model = opts.model ?? this.defaultModel;
    const payload = buildPayload(opts);
    const thinkingConfig = thinkingConfigFor(model);
    const body = {
      contents: payload.contents,
      ...(payload.systemInstruction ? { systemInstruction: payload.systemInstruction } : {}),
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: toGeminiSchema(opts.jsonSchema),
        ...(opts.maxTokens ? { maxOutputTokens: opts.maxTokens } : {}),
        ...(thinkingConfig ? { thinkingConfig } : {}),
      },
    };
    const res = await fetch(endpoint(model, key), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
    if (!res.ok) {
      const e = (await res.json().catch(() => ({}))) as GeminiResponse;
      throw new LLMProviderError("gemini", res.status, e.error?.message ?? `HTTP ${res.status}`);
    }
    const data = (await res.json()) as GeminiResponse;
    const text = extractText(data);
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new LLMProviderError("gemini", 502, "Respuesta JSON inválida");
    }
    return { text, model, provider: "gemini", data: opts.parse(json) };
  },
};
