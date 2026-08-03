/**
 * app/api/whatsapp/phone-numbers/route.ts
 *
 * GET — Obtiene todas las líneas de WhatsApp de la WABA del workspace,
 *       cruzadas con la base de datos para saber si están enlazadas y a qué proyectos.
 *
 * POST — Enlaza una línea de WhatsApp (WaPhoneSource) a FlowChart, opcionalmente
 *        asociándola a un proyecto.
 *
 * DELETE — Desvincula una línea de WhatsApp de FlowChart (borra WaPhoneSource).
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import { getWaCredentials } from "@/lib/whatsapp";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { env } from "@/lib/env";

const GRAPH_BASE = `https://graph.facebook.com/${env.META_API_VERSION}`;

export const GET = withWorkspace(async (_req, ctx) => {
  const { workspaceId } = ctx;

  const creds = await getWaCredentials(workspaceId);
  if (!creds) {
    return apiSuccess({
      connected: false,
      phoneNumbers: [],
      projects: [],
    });
  }

  try {
    // 1. Obtener números de teléfono de Meta
    const url = new URL(`${GRAPH_BASE}/${creds.wabaId}/phone_numbers`);
    url.searchParams.set("fields", "id,display_phone_number,verified_name,quality_rating,status,code_verification_status");
    url.searchParams.set("limit", "100");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${creds.accessToken}` },
      signal: AbortSignal.timeout(8000),
    });

    const data = await res.json();
    if (!res.ok) {
      logger.error("Error consultando phone_numbers en Meta", { workspaceId, error: data });
      return apiError(
        data?.error?.message ?? "Error de Meta al obtener líneas de WhatsApp.",
        "META_API_ERROR",
        res.status
      );
    }

    const metaNumbers = (data.data || []) as Array<{
      id: string;
      display_phone_number?: string;
      verified_name?: string;
      quality_rating?: string;
      status?: string;
      code_verification_status?: string;
    }>;

    // 2. Obtener enlazados en DB local para este workspace
    const linkedSources = await prisma.waPhoneSource.findMany({
      where: { workspaceId },
    });

    // 3. Obtener proyectos del workspace
    const projects = await prisma.project.findMany({
      where: { workspaceId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    // 4. Cruzar información
    const phoneNumbers = metaNumbers.map((num) => {
      const dbMatch = linkedSources.find((s) => s.phoneNumberId === num.id);
      return {
        id: num.id,
        displayPhoneNumber: num.display_phone_number ?? "",
        verifiedName: num.verified_name ?? "",
        qualityRating: num.quality_rating ?? "UNKNOWN",
        status: num.status ?? "UNKNOWN",
        codeVerificationStatus: num.code_verification_status ?? "UNKNOWN",
        isLinked: !!dbMatch,
        projectId: dbMatch?.projectId ?? null,
      };
    });

    return apiSuccess({
      connected: true,
      phoneNumbers,
      projects,
    });
  } catch (err) {
    logger.error("Error al obtener líneas de WhatsApp", { workspaceId, error: err });
    return apiError("Error al obtener líneas de WhatsApp", "NETWORK_ERROR", 502);
  }
});

const linkSchema = z.object({
  phoneNumberId: z.string().min(5),
  projectId: z.string().nullable().optional(),
});

export const POST = withWorkspace(async (req: NextRequest, ctx) => {
  const validation = await validateBody(req, linkSchema);
  if (!validation.ok) return validation.response;

  const { workspaceId } = ctx;
  const { phoneNumberId, projectId } = validation.data;

  const creds = await getWaCredentials(workspaceId);
  if (!creds) {
    return apiError("WhatsApp Business no está conectado.", "WA_NOT_CONNECTED", 400);
  }

  try {
    // Seguridad: verificar que el phoneNumberId pertenece a la WABA del workspace
    const metaCheckRes = await fetch(
      `${GRAPH_BASE}/${creds.wabaId}/phone_numbers?fields=id&limit=100`,
      {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
        signal: AbortSignal.timeout(8000),
      }
    );
    const metaCheckData = await metaCheckRes.json();
    if (!metaCheckRes.ok) {
      logger.error("Error de verificación de pertenencia del número", { workspaceId, error: metaCheckData });
      return apiError("No se pudo verificar la pertenencia del número.", "META_CHECK_FAILED", 502);
    }

    const belongs = (metaCheckData.data || []).some((n: { id: string }) => n.id === phoneNumberId);
    if (!belongs) {
      return apiError(
        "El número de teléfono especificado no pertenece a la cuenta de WhatsApp conectada.",
        "FORBIDDEN_PHONE",
        403
      );
    }

    // Validar que el projectId (si viene) pertenece a este workspace, no a otro.
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, workspaceId },
        select: { id: true },
      });
      if (!project) {
        return apiError("El proyecto indicado no pertenece a este workspace.", "INVALID_PROJECT", 400);
      }
    }

    // SEGURIDAD: si la misma WABA está conectada en dos workspaces, ambos pasan la
    // verificación de pertenencia; el upsert (keyed por phoneNumberId) re-homeaba la
    // línea al último que enlazara. Rechazar si ya pertenece a otro workspace.
    const existingPhone = await prisma.waPhoneSource.findUnique({
      where: { phoneNumberId },
      select: { workspaceId: true },
    });
    if (existingPhone && existingPhone.workspaceId !== workspaceId) {
      return apiError("Esta línea ya está enlazada a otra cuenta de FlowChart.", "WA_PHONE_ALREADY_LINKED", 409);
    }

    // Upsert WaPhoneSource
    const source = await prisma.waPhoneSource.upsert({
      where: { phoneNumberId },
      update: { workspaceId, projectId: projectId ?? null },
      create: { phoneNumberId, workspaceId, projectId: projectId ?? null },
    });

    logger.info("Línea de WhatsApp enlazada/actualizada", { workspaceId, phoneNumberId, projectId });
    return apiSuccess({ success: true, source });
  } catch (err) {
    logger.error("Error enlazando línea de WhatsApp", { workspaceId, error: err });
    return apiError("Error al enlazar la línea de WhatsApp.", "DB_ERROR", 500);
  }
});

const unlinkSchema = z.object({
  phoneNumberId: z.string().min(5),
});

export const DELETE = withWorkspace(async (req: NextRequest, ctx) => {
  // Nota: Soporta body JSON
  const validation = await validateBody(req, unlinkSchema);
  if (!validation.ok) return validation.response;

  const { workspaceId } = ctx;
  const { phoneNumberId } = validation.data;

  try {
    const existing = await prisma.waPhoneSource.findUnique({
      where: { phoneNumberId },
    });

    if (!existing || existing.workspaceId !== workspaceId) {
      return apiError("El número no está enlazado a este workspace.", "NOT_FOUND", 404);
    }

    await prisma.waPhoneSource.delete({
      where: { phoneNumberId },
    });

    logger.info("Línea de WhatsApp desvinculada", { workspaceId, phoneNumberId });
    return apiSuccess({ success: true });
  } catch (err) {
    logger.error("Error desvinculando línea de WhatsApp", { workspaceId, error: err });
    return apiError("Error al desvincular la línea de WhatsApp.", "DB_ERROR", 500);
  }
});
