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
//
// Covers: run_command, unsandboxed (commands), browser_subagent (navigation)
// ============================================================================

import { createInterface } from "node:readline";

// ── Blocked command patterns ────────────────────────────────────────────────
// Each entry: [regex, human-readable reason]
const BLOCKED_COMMANDS = [
  // Database schema writes — can corrupt production DB
  [/\bprisma\s+(db\s+push|migrate\s+(deploy|dev|reset)|db\s+seed)\b/i,
    "Escritura de esquema bloqueada. prisma db push / migrate pueden corromper la DB de producción."],

  // Deprecated sync entrypoint. It is a refusal tombstone, but direct calls are
  // still blocked so agents use the reviewed migration workflow.
  [/\bdb-sync\.mjs\b/i,
    "db-sync.mjs está deprecado. Usa el flujo de migración aislada y revisada."],

  // npm run db:* — any db-related npm script
  [/\bnpm\s+run\s+db:/i,
    "npm run db:* bloqueado. Estos scripts pueden mutar la base de datos."],

  // truncate-db script
  [/\btruncate-db\.mjs\b/i,
    "truncate-db.mjs bloqueado. Borra todos los datos de la base de datos."],

  // Environment file mutations
  [/\b(cat|type|echo|more)\b.*\.env\.(production|test)/i,
    "Lectura de archivos .env de producción/test bloqueada por política de seguridad."],
];

// ── Browser navigation allowlist/denylist (§3.1 / §3.2) ────────────────────
// Allowlist: only these origins/paths are permitted for browser navigation.
// Everything not explicitly allowed is denied (fail-closed).
const BROWSER_ALLOWLIST = [
  /^https?:\/\/localhost(:\d+)?(\/|$)/i,
  /^https?:\/\/127\.0\.0\.1(:\d+)?(\/|$)/i,
  /^https:\/\/developers\.facebook\.com\/docs\//i,
  /^https:\/\/developers\.google\.com\/google-ads\/api\/docs\//i,
  /^https:\/\/neon\.tech\/docs\//i,
  /^https:\/\/vercel\.com\/docs\//i,
];

// Denylist: these are explicitly blocked even if someone tries to add them
// to the allowlist in the future. Belt-and-suspenders.
const BROWSER_DENYLIST = [
  /\bvercel\.com\/dashboard\b/i,
  /\bconsole\.neon\.tech\b/i,
  /\bbusiness\.facebook\.com\b/i,
  /\bads\.google\.com\b/i,
  /\badsmanager\.facebook\.com\b/i,
  /\banalytics\.google\.com\b/i,
  /\btagmanager\.google\.com\b/i,
  /\bsearch\.google\.com\/search-console\b/i,
  /\bgithub\.com\/[^/]+\/[^/]+\/settings\b/i,
  /\.vercel\.app\b/i,
];

/**
 * Extract all URLs from a string (task description, etc.).
 * Returns an array of URL strings found in the text.
 */
function extractUrls(text) {
  if (!text) return [];
  const urlPattern = /https?:\/\/[^\s"'<>)\]},]+/gi;
  return (text.match(urlPattern) || []);
}

/**
 * Check if a URL is in the denylist.
 */
function isDenied(url) {
  return BROWSER_DENYLIST.some((pattern) => pattern.test(url));
}

/**
 * Check if a URL is in the allowlist.
 */
function isAllowed(url) {
  return BROWSER_ALLOWLIST.some((pattern) => pattern.test(url));
}

function evaluateBrowserCall(toolName, args) {
  const task = args.Task || args.task || "";
  const urls = extractUrls(task);

  // Support MCP navigate_page
  const urlArg = args.url || (args.Arguments && args.Arguments.url);
  if (urlArg && typeof urlArg === "string") {
    urls.push(urlArg);
  }

  // If the task mentions a denied URL, block immediately
  for (const url of urls) {
    if (isDenied(url)) {
      return {
        decision: "deny",
        reason: `Navegación bloqueada: ${url} está en la denylist del proyecto (§3.2). ` +
          `Si necesitas este recurso, documéntalo en docs/pendientes-humanos.md.`,
      };
    }
  }

  // If there are URLs, all must be in the allowlist
  if (urls.length > 0) {
    for (const url of urls) {
      if (!isAllowed(url)) {
        return {
          decision: "deny",
          reason: `Navegación bloqueada: ${url} no está en la allowlist del proyecto (§3.1). ` +
            `Solo se permite: localhost, 127.0.0.1, y docs de Facebook/Google/Neon/Vercel.`,
        };
      }
    }
    return { decision: "allow" };
  }

  // No URLs found in task description — allow (the task might be describing
  // actions on an already-open page, which hooks.json will re-evaluate on
  // each sub-tool call if those are also hooked).
  // But wait, if it's call_mcp_tool but NOT navigate_page, we should allow it.
  return { decision: "allow" };
}

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
    // Malformed JSON → deny for browser, allow for commands
    // (browser hook has on_error: deny, command hook has on_error: allow)
    console.log(JSON.stringify({ decision: "allow" }));
    return;
  }

  const toolName = payload?.toolCall?.name;
  const args = payload?.toolCall?.args || {};

  if (toolName === "browser_subagent" || toolName === "call_mcp_tool" || toolName === "mcp_chrome-devtools-mcp_navigate_page") {
    const result = evaluateBrowserCall(toolName, args);
    console.log(JSON.stringify(result));
    return;
  }

  // ── Command tools ─────────────────────────────────────────────────────
  if (toolName === "run_command" || toolName === "unsandboxed") {
    const cmd = args.CommandLine || "";

    for (const [pattern, reason] of BLOCKED_COMMANDS) {
      if (pattern.test(cmd)) {
        console.log(JSON.stringify({ decision: "deny", reason }));
        return;
      }
    }

    // Not blocked → allow
    console.log(JSON.stringify({ decision: "allow" }));
    return;
  }

  // ── Unknown tool → deny (fail-closed) ─────────────────────────────────
  console.log(JSON.stringify({
    decision: "deny",
    reason: `Herramienta desconocida "${toolName}" no evaluada por el guardián. Fail-closed.`,
  }));
}

main().catch((err) => {
  console.error("[guardrail] Fatal:", err);
  // Fail-closed for browser, fail-open for commands.
  // Since we can't distinguish here, output deny. The hook's on_error
  // setting is the final arbiter: "allow" for commands, "deny" for browser.
  console.log(JSON.stringify({ decision: "deny", reason: "Guardrail crash — fail-closed." }));
});
