import { z } from "zod";
import { withAuth } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import { apiSuccess, apiError } from "@/lib/api-response";
import { AnalyticsAdapterFactory } from "@/lib/analytics/adapters/AnalyticsAdapterFactory";

// Solo requiere el provider y las credenciales en crudo (sin encriptar, porque es un test en vuelo).
// `live: true` ejecuta una validación REAL contra la API del proveedor (createtoken / GET /sessions);
// por defecto valida solo la forma de las credenciales (sin red).
const TestConnectionSchema = z.object({
  provider: z.string(),
  credentials: z.record(z.string(), z.any()),
  live: z.boolean().optional(),
});

// POST /api/analytics/integrations/test
export const POST = withAuth(async (req) => {
  const result = await validateBody(req, TestConnectionSchema);
  if (!result.ok) return result.response;

  const { provider, credentials, live } = result.data;

  try {
    const adapter = AnalyticsAdapterFactory.getAdapter(provider);
    const isValid = await adapter.testConnection({ ...credentials, live: live === true });

    if (isValid) {
      return apiSuccess({ success: true });
    } else {
      return apiError("La prueba de conexión falló de manera desconocida.", "TEST_FAILED", 400);
    }
  } catch (error) {
    // Si la conexión falla, devolvemos success: false con el mensaje (sin exponer detalles internos)
    const message = error instanceof Error ? error.message : "Error al conectar con el proveedor";
    return apiSuccess({ success: false, error: message });
  }
});
