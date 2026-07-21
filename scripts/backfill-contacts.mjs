/**
 * scripts/backfill-contacts.mjs
 *
 * Backfill del CRM: crea un Contact + ContactChannel para cada InboxConversation
 * existente que aún no esté vinculada, y enlaza la conversación. Idempotente:
 * puede correrse varias veces sin duplicar (ContactChannel tiene @@unique).
 *
 * Uso:  node scripts/backfill-contacts.mjs
 *
 * El CRM se auto-puebla con cada mensaje entrante nuevo; este script es solo para
 * traer el histórico de golpe. Best-effort por conversación: un fallo no aborta el resto.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.STORAGE_POSTGRES_PRISMA_URL ||
  process.env.STORAGE_DATABASE_URL;

if (!connectionString) {
  console.error("[backfill-contacts] Falta DATABASE_URL");
  process.exit(1);
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

/** Deriva la identidad de canal (platform, externalId) de una conversación. */
function channelIdentity(conv) {
  if (conv.platform === "whatsapp") {
    return { platform: "whatsapp", externalId: conv.externalId.replace(/^wa_/, "") };
  }
  // Para comentarios el externalId de la conversación es el post; el contacto real
  // no siempre es recuperable retroactivamente, así que se omiten (se poblarán al
  // llegar su próximo mensaje). DMs: externalId = PSID/IG id del contacto.
  if (conv.platform === "facebook_messenger" || conv.platform === "instagram_dm") {
    return { platform: conv.platform, externalId: conv.externalId };
  }
  return null;
}

async function main() {
  const convs = await prisma.inboxConversation.findMany({
    where: { contactId: null },
    select: { id: true, workspaceId: true, platform: true, externalId: true, contactName: true, contactAvatar: true },
  });
  console.log(`[backfill-contacts] ${convs.length} conversaciones sin contacto`);

  let linked = 0;
  let skipped = 0;

  for (const conv of convs) {
    const identity = channelIdentity(conv);
    if (!identity) {
      skipped++;
      continue;
    }
    try {
      const existing = await prisma.contactChannel.findUnique({
        where: {
          workspaceId_platform_externalId: {
            workspaceId: conv.workspaceId,
            platform: identity.platform,
            externalId: identity.externalId,
          },
        },
        select: { contactId: true },
      });

      let contactId;
      if (existing) {
        contactId = existing.contactId;
      } else {
        const contact = await prisma.contact.create({
          data: {
            workspaceId: conv.workspaceId,
            name: conv.contactName ?? null,
            avatar: conv.contactAvatar ?? null,
            phone: identity.platform === "whatsapp" ? identity.externalId : null,
            channels: {
              create: {
                workspaceId: conv.workspaceId,
                platform: identity.platform,
                externalId: identity.externalId,
                handle: conv.contactName ?? null,
              },
            },
          },
          select: { id: true },
        });
        contactId = contact.id;
      }

      await prisma.inboxConversation.update({ where: { id: conv.id }, data: { contactId } });
      linked++;
    } catch (err) {
      skipped++;
      console.warn(`[backfill-contacts] conv ${conv.id} omitida:`, err?.message || err);
    }
  }

  console.log(`[backfill-contacts] listo — ${linked} vinculadas, ${skipped} omitidas`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error("[backfill-contacts] error fatal:", e);
  process.exit(1);
});
