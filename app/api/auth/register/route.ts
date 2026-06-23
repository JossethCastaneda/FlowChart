import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { rateLimit, getClientIP } from "@/lib/ratelimit";
import { validateBody } from "@/lib/validate";
import { logger } from "@/lib/logger";
import { sendWelcomeEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/get-base-url";

const RegisterSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  email: z.string().email("Email inválido").max(255).transform((e) => e.toLowerCase().trim()),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(128),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 attempts per 15 minutes per IP
    const ip = getClientIP(req);
    const { ok } = rateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
    if (!ok) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta en 15 minutos." },
        { status: 429 }
      );
    }

    // Validate input
    const result = await validateBody(req, RegisterSchema);
    if (!result.ok) return result.response;
    const { name, email, password } = result.data;

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      // Account already exists (with or without password).
      // We NEVER allow setting a password on an existing account via /register
      // without email verification — doing so would allow an attacker to
      // pre-takeover OAuth/invite accounts by knowing only the email address.
      // Both branches return 409 with the same message to avoid enumeration.
      return NextResponse.json(
        {
          error:
            "Este email ya está registrado. Si accediste con Google o Facebook, " +
            "inicia sesión con ese método o usa '¿Olvidaste tu contraseña?' para establecer una contraseña.",
        },
        { status: 409 }
      );
    } else {
      // New user
      const hashedPassword = await bcrypt.hash(password, 12);
      await prisma.user.create({
        data: { name, email, password: hashedPassword },
      });

      // Send welcome email (fire-and-forget so it doesn't block response)
      sendWelcomeEmail({
        to: email,
        userName: name,
        dashboardUrl: `${getBaseUrl()}/login`,
      }).catch((err) => logger.error("[REGISTER] Failed to send welcome email", err));
    }

    logger.info("[REGISTER] New user created:", email);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: unknown) {
    logger.error("[REGISTER] Error:", err);
    return NextResponse.json(
      { error: "Error al registrar. Intente de nuevo." },
      { status: 500 }
    );
  }
}
