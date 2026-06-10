import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { validateBody } from "@/lib/validate";
import { rateLimit, getClientIP } from "@/lib/ratelimit";

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Contraseña actual requerida"),
  newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres").max(128),
});

/**
 * POST /api/auth/change-password
 * Permite a un usuario autenticado cambiar su contraseña.
 * - Requiere la contraseña actual para confirmar identidad.
 * - Si el usuario es OAuth-only (sin password), rechaza con instrucciones.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Rate limit por IP
  const ip = getClientIP(req);
  const { ok } = rateLimit(`change-password:${ip}`, 5, 15 * 60 * 1000);
  if (!ok) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta en 15 minutos." },
      { status: 429 }
    );
  }

  const result = await validateBody(req, ChangePasswordSchema);
  if (!result.ok) return result.response;
  const { currentPassword, newPassword } = result.data;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (!user.password) {
      // Usuario solo OAuth (Facebook/Google) — no puede cambiar contraseña aquí
      // Debe usar "Olvidaste tu contraseña" si tiene email
      return NextResponse.json(
        {
          error: user.email
            ? "Tu cuenta fue creada con Facebook/Google. Usa '¿Olvidaste tu contraseña?' para establecer una contraseña."
            : "Tu cuenta no tiene una contraseña configurada. Contacta al administrador.",
        },
        { status: 400 }
      );
    }

    const currentValid = await bcrypt.compare(currentPassword, user.password);
    if (!currentValid) {
      return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 });
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "La nueva contraseña debe ser diferente a la actual" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    console.log("[CHANGE-PASSWORD] Password updated for user:", user.id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[CHANGE-PASSWORD] Error:", err);
    return NextResponse.json({ error: "Error al cambiar contraseña" }, { status: 500 });
  }
}
