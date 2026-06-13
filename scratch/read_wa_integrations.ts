import "dotenv/config";
import prisma from "../lib/prisma";
import crypto from "crypto";

// Clave de cifrado de la variable de entorno
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "2286a195eb12b19325f7b7c6e345a11b722ec96f87ed418d9762336be859e79a";

function decryptToken(encryptedText: string): string | null {
  try {
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encrypted = Buffer.from(textParts.shift()!, 'hex');
    const tag = Buffer.from(textParts.shift()!, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err: any) {
    console.error("Error al desencriptar token:", err.message);
    return null;
  }
}

async function run() {
  const integrations = await prisma.integration.findMany({
    where: { provider: 'whatsapp_business' }
  });
  console.log(`Encontradas ${integrations.length} integraciones de WhatsApp.`);
  for (const integration of integrations) {
    console.log("Workspace ID:", integration.workspaceId);
    console.log("Connected:", integration.connected);
    const credentials = integration.credentials as any;
    if (credentials) {
      console.log("WABA ID:", credentials.wabaId);
      console.log("Phone Number ID:", credentials.phoneNumberId);
      if (credentials.accessToken) {
        const dec = decryptToken(credentials.accessToken);
        console.log("Decrypted Token length:", dec ? dec.length : "failed");
        console.log("Token Preview:", dec ? dec.substring(0, 15) + "..." : "none");
        console.log("Full Token:", dec);
      }
    }
    console.log("------------------------");
  }
}

run()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
