/**
 * Helper centralizado para autenticación de Cron Jobs de Vercel.
 *
 * Vercel Cron invoca los endpoints con:
 *   GET <ruta>
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Reglas:
 * - Si CRON_SECRET no está configurado → RECHAZA siempre (fail-closed).
 * - Compara el header Authorization con "Bearer <CRON_SECRET>".
 * - Todos los endpoints de cron deben exportar GET y llamar a verifyCronAuth().
 */

import { NextRequest } from "next/server";

/**
 * Verifica que la request provenga de un cron job autenticado de Vercel.
 * @returns true si el header Authorization es válido, false en caso contrario.
 */
export function verifyCronAuth(req: NextRequest | Request): boolean {
  const secret = process.env.CRON_SECRET;
  // fail-closed: si no hay secreto configurado, rechazar siempre
  if (!secret) {
    console.error("[CRON] CRON_SECRET no está configurado — rechazando request.");
    return false;
  }
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}
