import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { rateLimit, getClientIP } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 attempts per 15 minutes per IP
    const ip = getClientIP(req);
    const { ok } = rateLimit(`reset:${ip}`, 5, 15 * 60 * 1000);
    if (!ok) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta en 15 minutos." },
        { status: 429 }
      );
    }

    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token y contraseña requeridos" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }

    // Wrap in transaction to prevent race conditions (two requests using same token)
    const result = await prisma.$transaction(async (tx) => {
      const verification = await tx.verificationToken.findUnique({
        where: { token },
      });

      if (!verification) {
        return { error: "Token inválido o expirado", status: 400 };
      }

      if (verification.expires < new Date()) {
        await tx.verificationToken.delete({ where: { token } });
        return { error: "El enlace ha expirado. Solicita uno nuevo.", status: 410 };
      }

      const user = await tx.user.findUnique({
        where: { email: verification.identifier },
      });

      if (!user) {
        return { error: "Usuario no encontrado", status: 404 };
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      await tx.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      await tx.verificationToken.delete({ where: { token } });

      console.log("[RESET-PASSWORD] Password updated for:", user.email);
      return { success: true };
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[RESET-PASSWORD] Error:", err);
    return NextResponse.json(
      { error: "Error al restablecer contraseña" },
      { status: 500 }
    );
  }
}
