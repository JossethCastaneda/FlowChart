import { withAuth } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import { apiSuccess, apiError } from "@/lib/api-response";
import { rateLimit, getClientIP } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { NextRequest } from "next/server";

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Contraseña actual requerida"),
  newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres").max(128),
});

/**
 * POST /api/auth/change-password
 * Allows an authenticated user to change their password.
 * - Requires the current password for identity confirmation.
 * - OAuth-only accounts (no password) are rejected with instructions.
 */
export const POST = withAuth(async (req: NextRequest, ctx) => {
  // Rate limit by IP
  const ip = getClientIP(req);
  const { ok } = await rateLimit(`change-password:${ip}`, 5, 15 * 60 * 1000);
  if (!ok) {
    return apiError("Demasiados intentos. Intenta en 15 minutos.", "RATE_LIMITED", 429);
  }

  const result = await validateBody(req, ChangePasswordSchema);
  if (!result.ok) return result.response;
  const { currentPassword, newPassword } = result.data;

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { id: true, password: true, email: true },
  });

  if (!user) return apiError("Usuario no encontrado", "NOT_FOUND", 404);

  if (!user.password) {
    return apiError(
      user.email
        ? "Tu cuenta fue creada con Facebook/Google. Usa '¿Olvidaste tu contraseña?' para establecer una contraseña."
        : "Tu cuenta no tiene una contraseña configurada. Contacta al administrador.",
      "NO_PASSWORD",
      400
    );
  }

  const currentValid = await bcrypt.compare(currentPassword, user.password);
  if (!currentValid) {
    return apiError("Contraseña actual incorrecta", "INVALID_PASSWORD", 400);
  }

  if (currentPassword === newPassword) {
    return apiError("La nueva contraseña debe ser diferente a la actual", "SAME_PASSWORD", 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  logger.info("Password changed", { userId: ctx.userId });

  return apiSuccess({ success: true });
});
