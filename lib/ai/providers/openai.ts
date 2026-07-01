/**
 * Adapter OpenAI (Chat Completions). La key vive solo en el servidor.
 * Modelos o-series no aceptan temperature (no enviamos ninguna) y usan
 * max_completion_tokens (lo usamos para todos).
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

const ENDPOINT = "https://api.openai.com/v1/chat/completions";

interface OpenAIResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

function buildMessages(opts: CompleteOptions): { role: string; content: string }[] {
  const out: { role: string; content: string }[] = [];
  if (opts.system) out.push({ role: "system", content: opts.system });
  for (const m of opts.messages) out.push({ role: m.role, content: m.content });
  return out;
}

async function call(
  opts: CompleteOptions,
  model: string,
  responseFormat?: Record<string, unknown>,
): Promise<OpenAIResponse> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new LLMProviderError("openai", 500, "OPENAI_API_KEY no configurada");
  const body: Record<string, unknown> = {
    model,
    messages: buildMessages(opts),
    ...(opts.maxTokens ? { max_completion_tokens: opts.maxTokens } : {}),
    ...(responseFormat ? { response_format: responseFormat } : {}),
  };
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  if (!res.ok) {
    const e = (await res.json().catch(() => ({}))) as OpenAIResponse;
    throw new LLMProviderError("openai", res.status, e.error?.message ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as OpenAIResponse;
}

export const openaiProvider: LLMProvider = {
  id: "openai",
  defaultModel: "gpt-4.1",

  isConfigured() {
    return !!process.env.OPENAI_API_KEY;
  },

  async complete(opts: CompleteOptions): Promise<CompleteResult> {
    const model = opts.model ?? this.defaultModel;
    const data = await call(opts, model);
    return { text: data.choices?.[0]?.message?.content ?? "", model, provider: "openai" };
  },

  async completeStructured<T>(
    opts: CompleteStructuredOptions<T>,
  ): Promise<CompleteStructuredResult<T>> {
    const model = opts.model ?? this.defaultModel;
    const responseFormat = {
      type: "json_schema",
      json_schema: { name: opts.schemaName, schema: toOpenAISchema(opts.jsonSchema), strict: true },
    };
    const data = await call(opts, model, responseFormat);
    const text = data.choices?.[0]?.message?.content ?? "";
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new LLMProviderError("openai", 502, "Respuesta JSON inválida");
    }
    return { text, model, provider: "openai", data: opts.parse(json) };
  },
};
