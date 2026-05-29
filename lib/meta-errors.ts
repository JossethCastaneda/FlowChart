// Meta Marketing API error code mapping to human-readable Spanish messages

export interface MetaApiError {
  code: number;
  subcode?: number;
  message: string;
  userMessage: string;
  action: "toast" | "redirect" | "retry";
  retryAfterMs?: number;
}

const ERROR_MAP: Record<number, { userMessage: string; action: "toast" | "redirect" | "retry" }> = {
  1: { userMessage: "Error desconocido de Meta. Intenta de nuevo.", action: "toast" },
  2: { userMessage: "Servicio de Meta temporalmente no disponible. Intenta en unos minutos.", action: "retry" },
  4: { userMessage: "Demasiadas solicitudes a Meta. Esperando...", action: "retry" },
  17: { userMessage: "Rate limit alcanzado. Reintentando automáticamente...", action: "retry" },
  100: { userMessage: "Parámetro inválido enviado a Meta.", action: "toast" },
  190: { userMessage: "Token de acceso inválido o expirado. Reconecta tu cuenta de Meta.", action: "redirect" },
  200: { userMessage: "Permisos insuficientes. Verifica los scopes de tu conexión con Meta.", action: "toast" },
  294: { userMessage: "Cuenta publicitaria en revisión por Meta.", action: "toast" },
  368: { userMessage: "Cuenta publicitaria bloqueada temporalmente por Meta.", action: "toast" },
  2635: { userMessage: "Error en presupuesto: el monto está fuera del rango permitido por Meta.", action: "toast" },
};

export function parseMetaError(error: any): MetaApiError {
  // Meta API errors come in format: { error: { message, type, code, error_subcode } }
  const metaErr = error?.error || error;
  const code = metaErr?.code || 0;
  const subcode = metaErr?.error_subcode || metaErr?.subcode || 0;
  const message = metaErr?.message || metaErr?.error_user_msg || error?.message || "Error desconocido";

  const mapped = ERROR_MAP[code];
  if (mapped) {
    return {
      code,
      subcode,
      message,
      userMessage: mapped.userMessage,
      action: mapped.action,
      retryAfterMs: mapped.action === "retry" ? 5000 : undefined,
    };
  }

  return {
    code,
    subcode,
    message,
    userMessage: `Error de Meta (${code}): ${message}`,
    action: "toast",
  };
}

// Helper to extract error from fetch response
export async function handleMetaResponse(res: Response): Promise<{ success: boolean; data?: any; error?: MetaApiError }> {
  const json = await res.json();
  if (!res.ok || json.error) {
    return { success: false, error: parseMetaError(json) };
  }
  return { success: true, data: json };
}
