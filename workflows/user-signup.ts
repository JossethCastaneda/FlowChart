import { sleep } from "workflow";

export async function handleUserSignup(email: string) {
  "use workflow";

  const user = await createUser(email);
  await sendWelcomeEmail(user);

  await sleep("5s");

  await sendOnboardingEmail(user);
  return { userId: user.id, status: "onboarded" };
}

async function createUser(email: string) {
  "use step";
  console.log(`Creating user with email: ${email}`);
  return { id: crypto.randomUUID(), email };
}

async function sendWelcomeEmail(user: { id: string; email: string }) {
  "use step";
  console.log(`Sending welcome email to user: ${user.id}`);
}

async function sendOnboardingEmail(user: { id: string; email: string }) {
  "use step";
  console.log(`Sending onboarding email to user: ${user.id}`);
}
