import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.production' });

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "";

export function decryptToken(encryptedText: string): string {
  const parts = encryptedText.split(":");
  const [, ivHex, authTagHex, encryptedHex] = parts;
  const key = Buffer.from(ENCRYPTION_KEY, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

async function main() {
  const connectionString = "postgresql://neondb_owner:npg_eczPU6T0lHOB@ep-long-unit-ape6kzxh-pooler.c-7.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const integ = await prisma.integration.findFirst({ 
    where: { provider: 'botmaker' } 
  });
  if (!integ) {
    console.log('No integration found');
    return;
  }
  
  const creds = integ.credentials as any;
  console.log('Encrypted Token:', creds.accessToken.substring(0, 30));
  try {
    const dec = decryptToken(creds.accessToken);
    console.log('Decrypted successfully!', dec.substring(0, 10));
  } catch (e: any) {
    console.error('Decryption failed!', e.message);
  }
}
main().catch(console.error).finally(() => process.exit(0));
