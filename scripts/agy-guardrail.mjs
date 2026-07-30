#!/usr/bin/env node
// ============================================================================
// agy-guardrail.mjs — Safety guardrail for Antigravity IDE tool calls
// ============================================================================
// Reads a JSON tool call from stdin, decides allow/deny based on project rules.
// Used by .agents/hooks.json to intercept dangerous commands before execution.
//
// Protocol:
//   stdin  → {"toolCall":{"name":"run_command","args":{"CommandLine":"..."}}}
//   stdout → {"decision":"allow"} | {"decision":"deny","reason":"..."}
// ============================================================================

import { createInterface } from "node:readline";

// ── Blocked command patterns ────────────────────────────────────────────────
// Each entry: [regex, human-readable reason]
const BLOCKED_COMMANDS = [
  // Database schema writes — can corrupt production DB
  [/\bprisma\s+(db\s+push|migrate\s+(deploy|dev|reset)|db\s+seed)\b/i,
    "Escritura de esquema bloqueada. prisma db push / migrate pueden corromper la DB de producción."],

  // db-sync script — invoked by `npm run build`, mutates schema
  [/\bdb-sync\.mjs\b/i,
    "db-sync.mjs bloqueado. Sincroniza esquema contra la DB remota — peligroso sin revisión."],

  // npm run db:* — any db-related npm script
  [/\bnpm\s+run\s+db:/i,
    "npm run db:* bloqueado. Estos scripts pueden mutar la base de datos."],

  // npm run build — invokes db-sync as part of build
  [/\bnpm\s+run\s+build\b/i,
    "npm run build bloqueado. El build invoca db-sync. Usa: SKIP_DB_SYNC=1 npx next build"],

  // Direct build without SKIP_DB_SYNC — checked programmatically below
  // (regex negative lookahead doesn't work across the whole command string)


  // truncate-db script
  [/\btruncate-db\.mjs\b/i,
    "truncate-db.mjs bloqueado. Borra todos los datos de la base de datos."],

  // Environment file mutations
  [/\b(cat|type|echo|more)\b.*\.env\.(production|test)/i,
    "Lectura de archivos .env de producción/test bloqueada por política de seguridad."],
];

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const lines = [];
  const rl = createInterface({ input: process.stdin });

  for await (const line of rl) {
    lines.push(line);
  }

  const raw = lines.join("\n").trim();
  if (!raw) {
    // Empty input → allow (no tool call to evaluate)
    console.log(JSON.stringify({ decision: "allow" }));
    return;
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    // Malformed JSON → allow (fail-open for non-tool-call inputs)
    console.log(JSON.stringify({ decision: "allow" }));
    return;
  }

  const toolName = payload?.toolCall?.name;
  const args = payload?.toolCall?.args || {};

  // Only evaluate run_command and unsandboxed calls
  if (toolName !== "run_command" && toolName !== "unsandboxed") {
    console.log(JSON.stringify({ decision: "allow" }));
    return;
  }

  const cmd = args.CommandLine || "";

  for (const [pattern, reason] of BLOCKED_COMMANDS) {
    if (pattern.test(cmd)) {
      console.log(JSON.stringify({ decision: "deny", reason }));
      return;
    }
  }

  // Special check: `npx next build` without SKIP_DB_SYNC prefix
  if (/\bnpx\s+next\s+build\b/i.test(cmd) && !/SKIP_DB_SYNC/i.test(cmd)) {
    console.log(JSON.stringify({
      decision: "deny",
      reason: "next build sin SKIP_DB_SYNC bloqueado. Usa: SKIP_DB_SYNC=1 npx next build",
    }));
    return;
  }

  // Not blocked → allow
  console.log(JSON.stringify({ decision: "allow" }));
}

main().catch((err) => {
  console.error("[guardrail] Fatal:", err);
  // Fail-open: if the guardrail itself crashes, don't block the agent
  console.log(JSON.stringify({ decision: "allow" }));
});
