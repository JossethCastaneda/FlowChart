/**
 * scripts/connect-whatsapp.ts
 *
 * Script de un solo uso para conectar WhatsApp Business al workspace de Sodare.
 * Cifra el access token con AES-256-GCM y lo guarda en Integration + WaPhoneSource.
 *
 * Uso:
 *   npx tsx scripts/connect-whatsapp.ts
 *
 * Requiere que DATABASE_URL y ENCRYPTION_KEY estén configuradas en .env.local
 */

import { config } from "dotenv";
config({ path: ".env" });        // contiene ENCRYPTION_KEY
config({ path: ".env.local" }); // contiene DATABASE_URL (prevalece sobre .env)

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import crypto from "crypto";


// ── Datos de tu cuenta WhatsApp Business ─────────────────────────────────────
const ACCESS_TOKEN    = "EAAQRZC1Kf58cBRq1WQdBHSpT5TvPecusV5gcfWODGVdWQQxwpZBSMAzm7WY0gxq1K8BO3d0qqcAvdWPruwysPDpikdUWTQN4nSVYtUP4h4K7jEZAOYmcZBhBazf7JRTh5fEWaqBPCDBd0UdilcO8u8EYy1ZCUOYKUMCW5oyv6ikGVgmJ3Vt85tZAbfl6KIZB6JqBHOZARBVQm31XCcVZBOwiQOs4HU9zfX2CjZAC9aNwlLBQDiA3ny11lpIL63ocVW8MjajJwZBYxznhu2sZArbLFgVliuLe";
const PHONE_NUMBER_ID = "609571658896478";   // +52 55 4170 2793 — Sodare, GREEN, CONNECTED
const WABA_ID         = "486248781247636";   // SODARE WABA
// ─────────────────────────────────────────────────────────────────────────────

function createPrismaClient(): PrismaClient {
  let connectionString = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL no configurada");
  connectionString = connectionString.replace("sslmode=require", "sslmode=verify-full");
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

function encryptToken(text: string): string {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? "";
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    throw new Error("ENCRYPTION_KEY no configurada o inválida (debe ser 64 caracteres hex)");
  }
  const key = Buffer.from(ENCRYPTION_KEY, "hex");
  const iv  = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `enc:${iv.toString("hex")}:${authTag}:${encrypted}`;
}

async function main() {
  console.log("🔍 Buscando workspace de Sodare...");

  // Buscar el primer workspace OWNER
  const workspace = await prisma.workspace.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, slug: true },
  });

  if (!workspace) {
    throw new Error("No se encontró ningún workspace en la base de datos");
  }

  console.log(`✅ Workspace encontrado: "${workspace.name}" (${workspace.slug}) → ${workspace.id}`);

  const encryptedToken = encryptToken(ACCESS_TOKEN);
  console.log("🔐 Access token cifrado con AES-256-GCM");

  // Upsert de Integration
  const integration = await prisma.integration.upsert({
    where: {
      workspaceId_provider_userId: {
        workspaceId: workspace.id,
        provider: "whatsapp_business",
        userId: "workspace",
      },
    },
    update: {
      credentials: {
        accessToken: encryptedToken,
        phoneNumberId: PHONE_NUMBER_ID,
        wabaId: WABA_ID,
      },
      connected: true,
      connectedAt: new Date(),
    },
    create: {
      workspaceId: workspace.id,
      provider: "whatsapp_business",
      userId: "workspace",
      credentials: {
        accessToken: encryptedToken,
        phoneNumberId: PHONE_NUMBER_ID,
        wabaId: WABA_ID,
      },
      connected: true,
      connectedAt: new Date(),
    },
  });

  console.log(`✅ Integration creada/actualizada: ${integration.id}`);

  // Upsert de WaPhoneSource
  const phoneSource = await prisma.waPhoneSource.upsert({
    where: { phoneNumberId: PHONE_NUMBER_ID },
    update: { workspaceId: workspace.id },
    create: {
      phoneNumberId: PHONE_NUMBER_ID,
      workspaceId: workspace.id,
    },
  });

  console.log(`✅ WaPhoneSource registrado: ${phoneSource.id}`);

  console.log("\n🎉 WhatsApp Business conectado exitosamente!");
  console.log("   Número     : +52 55 4170 2793");
  console.log(`   Phone ID   : ${PHONE_NUMBER_ID}`);
  console.log(`   WABA ID    : ${WABA_ID}`);
  console.log(`   Workspace  : ${workspace.name}`);
  console.log("\n⚠️  IMPORTANTE: Rota el access token en Meta Business Manager.");
  console.log("   El token fue guardado cifrado, pero estuvo expuesto en el chat.");
}

main()
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
