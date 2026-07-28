/**
 * Script temporal de diagnóstico de Instagram webhook
 * Ejecutar con: node --require dotenv/config scripts/diag-ig-webhook.mjs
 */

// Cargar variables de entorno
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "crypto";
import { readFileSync } from "fs";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const META_API_VERSION = process.env.META_API_VERSION || "v25.0";
const META_WEBHOOK_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;
const INSTAGRAM_APIKEY_CONNECT = process.env.INSTAGRAM_APIKEY_CONNECT;
const INSTAGRAM_SECRET_CONNECT = process.env.INSTAGRAM_SECRET_CONNECT;
const META_APP_SECRET = process.env.META_APP_SECRET;

console.log("=== Diagnóstico Instagram Webhook ===\n");

// 1. Verificar variables de entorno
console.log("1. Variables de entorno:");
console.log("   INSTAGRAM_APIKEY_CONNECT:", INSTAGRAM_APIKEY_CONNECT ? `✅ ${INSTAGRAM_APIKEY_CONNECT}` : "❌ NO configurado");
console.log("   INSTAGRAM_SECRET_CONNECT:", INSTAGRAM_SECRET_CONNECT ? "✅ configurado" : "❌ NO configurado");
console.log("   META_APP_SECRET:", META_APP_SECRET ? "✅ configurado" : "❌ NO configurado");
console.log("   META_WEBHOOK_VERIFY_TOKEN:", META_WEBHOOK_VERIFY_TOKEN ? `✅ "${META_WEBHOOK_VERIFY_TOKEN}"` : "❌ NO configurado — ESTE ES EL PROBLEMA");
console.log("   ENCRYPTION_KEY:", ENCRYPTION_KEY ? "✅ configurado (64 chars: " + ENCRYPTION_KEY.length + ")" : "❌ NO configurado");

if (!ENCRYPTION_KEY || !INSTAGRAM_SECRET_CONNECT) {
  console.log("\n⚠️ Faltan variables críticas — abortando diagnóstico de token.");
  process.exit(1);
}

// 2. Descifrar el token del integration (obtenido de DB)
const encryptedToken = "enc:602c62eaa3eaa9244c6d4202:1c0baf23387c2cd25a39447bee269e03:aef53ac1c007995571d0fb7848f0dc9239e96bfe99ffc912b9beccd5a0730e0d009006e816033b84e027d9cf4a0370781b6037b9814d46fb0130e6c10f0cfd21a2cebc7e99a9120f54d11dfed116a3762e6d058a9e6af6c4adb56c2e1e9cde8c77a14aac256d9d7d79cd299546c53d671d4a990714d036610e8c106747d3b7736c5bd20f337b931cfdd8d4e1cb162849073c34f11425d324e915e164691ee9";

