/**
 * GET /api/whatsapp/client-accounts
 *
 * Lista las cuentas de WhatsApp Business (WABAs) de clientes que han completado
 * el flujo de Embedded Signup y compartido su WABA con el business portfolio.
 *
 * Requiere: META_SYSTEM_USER_TOKEN en variables de entorno (token permanente de
 * Meta Business Manager → System Users con permiso whatsapp_business_management).
 *
 * Ref: GET /{business_id}/client_whatsapp_business_accounts
 */

import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { logger } from "@/lib/logger";

const BUSINESS_ID = process.env.META_BUSINESS_PORTFOLIO_ID ?? "3745887835629895";
const GRAPH_BASE  = "https://graph.facebook.com/v25.0";

export const GET = withWorkspace(async (_req, _ctx) => {
  // El token del System User con permisos de whatsapp_business_management
  const systemToken = process.env.META_SYSTEM_USER_TOKEN;
  if (!systemToken) {
    return apiError(
      "META_SYSTEM_USER_TOKEN no configurado en variables de entorno.",
      "MISSING_SYSTEM_TOKEN",
      503,
    );
  }

  try {
    const url = new URL(`${GRAPH_BASE}/${BUSINESS_ID}/client_whatsapp_business_accounts`);
    url.searchParams.set("fields", "id,name,currency,timezone_id,owner_business_info");
    url.searchParams.set("limit",  "50");
    url.searchParams.set("access_token", systemToken);

    const res = await fetch(url.toString(), {
      next: { revalidate: 60 }, // cache 1 min en edge
      signal: AbortSignal.timeout(10_000),
    });

    const data = await res.json();

    if (!res.ok) {
      logger.error("client-accounts: Meta API error", { error: data?.error });
      return apiError(
        data?.error?.message ?? "Error al consultar Meta Graph API.",
        "META_API_ERROR",
        res.status,
      );
    }

    return apiSuccess({
      accounts: data.data ?? [],
      paging:   data.paging,
      total:    (data.data ?? []).length,
    });
  } catch (err) {
    logger.error("client-accounts: excepción de red", { err });
    return apiError("Error de red al consultar Meta.", "NETWORK_ERROR", 502);
  }
});
