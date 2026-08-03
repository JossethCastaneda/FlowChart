/**
 * Router de Manejo de Errores (Capa 3.3 del Sistema Zefirus)
 * Mapea los códigos de error oficiales de Meta a acciones de sistema
 */

export interface MetaErrorParsed {
  category: "transient" | "token" | "permission" | "query" | "policy" | "validation";
  action: "retry_backoff" | "refresh_token" | "check_scopes" | "reduce_scope" | "human_intervention" | "fix_field";
  retryable: boolean;
  user_message: string;
  original_code: number;
  original_subcode?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
export function mapMetaError(metaError: any): MetaErrorParsed {
  // If the error object is nested inside 'error'
  const err = metaError?.error || metaError;
  const code = err?.code || 5000;
  const subcode = err?.error_subcode || err?.subcode || 0;
  const message = err?.message || err?.error_user_msg || "Error desconocido en Meta API";

  // Catálogo oficial mapeado
  const transientCodes = [1, 2, 4, 17, 613, 80000, 80001, 80002, 80003, 80004];
  const policyCodes = [368, 1404078, 1404163, 2859015];
  const permissionCodes = [10, 200, 294, 1815694];
  // Code 2424009: token generated in Development mode — must go live or reconnect
  const devModeCodes = [2424009];

  if (transientCodes.includes(code)) {
    return {
      category: "transient",
      action: "retry_backoff",
      retryable: true,
      user_message: "Perturbación en la fuerza (Error temporal de Meta). Intenta nuevamente más tarde.",
      original_code: code,
      original_subcode: subcode
    };
  }

  if (devModeCodes.includes(subcode) || subcode === 2424009) {
    return {
      category: "policy",
      action: "human_intervention",
      retryable: false,
      user_message: "Token generado en modo Desarrollo. Ve a Integraciones, desconecta y vuelve a conectar tu cuenta para obtener un token de producción válido.",
      original_code: code,
      original_subcode: subcode
    };
  }

  if (code === 190 || code === 102) {
    return {
      category: "token",
      action: "refresh_token",
      retryable: false,
      user_message: "Enlace perdido. El token de sesión ha expirado o es inválido. Por favor reconecta tu cuenta.",
      original_code: code,
      original_subcode: subcode
    };
  }

  if (permissionCodes.includes(code)) {
    return {
      category: "permission",
      action: "check_scopes",
      retryable: false,
      user_message: "Falta nivel de acceso Jedi (Permisos insuficientes en Business Suite o cuenta de anuncios).",
      original_code: code,
      original_subcode: subcode
    };
  }

  if (policyCodes.includes(code)) {
    return {
      category: "policy",
      action: "human_intervention",
      retryable: false,
      user_message: "Lado Oscuro detectado. Acción bloqueada por políticas de Meta o cuenta restringida.",
      original_code: code,
      original_subcode: subcode
    };
  }

  if (code >= 100 && code <= 199) {
    // Si tiene subcódigo o blame_field_specs es de validación
    if (err?.error_data?.blame_field_specs || subcode) {
      return {
        category: "validation",
        action: "fix_field",
        retryable: false,
        user_message: `Parámetro inválido detectado. (${message})`,
        original_code: code,
        original_subcode: subcode
      };
    }
    return {
      category: "query",
      action: "reduce_scope",
      retryable: false,
      user_message: `Consulta errónea o límite de plataforma excedido. (${message})`,
      original_code: code,
      original_subcode: subcode
    };
  }

  // Fallback genérico
  return {
    category: "transient",
    action: "human_intervention",
    retryable: false,
    user_message: `Perturbación en la fuerza no catalogada: ${message}`,
    original_code: code,
    original_subcode: subcode
  };
}

/**
 * Utilidad de guardrail de output (Capa 5.2)
 * Calcula data_age_days y establece si el aprendizaje está incompleto.
 */
export function calculateDataQuality(sinceDateStr?: string, untilDateStr?: string) {
  if (!untilDateStr) {
    return {
      data_age_days: 0,
      incomplete_learning: false
    };
  }
  
  const until = new Date(untilDateStr);
  const now = new Date();
  
  // Calculate days difference
  const diffTime = Math.abs(now.getTime() - until.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  
  return {
    data_age_days: diffDays,
    incomplete_learning: diffDays < 3
  };
}

// Helper to extract error from fetch response (mantener para no romper el resto del app si se usa en otros lados)
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
export async function handleMetaResponse(res: Response): Promise<{ success: boolean; data?: any; error?: MetaErrorParsed }> {
  const json = await res.json();
  if (!res.ok || json.error) {
    return { success: false, error: mapMetaError(json) };
  }
  return { success: true, data: json };
}