function decryptToken(encrypted) {
  if (!encrypted || !encrypted.startsWith("enc:")) return encrypted;
  try {
    const parts = encrypted.split(":");
    if (parts.length < 4) return null;
    const [, ivHex, authTagHex, cipherHex] = parts;
    const keyBuffer = Buffer.from(ENCRYPTION_KEY, "hex");
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const ciphertext = Buffer.from(cipherHex, "hex");
    const decipher = createDecipheriv("aes-256-gcm", keyBuffer, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (err) {
    console.error("   Error descifrando token:", err.message);
    return null;
  }
}

const token = decryptToken(encryptedToken);
console.log("\n2. Token de Instagram:");
console.log("   Descifrado:", token ? `✅ token válido (${token.substring(0, 20)}...)` : "❌ No se pudo descifrar");

if (!token) {
  console.log("\n❌ No se puede continuar sin token válido.");
  process.exit(1);
}

// 3. Verificar el perfil del usuario de Instagram
console.log("\n3. Verificando perfil en graph.instagram.com...");
try {
  const meRes = await fetch(`https://graph.instagram.com/me?fields=id,username,name&access_token=${token}`);
  const meData = await meRes.json();
  if (meRes.ok) {
    console.log("   ✅ Perfil:", JSON.stringify(meData, null, 4));
  } else {
    console.log("   ❌ Error:", JSON.stringify(meData, null, 4));
  }
} catch (err) {
  console.log("   ❌ Error de red:", err.message);
}

// 4. Verificar estado de suscripción al webhook
console.log("\n4. Verificando subscribed_apps en graph.instagram.com...");
try {
  const subRes = await fetch(`https://graph.instagram.com/me/subscribed_apps?access_token=${token}`);
  const subData = await subRes.json();
  if (subRes.ok) {
    console.log("   Respuesta:", JSON.stringify(subData, null, 4));
    if (subData.data && subData.data.length > 0) {
      console.log("   ✅ App suscrita:", subData.data.map(a => `${a.name} (${a.link})`).join(", "));
    } else {
      console.log("   ⚠️ No hay apps suscritas — necesita llamar POST /me/subscribed_apps");
    }
  } else {
    console.log("   ❌ Error:", JSON.stringify(subData, null, 4));
  }
} catch (err) {
  console.log("   ❌ Error de red:", err.message);
}

// 5. Intentar suscribir el webhook
console.log("\n5. Intentando POST /me/subscribed_apps...");
const subscribedFields = "messages,messaging_postbacks,comments,mentions,story_insights";
try {
  const body = new URLSearchParams({ access_token: token, subscribed_fields: subscribedFields });
  const postRes = await fetch("https://graph.instagram.com/me/subscribed_apps", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const postData = await postRes.json();
  if (postRes.ok && postData.success) {
    console.log("   ✅ Suscripción exitosa!");
  } else {
    console.log("   ❌ Suscripción falló:", JSON.stringify(postData, null, 4));
    
    // Intentar con graph.facebook.com
    console.log("\n   Intentando con graph.facebook.com...");
    const body2 = new URLSearchParams({ access_token: token, subscribed_fields: subscribedFields });
    const postRes2 = await fetch(`https://graph.facebook.com/${META_API_VERSION}/me/subscribed_apps`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body2.toString(),
    });
    const postData2 = await postRes2.json();
    if (postRes2.ok && postData2.success) {
      console.log("   ✅ Suscripción exitosa via graph.facebook.com!");
    } else {
      console.log("   ❌ También falló:", JSON.stringify(postData2, null, 4));
    }
  }
} catch (err) {
  console.log("   ❌ Error:", err.message);
}

// 6. Verificar que el verify token del webhook funciona
console.log("\n6. Estado de configuración del webhook:");
if (META_WEBHOOK_VERIFY_TOKEN) {
  console.log("   Verify Token:", META_WEBHOOK_VERIFY_TOKEN);
  console.log("   Endpoint URL: https://zefirus.xyz/api/webhooks/meta");
  console.log("   ✅ Token configurado — asegúrate de que este mismo token está en Meta Developers");
  
  // Simular la verificación de webhook
  const testChallenge = "test_" + Date.now();
  const verifyUrl = `https://zefirus.xyz/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=${META_WEBHOOK_VERIFY_TOKEN}&hub.challenge=${testChallenge}`;
  console.log("\n   Probando endpoint de verificación...");
  try {
    const verRes = await fetch(verifyUrl);
    const verBody = await verRes.text();
    if (verRes.ok && verBody === testChallenge) {
      console.log("   ✅ El webhook responde correctamente al challenge!");
    } else {
      console.log(`   ❌ Respuesta inesperada: status=${verRes.status}, body=${verBody}`);
    }
  } catch (err) {
    console.log("   ❌ Error de red:", err.message);
  }
} else {
  console.log("   ❌ META_WEBHOOK_VERIFY_TOKEN no configurado");
  console.log("   ⚠️  CAUSA RAÍZ: Meta Developers no podrá verificar el webhook sin este token");
  console.log("   ➡️  Acción: Agrega META_WEBHOOK_VERIFY_TOKEN en Vercel Environment Variables");
}

console.log("\n=== Diagnóstico completado ===");
