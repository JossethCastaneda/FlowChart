import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { validateBody } from "@/lib/validate";
import { apiSuccess, apiUnauthorized, apiServerError, apiNotFound } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return apiUnauthorized();
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        password: true, // we need this to check if email login is enabled
        accounts: {
          select: {
            provider: true,
          }
        }
      }
    });

    if (!user) {
      return apiNotFound("Usuario no encontrado");
    }

    const providers = user.accounts.map(a => a.provider);
    if (user.password) {
      providers.push("email");
    }

    return apiSuccess({
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
      providers: Array.from(new Set(providers)),
    });
  } catch (error) {
    console.error("[GET /api/user/profile] Error:", error);
    return apiServerError(error);
  }
}

const UpdateProfileSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return apiUnauthorized();
  }

  const validated = await validateBody(req, UpdateProfileSchema);
  if (!validated.ok) return validated.response;

  const { name } = validated.data;

  try {
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined && { name }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      }
    });

    return apiSuccess(updated);
  } catch (error) {
    console.error("[PATCH /api/user/profile] Error:", error);
    return apiServerError(error);
  }
}
