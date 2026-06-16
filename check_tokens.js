const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

function decryptToken(encryptedData) {
  if (!encryptedData || typeof encryptedData !== "string") return null;
  const ENC_KEY = process.env.ENCRYPTION_KEY || "sodare-encryption-key-0000000000";
  try {
    const key = crypto.createHash("sha256").update(ENC_KEY).digest("base64").substring(0, 32);
    const textParts = encryptedData.split(":");
    const iv = Buffer.from(textParts.shift(), "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    if (!encryptedData.includes(":")) return encryptedData;
    throw err;
  }
}

async function main() {
  const integrations = await prisma.integration.findMany({
    where: { provider: { startsWith: 'meta' } },
  });
  
  for (const intg of integrations) {
    const creds = intg.credentials;
    const token = decryptToken(creds.accessToken);
    if (!token) continue;
    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/me/permissions?access_token=${token}`);
      const data = await res.json();
      const granted = data.data?.filter(p => p.status === 'granted').map(p => p.permission) || [];
      console.log(`[${intg.provider}] ${intg.workspaceId}: ${granted.join(', ')}`);
    } catch(e) {
      console.log(`[${intg.provider}] Error checking permissions:`, e.message);
    }
  }
}
main().finally(() => prisma.$disconnect());
