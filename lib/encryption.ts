import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
// ENCRYPTION_KEY must be a 32-byte hex string (64 characters)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || ""; 

/**
 * Encrypts a plain text string using AES-256-GCM.
 * Returns a string in the format: "enc:ivHex:authTagHex:encryptedHex"
 * If ENCRYPTION_KEY is not set or text is empty, returns the original text.
 */
export function encryptToken(text: string | null | undefined): string {
  if (!text) return "";
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    const msg = "[ENCRYPTION] ENCRYPTION_KEY is not set or invalid length (must be 64 hex chars).";
    // Fail-fast in production: never persist Meta tokens / credentials in plain text.
    // The caller (OAuth callback, token sync) surfaces this as a visible error
    // instead of silently storing secrets unencrypted at rest.
    if (process.env.NODE_ENV === "production") {
      throw new Error(`${msg} Refusing to store credentials unencrypted.`);
    }
    console.warn(`${msg} Storing token as plain text (dev only).`);
    return text;
  }
  
  // Skip if already encrypted
  if (text.startsWith("enc:")) return text;

  try {
    const key = Buffer.from(ENCRYPTION_KEY, "hex");
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");
    
    return `enc:${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error("[ENCRYPTION] Failed to encrypt token:", err);
    throw new Error("[ENCRYPTION] Failed to encrypt token. Refusing to store unencrypted credentials.");
  }
}

/**
 * Decrypts a token encrypted with encryptToken().
 * Throws if the value does not start with "enc:" — plaintext credentials are
 * never accepted; legacy unencrypted tokens must be re-connected by the user.
 */
export function decryptToken(encryptedText: string | null | undefined): string {
  if (!encryptedText) return "";
  
  // The fallback to plain text is now removed for full security compliance.
  // We throw an error if we encounter unencrypted tokens.
  if (!encryptedText.startsWith("enc:")) {
    const msg = "[ENCRYPTION] Plaintext credential encountered! Rejecting to decrypt/use unencrypted token.";
    console.error(msg);
    throw new Error(msg);
  }

  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    console.error("[ENCRYPTION] Cannot decrypt token because ENCRYPTION_KEY is missing or invalid.");
    return encryptedText; // Will likely cause auth failures, but we can't do anything else
  }

  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 4) return encryptedText;
    
    const [, ivHex, authTagHex, encryptedHex] = parts;
    const key = Buffer.from(ENCRYPTION_KEY, "hex");
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (err) {
    console.error("[ENCRYPTION] Failed to decrypt token:", err);
    return encryptedText; // Return encrypted string if decryption fails
  }
}
