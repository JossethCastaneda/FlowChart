/**
 * lib/crm/contacts.ts — Contacto unificado (omnicanal).
 *
 * Convierte el inbox en un CRM: cada identidad de canal (PSID de Messenger, IG-scoped
 * id, teléfono de WhatsApp…) se resuelve a UN Contact por workspace vía ContactChannel.
 * Así una misma persona que escribe por varios canales queda unificada en un solo
 * registro con tags, etapa de ciclo de vida, propietario y notas a nivel persona.
 *
 * Todo es best-effort: si el CRM falla, el inbox sigue funcionando sin bloquear la
 * persistencia del mensaje.
 */

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface ResolveContactInput {
  workspaceId: string;
  /** Canal por el que llegó: facebook_messenger | instagram_dm | whatsapp | *_comment */
  platform: string;
  /** Identidad en ese canal: PSID / IG-scoped id / teléfono (sin prefijo wa_). */
  externalId: string;
  name?: string | null;
  avatar?: string | null;
  phone?: string | null;
  customFields?: Record<string, any>;
}

/**
 * Resuelve (o crea) el Contact unificado para una identidad de canal y devuelve su id.
 * Idempotente por (workspaceId, platform, externalId) gracias al @@unique de ContactChannel.
 * Devuelve null si no se pudo resolver (el caller trata el CRM como opcional).
 */
export async function resolveOrCreateContact(input: ResolveContactInput): Promise<string | null> {
  const { workspaceId, platform, externalId } = input;
  if (!workspaceId || !externalId) return null;

  try {
    const existing = await prisma.contactChannel.findUnique({
      where: { workspaceId_platform_externalId: { workspaceId, platform, externalId } },
      select: { contactId: true },
    });
    if (existing) {
      await enrich(existing.contactId, input);
      return existing.contactId;
    }

    // Crear Contact + su primera identidad de canal en una sola operación.
    const contact = await prisma.contact.create({
      data: {
        workspaceId,
        name: input.name ?? null,
        avatar: input.avatar ?? null,
        phone: input.phone ?? (platform === "whatsapp" ? externalId : null),
        lastContactedAt: new Date(),
        customFields: input.customFields ? input.customFields : undefined,
        channels: {
          create: { workspaceId, platform, externalId, handle: input.name ?? null },
        },
      },
      select: { id: true },
    });
    return contact.id;
  } catch (err) {
    // Carrera: otra entrega concurrente creó el ContactChannel → re-leer.
    try {
      const again = await prisma.contactChannel.findUnique({
        where: { workspaceId_platform_externalId: { workspaceId, platform, externalId } },
        select: { contactId: true },
      });
      if (again) {
        await enrich(again.contactId, input);
        return again.contactId;
      }
    } catch {
      /* ignore */
    }
    logger.warn("[CRM] resolveOrCreateContact failed", {
      workspaceId,
      platform,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Enriquece datos del contacto SIN pisar ediciones manuales: siempre actualiza
 * lastContactedAt, y solo rellena name/avatar/phone si están vacíos.
 */
async function enrich(contactId: string, input: ResolveContactInput): Promise<void> {
  try {
    const updateData: any = { lastContactedAt: new Date() };

    // Si nos envían customFields desde el webhook (ej. timezone, locale, gender)
    if (input.customFields && Object.keys(input.customFields).length > 0) {
      // Necesitamos hacer merge con lo existente para no pisar otros campos custom
      const current = await prisma.contact.findUnique({ where: { id: contactId }, select: { customFields: true } });
      const mergedFields = {
        ...(typeof current?.customFields === "object" && current?.customFields !== null ? current.customFields : {}),
        ...input.customFields
      };
      updateData.customFields = mergedFields;
    }
    
    await prisma.contact.update({ where: { id: contactId }, data: updateData });

    if (input.name) {
      await prisma.contact.updateMany({ where: { id: contactId, name: null }, data: { name: input.name } });
    }
    if (input.avatar) {
      await prisma.contact.updateMany({ where: { id: contactId, avatar: null }, data: { avatar: input.avatar } });
    }
    if (input.phone) {
      await prisma.contact.updateMany({ where: { id: contactId, phone: null }, data: { phone: input.phone } });
    }
  } catch {
    /* enriquecimiento best-effort */
  }
}
