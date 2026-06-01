import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
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

    // Buscar token válido
    const verification = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Token inválido o expirado" },
        { status: 400 }
      );
    }

    if (verification.expires < new Date()) {
      // Limpiar token expirado
      await prisma.verificationToken.delete({ where: { token } });
      return NextResponse.json(
        { error: "El enlace ha expirado. Solicita uno nuevo." },
        { status: 410 }
      );
    }

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email: verification.identifier },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Actualizar password
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Eliminar token usado
    await prisma.verificationToken.delete({ where: { token } });

    console.log("[RESET-PASSWORD] Password updated for:", user.email);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[RESET-PASSWORD] Error:", err);
    return NextResponse.json(
      { error: "Error al restablecer contraseña" },
      { status: 500 }
    );
  }
}
