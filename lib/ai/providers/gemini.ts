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
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
}

function endpoint(model: string, key: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
}

function buildPayload(opts: CompleteOptions): {
  systemInstruction?: { parts: { text: string }[] };
  contents: { role: string; parts: { text: string }[] }[];
} {
  const systemParts: string[] = [];
  if (opts.system) systemParts.push(opts.system);
  const contents: { role: string; parts: { text: string }[] }[] = [];
  for (const m of opts.messages) {
    if (m.role === "system") {
      systemParts.push(m.content);
      continue;
    }
    contents.push({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] });
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
    const body = {
      contents: payload.contents,
      ...(payload.systemInstruction ? { systemInstruction: payload.systemInstruction } : {}),
      generationConfig: {
        ...(opts.maxTokens ? { maxOutputTokens: opts.maxTokens } : {}),
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
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return { text, model, provider: "gemini" };
  },

  async completeStructured<T>(
    opts: CompleteStructuredOptions<T>,
  ): Promise<CompleteStructuredResult<T>> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new LLMProviderError("gemini", 500, "GEMINI_API_KEY no configurada");
    const model = opts.model ?? this.defaultModel;
    const payload = buildPayload(opts);
    const body = {
      contents: payload.contents,
      ...(payload.systemInstruction ? { systemInstruction: payload.systemInstruction } : {}),
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: toGeminiSchema(opts.jsonSchema),
        ...(opts.maxTokens ? { maxOutputTokens: opts.maxTokens } : {}),
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
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new LLMProviderError("gemini", 502, "Respuesta JSON inválida");
    }
    return { text, model, provider: "gemini", data: opts.parse(json) };
  },
};
