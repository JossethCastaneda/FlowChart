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
    if (existing) {
      return NextResponse.json(
        { error: "Este email ya está registrado" },
        { status: 409 }
      );
    }

    // Hashear password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Crear usuario
    await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase(),
        password: hashedPassword,
      },
    });

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
