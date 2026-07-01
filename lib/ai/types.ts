/**
 * Abstracción LLM provider-agnóstica para Aria (y reutilizable en todo el repo).
 *
 * Un único contrato `LLMProvider` con `complete()` (texto) y `completeStructured()`
 * (JSON validado). Cada proveedor (OpenAI, Google Gemini, Anthropic) implementa el
 * contrato traduciendo al dialecto de su API. La API key vive SOLO en el servidor;
 * nunca llega al cliente (mismo patrón de seguridad que app/api/gridia).
 */

export type ProviderId = "openai" | "gemini" | "anthropic";

export type LLMRole = "system" | "user" | "assistant";

export interface LLMMessage {
  role: LLMRole;
  content: string;
}

export interface CompleteOptions {
  messages: LLMMessage[];
  /** Instrucción de sistema (se mapea al campo nativo de cada proveedor). */
  system?: string;
  /** Override de modelo; si se omite, el adapter usa su defaultModel. */
  model?: string;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface CompleteResult {
  text: string;
  model: string;
  provider: ProviderId;
}

/**
 * Petición estructurada provider-neutral. `jsonSchema` es JSON Schema estándar
 * (tipos en minúscula); cada adapter lo traduce a su dialecto. `parse` valida el
 * JSON devuelto (típicamente `zodSchema.parse`) y produce el tipo T.
 */
export interface CompleteStructuredOptions<T> extends CompleteOptions {
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  parse: (raw: unknown) => T;
}

export interface CompleteStructuredResult<T> extends CompleteResult {
  data: T;
}

export interface LLMProvider {
  readonly id: ProviderId;
  readonly defaultModel: string;
  /** true si la API key del proveedor está presente en el entorno. */
  isConfigured(): boolean;
  complete(opts: CompleteOptions): Promise<CompleteResult>;
  completeStructured<T>(opts: CompleteStructuredOptions<T>): Promise<CompleteStructuredResult<T>>;
}

/** Error normalizado de un proveedor upstream (no expone detalle al cliente). */
export class LLMProviderError extends Error {
  constructor(
    public readonly provider: ProviderId,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "LLMProviderError";
  }
}
