import fs from "fs";
import pg from "pg";
import crypto from "crypto";
import dotenv from "dotenv";

// 1. Read .env.local
const envContent = fs.readFileSync(".env.local", "utf-8");
const env = dotenv.parse(envContent);

// 2. Decrypt function (like lib/encryption.ts)
function decryptToken(encrypted: string) {
  if (!encrypted.startsWith("enc:")) return encrypted;
  const parts = encrypted.split(":");
  const ivHex = parts[1];
  const authTagHex = parts[2];
  const encryptedHex = parts[3];
  
  const key = Buffer.from(env.ENCRYPTION_KEY, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(ivHex, "hex"), key);
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// 3. Connect DB
async function run() {
  const dbUrl = env.STORAGE_POSTGRES_URL_NON_POOLING;
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const res = await client.query('SELECT credentials FROM "Integration" WHERE provider = $1', ['botmaker']);
  const creds = res.rows[0].credentials;
  const token = decryptToken(creds.accessToken);
  const baseUrl = creds.baseUrl || "https://api.botmaker.com/v2.0";

  console.log("Got Botmaker token!");

  // 4. Test fetch directly!
  const from = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  
  const qs = new URLSearchParams({
    from,
    to,
    "include-messages": "false",
    "include-events": "false",
    "long-term-search": "true",
  });
  const qsStr = qs.toString().replace(/%3A/g, ":");

  let nextUrl = `${baseUrl}/sessions?${qsStr}`;
  let pages = 0;
  
  while (nextUrl && pages < 3) {
    console.log(`\n--- Fetching Page ${pages + 1} ---`);
    console.log(`URL: ${nextUrl}`);
    
    const start = Date.now();
    const fetchRes = await fetch(nextUrl, {
      headers: {
        "access-token": token,
        "Accept": "application/json"
      }
    });
    
    console.log(`Status: ${fetchRes.status} in ${Date.now() - start}ms`);
    
    if (!fetchRes.ok) {
      console.log(`Error body:`, await fetchRes.text());
      break;
    }
    
    const data = await fetchRes.json();
    console.log(`Items returned: ${data.items?.length || 0}`);
    console.log(`NextPage returned: ${data.nextPage}`);
    
    if (data.nextPage === nextUrl) {
      console.log(`INFINITE LOOP: nextPage is identical to current URL!`);
      break;
    }
    
    nextUrl = data.nextPage || null;
    pages++;
    
    if (nextUrl) {
      // Do not replace %3A here, let's see if Botmaker's nextPage works directly!
      await new Promise(r => setTimeout(r, 200));
    }
  }

  await client.end();
}

run().catch(console.error);
