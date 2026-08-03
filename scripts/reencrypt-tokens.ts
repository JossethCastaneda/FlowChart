/**
 * Re-encrypt Meta tokens stored in plain text.
 *
 * If credentials were ever saved while ENCRYPTION_KEY was missing/invalid, the
 * access tokens in the Integration table were persisted as plain text. This
 * script finds those rows and encrypts them in place.
 *
 * Usage:
 *   npm run db:reencrypt              # dry-run — only reports what it would change
 *   npm run db:reencrypt -- --apply   # actually writes the encrypted values
 *
 * Requires DATABASE_URL and a valid ENCRYPTION_KEY (64 hex chars) in the env.
 */
import prisma from "../lib/prisma";
import { encryptToken } from "../lib/encryption";

const APPLY = process.argv.includes("--apply");

function isPlainText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !value.startsWith("enc:");
}

async function main() {
  const key = process.env.ENCRYPTION_KEY || "";
  if (key.length !== 64) {
    console.error(
      "[reencrypt] ENCRYPTION_KEY must be set to 64 hex chars before running. Aborting."
    );
    process.exit(1);
  }

  const integrations = await prisma.integration.findMany();
  console.log(
    `[reencrypt] Scanning ${integrations.length} integration(s). Mode: ${APPLY ? "APPLY" : "DRY-RUN"}\n`
  );

  let rowsToUpdate = 0;
  let secretsEncrypted = 0;

  for (const integration of integrations) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const creds = (integration.credentials ?? {}) as Record<string, any>;
    let changed = false;

    // Top-level access token
    if (isPlainText(creds.accessToken)) {
      creds.accessToken = encryptToken(creds.accessToken);
      secretsEncrypted++;
      changed = true;
    }

    // Per-page access tokens
    if (Array.isArray(creds.pages)) {
      for (const page of creds.pages) {
        if (page && isPlainText(page.accessToken)) {
          page.accessToken = encryptToken(page.accessToken);
          secretsEncrypted++;
          changed = true;
        }
      }
    }

    if (changed) {
      rowsToUpdate++;
      console.log(
        `  • ${integration.provider} (workspace ${integration.workspaceId}) — plaintext token(s) found`
      );
      if (APPLY) {
        await prisma.integration.update({
          where: { id: integration.id },
          data: { credentials: creds },
        });
      }
    }
  }

  console.log(
    `\n[reencrypt] ${secretsEncrypted} secret(s) across ${rowsToUpdate} row(s) ` +
      (APPLY ? "encrypted." : "would be encrypted. Re-run with --apply to write.")
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("[reencrypt] Error:", e);
  process.exit(1);
});
