import { start } from "workflow/api";
import { handleUserSignup } from "@/workflows/user-signup";
import { NextResponse } from "next/server";

/**
 * POST /api/workflow/user-signup
 * Dispara el workflow de onboarding de usuario de forma asíncrona.
 * No bloquea el request — el workflow corre en background con reintentos automáticos.
 *
 * Body: { "email": "usuario@ejemplo.com" }
 */
export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  // Inicia el workflow de forma asíncrona — no bloquea la respuesta
  await start(handleUserSignup, [email]);

  return NextResponse.json({ message: "Workflow de onboarding iniciado", email });
}
