import { describe, it, expect } from "vitest";
import { encryptToken, decryptToken } from "../lib/encryption";

// ENCRYPTION_KEY is injected by vitest.config.ts (64 hex chars).

describe("encryption", () => {
  it("round-trips a token", () => {
    const plain = "EAAB_some_meta_token_123";
    const enc = encryptToken(plain);
    expect(enc).not.toBe(plain);
    expect(enc.startsWith("enc:")).toBe(true);
    expect(decryptToken(enc)).toBe(plain);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const a = encryptToken("same-token");
    const b = encryptToken("same-token");
    expect(a).not.toBe(b);
    expect(decryptToken(a)).toBe("same-token");
    expect(decryptToken(b)).toBe("same-token");
  });

  it("does not double-encrypt an already-encrypted value", () => {
    const once = encryptToken("token");
    const twice = encryptToken(once);
    expect(twice).toBe(once);
  });

  it("returns empty string for empty/nullish input", () => {
    expect(encryptToken("")).toBe("");
    expect(encryptToken(null)).toBe("");
    expect(encryptToken(undefined)).toBe("");
    expect(decryptToken("")).toBe("");
  });

  it("rejects plaintext (non-encrypted) input on decrypt", () => {
    expect(() => decryptToken("plain-legacy-token")).toThrow(
      /Plaintext credential/
    );
  });
});
