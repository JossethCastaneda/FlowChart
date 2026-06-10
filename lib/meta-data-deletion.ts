import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Acciones de cumplimiento para los callbacks de Meta.
 *
 * - Deauthorize (el usuario quita la app en Facebook): los tokens que ese
 *   usuario autorizó dejan de ser válidos → desconectar y BORRAR credenciales.
 * - Data Deletion Request: además de lo anterior, eliminar el vínculo de la
 *   cuenta de Facebook con el usuario (tabla Account de NextAuth).
 *
 * Docs: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */

/** Resuelve el userId interno a partir del user_id de Facebook del signed_request. */
async function findUserByMetaId(metaUserId: string): Promise<string | null> {
  const account = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: "facebook",
        providerAccountId: metaUserId,
      },
    },
    select: { userId: true },
  });
  return account?.userId ?? null;
}

/**
 * Desconecta todas las integraciones Meta autorizadas por el usuario y borra
 * sus credenciales (tokens) de la base de datos.
 * Devuelve cuántas integraciones se limpiaron.
 */
export async function disconnectMetaForUser(metaUserId: string): Promise<number> {
  const userId = await findUserByMetaId(metaUserId);
  if (!userId) {
    logger.warn("Meta deauthorize/deletion: no local user for meta id", { metaUserId });
    return 0;
  }

  const result = await prisma.integration.updateMany({
    where: {
      connectedBy: userId,
      provider: { startsWith: "meta" },
    },
    data: {
      connected: false,
      // Borrar los tokens, no solo marcar desconectado.
      credentials: {},
      connectedAt: null,
    },
  });

  logger.info("Meta integrations disconnected after deauthorize", {
    metaUserId,
    integrationsCleared: result.count,
  });
  return result.count;
}

/**
 * Borrado completo de los datos derivados de Facebook para un usuario:
 * tokens de integraciones Meta + vínculo OAuth (Account) con Facebook.
 * El usuario y su contenido propio (proyectos, tareas) no se tocan: ese
 * contenido no proviene de Meta.
 */
export async function deleteMetaDataForUser(metaUserId: string): Promise<{
  integrationsCleared: number;
  accountUnlinked: boolean;
}> {
  const integrationsCleared = await disconnectMetaForUser(metaUserId);

  const deleted = await prisma.account.deleteMany({
    where: { provider: "facebook", providerAccountId: metaUserId },
  });

  logger.info("Meta data deletion processed", {
    metaUserId,
    integrationsCleared,
    accountUnlinked: deleted.count > 0,
  });

  return { integrationsCleared, accountUnlinked: deleted.count > 0 };
}
