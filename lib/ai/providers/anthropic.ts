/**
 * Adapter Anthropic Claude (Messages API). La key vive solo en el servidor.
 *
 * Detalles de la API 4.x (verificados con la skill claude-api):
 *  - POST https://api.anthropic.com/v1/messages
 *  - headers: x-api-key, anthropic-version: 2023-06-01
 *  - `max_tokens` es OBLIGATORIO; `system` es top-level (no va en messages)
 *  - NO enviar temperature/top_p ni thinking.budget_tokens (dan 400 en la familia 4.x)
 *  - JSON estructurado vía output_config.format { type:"json_schema", schema }
 *  - IDs válidos: claude-opus-4-8, claude-sonnet-4-6, claude-haiku-4-5
 */

import type {
  CompleteOptions,
  CompleteResult,
  CompleteStructuredOptions,
  CompleteStructuredResult,
  LLMProvider,
} from "../types";
import { LLMProviderError } from "../types";
import { toOpenAISchema } from "../schema";

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const DEFAULT_MAX_TOKENS = 1024;

interface AnthropicResponse {
  content?: { type?: string; text?: string }[];
  stop_reason?: string;
  error?: { message?: string };
}

function buildPayload(opts: CompleteOptions): {
  system: string | undefined;
  messages: { role: string; content: string }[];
} {
  const systemParts: string[] = [];
  if (opts.system) systemParts.push(opts.system);
  const messages: { role: string; content: string }[] = [];
  for (const m of opts.messages) {
    if (m.role === "system") {
      systemParts.push(m.content);
      continue;
    }
    messages.push({ role: m.role, content: m.content });
  }
  return { system: systemParts.length > 0 ? systemParts.join("\n\n") : undefined, messages };
}

async function call(
  opts: CompleteOptions,
  model: string,
  outputConfig?: Record<string, unknown>,
): Promise<AnthropicResponse> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new LLMProviderError("anthropic", 500, "ANTHROPIC_API_KEY no configurada");
  const payload = buildPayload(opts);
  const body: Record<string, unknown> = {
    model,
    max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
    messages: payload.messages,
    ...(payload.system ? { system: payload.system } : {}),
    ...(outputConfig ? { output_config: outputConfig } : {}),
  };
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  if (!res.ok) {
    const e = (await res.json().catch(() => ({}))) as AnthropicResponse;
    throw new LLMProviderError("anthropic", res.status, e.error?.message ?? `HTTP ${res.status}`);
  }
  const data = (await res.json()) as AnthropicResponse;
  if (data.stop_reason === "refusal") {
    throw new LLMProviderError("anthropic", 502, "La solicitud fue rechazada por seguridad");
  }
  return data;
}

function extractText(data: AnthropicResponse): string {
  const block = data.content?.find((b) => b.type === "text" && typeof b.text === "string");
  return block?.text ?? "";
}

export const anthropicProvider: LLMProvider = {
  id: "anthropic",
  defaultModel: "claude-sonnet-4-6",

  isConfigured() {
    return !!process.env.ANTHROPIC_API_KEY;
  },

  async complete(opts: CompleteOptions): Promise<CompleteResult> {
    const model = opts.model ?? this.defaultModel;
    const data = await call(opts, model);
    return { text: extractText(data), model, provider: "anthropic" };
  },

  async completeStructured<T>(
    opts: CompleteStructuredOptions<T>,
  ): Promise<CompleteStructuredResult<T>> {
    const model = opts.model ?? this.defaultModel;
    const outputConfig = {
      format: { type: "json_schema", schema: toOpenAISchema(opts.jsonSchema) },
    };
    const data = await call(opts, model, outputConfig);
    const text = extractText(data);
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new LLMProviderError("anthropic", 502, "Respuesta JSON inválida");
    }
    return { text, model, provider: "anthropic", data: opts.parse(json) };
  },
};
