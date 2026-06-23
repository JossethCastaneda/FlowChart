import { withAuth } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import { apiSuccess, apiNotFound } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateProfileSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(80).optional(),
});

// GET /api/user/profile — get the authenticated user's profile
export const GET = withAuth(async (_req, ctx) => {
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      password: true, // to determine if email login is enabled
      accounts: {
        select: { provider: true },
      },
    },
  });

  if (!user) return apiNotFound("Usuario no encontrado");

  const providers = user.accounts.map((a) => a.provider);
  if (user.password) providers.push("email");

  return apiSuccess({
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    },
    providers: Array.from(new Set(providers)),
  });
});

// PATCH /api/user/profile — update the authenticated user's profile
export const PATCH = withAuth(async (req, ctx) => {
  const validated = await validateBody(req, UpdateProfileSchema);
  if (!validated.ok) return validated.response;
  const { name } = validated.data;

  const updated = await prisma.user.update({
    where: { id: ctx.userId },
    data: {
      ...(name !== undefined && { name }),
    },
    select: { id: true, name: true, email: true, image: true },
  });

  logger.info("User profile updated", { userId: ctx.userId });

  return apiSuccess(updated);
});
