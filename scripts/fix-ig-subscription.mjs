/**
 * scripts/fix-ig-subscription.ts
 * Script one-time para activar la suscripción de webhooks para la integración de
 * Instagram de cobertura_ideal que está conectada pero sin webhookSubscriptionResult.
 * 
 * Uso: npx tsx scripts/fix-ig-subscription.ts
 */
import { createDecipheriv } from "crypto";

// Prisma del proyecto (usa prisma.config.ts y las env vars del proyecto)
import prisma from "../lib/prisma";
import { env } from "../lib/env";

const META_API_VERSION = env.META_API_VERSION || "v25.0";

// Descifrar token
function decryptToken(encryptedValue) {
  if (!encryptedValue.startsWith("enc:")) return encryptedValue;
  const [, ivHex, authTagHex, ciphertextHex] = encryptedValue.split(":");
  if (!ivHex || !authTagHex || !ciphertextHex) throw new Error("Invalid token format");

  const encKey = env.ENCRYPTION_KEY;
  if (!encKey) throw new Error("ENCRYPTION_KEY not set");

  const key = Buffer.from(encKey, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext, undefined, "utf8") + decipher.final("utf8");
}

async function main() {
  console.log("📋 Buscando integraciones de Instagram conectadas...");

  const integrations = await prisma.integration.findMany({
    where: { provider: "instagram", connected: true },
    select: { id: true, workspaceId: true, credentials: true },
  });

  console.log(`Encontradas: ${integrations.length} integración(es)`);

  for (const integ of integrations) {
    const creds = integ.credentials;
    const instagramUserId = creds?.instagramUserId ? String(creds.instagramUserId) : null;
    const existingResult = creds?.webhookSubscriptionResult;

    console.log(`\n🔍 Integración: ${integ.id}`);
    console.log(`   workspace: ${integ.workspaceId}`);
    console.log(`   instagramUserId: ${instagramUserId}`);
    console.log(`   webhookSubscriptionResult: ${existingResult ?? "null (pendiente)"}`);

    if (!creds?.accessToken || typeof creds.accessToken !== "string") {
      console.log("   ❌ Sin accessToken, saltando...");
      continue;
    }

    let token;
    try {
      token = decryptToken(creds.accessToken);
      console.log(`   🔑 Token descifrado: ${token.slice(0, 20)}...`);
    } catch (err) {
      console.error(`   ❌ No se pudo descifrar el token:`, err.message);
      continue;
    }

    const subscribedFields = [
      "messages",
      "messaging_postbacks",
      "comments",
      "mentions",
      "story_insights",
      "message_reactions",
      "messaging_seen",
      "messaging_referral",
      "message_edit",
    ].join(",");

    const endpointsToTry = [
      `https://graph.instagram.com/me/subscribed_apps`,
      instagramUserId ? `https://graph.instagram.com/${instagramUserId}/subscribed_apps` : null,
      `https://graph.facebook.com/${META_API_VERSION}/me/subscribed_apps`,
      `https://graph.facebook.com/me/subscribed_apps`,
    ].filter(Boolean);

    let success = false;
    let successEndpoint = null;
    let lastError = null;

    for (const endpoint of endpointsToTry) {
      console.log(`   📡 Intentando: ${endpoint}`);
      try {
        const body = new URLSearchParams({ access_token: token, subscribed_fields: subscribedFields });
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });
        const data = await res.json();
        console.log(`   📥 Respuesta (${res.status}):`, JSON.stringify(data));

        if (res.ok && data.success) {
          success = true;
          successEndpoint = endpoint;
          console.log(`   ✅ ¡Suscripción activada via ${endpoint}!`);
          break;
        } else {
          lastError = JSON.stringify(data?.error ?? data).slice(0, 300);
        }
      } catch (err) {
        lastError = String(err).slice(0, 300);
        console.log(`   ⚠️ Error:`, lastError);
      }
    }

    // Actualizar DB
    try {
      await prisma.integration.update({
        where: { id: integ.id },
        data: {
          credentials: {
            ...creds,
            webhookSubscribedAt: success ? new Date().toISOString() : (creds.webhookSubscribedAt ?? null),
            webhookSubscriptionResult: success ? "success" : "failed",
            webhookSubscribedVia: success ? successEndpoint : null,
            webhookSubscribedFields: success ? subscribedFields : null,
            webhookLastError: success ? null : lastError,
            webhookLastAttempt: new Date().toISOString(),
          },
        },
      });
      console.log(`   💾 DB actualizada: ${success ? "✅ success" : "❌ failed"}`);
    } catch (dbErr) {
      console.error(`   ❌ Error actualizando DB:`, dbErr.message);
    }
  }

  await prisma.$disconnect();
  console.log("\n✅ Script completado.");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
