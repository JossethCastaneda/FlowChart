import { sleep, FatalError } from "workflow";

/**
 * Workflow de ejemplo: onboarding de usuario
 * Patrón: función principal con "use workflow" + steps con "use step"
 *
 * Para dispararlo: POST /api/workflow/user-signup  { "email": "..." }
 */
export async function handleUserSignup(email: string) {
  "use workflow";

  const user = await createUser(email);
  await sendWelcomeEmail(user);

  // Pausa 5 segundos sin consumir recursos en el servidor
  await sleep("5s");

  await sendOnboardingEmail(user);

  console.log("Workflow is complete! Run 'npx workflow web' to inspect your run");

  return { userId: user.id, status: "onboarded" };
}

// ── Steps ──────────────────────────────────────────────────────────────────

async function createUser(email: string) {
  "use step";

  console.log(`Creating user with email: ${email}`);
  // Aquí iría la creación real en Prisma, etc.
  return { id: crypto.randomUUID(), email };
}

async function sendWelcomeEmail(user: { id: string; email: string }) {
  "use step";

  console.log(`Sending welcome email to user: ${user.id}`);
  // Aquí iría el envío real via Resend, etc.
}

async function sendOnboardingEmail(user: { id: string; email: string }) {
  "use step";

  if (!user.email.includes("@")) {
    // FatalError = no reintentar
    throw new FatalError("Invalid Email");
  }

  console.log(`Sending onboarding email to user: ${user.id}`);
}
