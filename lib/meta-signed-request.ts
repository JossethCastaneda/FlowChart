import crypto from "crypto";
import { logger } from "@/lib/logger";

/**
 * Verifies and decodes a Meta signed_request.
 *
 * Meta sends signed_request as two base64url-encoded parts separated by a dot:
 *   <signature>.<payload>
 *
 * The signature is an HMAC-SHA256 of the payload using the app secret.
 *
 * @see https://developers.facebook.com/docs/games/gamesonfacebook/login#parsingsr
 * @returns The decoded payload object if signature is valid, or null if invalid.
 */
export function verifySignedRequest(
  signedRequest: string,
  appSecret: string
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
): Record<string, any> | null {
  const parts = signedRequest.split(".");
  if (parts.length !== 2) return null;

  const [encodedSig, encodedPayload] = parts;
  if (!encodedSig || !encodedPayload) return null;

  try {
    // Decode signature from base64url
    const sig = Buffer.from(
      encodedSig.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    );

    // Compute expected signature
    const expectedSig = crypto
      .createHmac("sha256", appSecret)
      .update(encodedPayload)
      .digest();

    // Constant-time comparison to prevent timing attacks
    if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(sig, expectedSig)) {
      logger.warn("[META SIGNED_REQUEST]  HMAC signature mismatch");
      return null;
    }

    // Decode and parse the payload
    const payloadStr = Buffer.from(
      encodedPayload.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf-8");

    return JSON.parse(payloadStr);
  } catch (err) {
    logger.error("[META SIGNED_REQUEST] Failed to verify", { error: err });
    return null;
  }
}
