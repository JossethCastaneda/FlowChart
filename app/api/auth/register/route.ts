import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    // Validaciones
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }
    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: "El nombre debe tener al menos 2 caracteres" },
        { status: 400 }
      );
    }

    // Verificar si ya existe
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    const hashedPassword = await bcrypt.hash(password, 12);

    if (existing) {
      if (existing.password) {
        // Ya tiene password → no permitir re-registro
        return NextResponse.json(
          { error: "Este email ya está registrado" },
          { status: 409 }
        );
      }
      // Existe pero sin password (OAuth o bug de invite) → setear password
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          password: hashedPassword,
          name: name.trim(),
        },
      });
    } else {
      // Usuario nuevo → crear
      await prisma.user.create({
        data: {
          name: name.trim(),
          email: email.toLowerCase(),
          password: hashedPassword,
        },
      });
    }

    console.log("[REGISTER] New user created:", email.toLowerCase());

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: any) {
    console.error("[REGISTER] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Error al registrar" },
      { status: 500 }
    );
  }
}
