import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

/**
 * Tests for scripts/agy-guardrail.mjs — the safety guardrail for agent tool calls.
 *
 * Each test sends a simulated tool call payload via stdin and asserts the
 * decision (allow/deny) on stdout. The guardrail runs as a subprocess to
 * match the real execution model (hooks.json pipes stdin → stdout).
 *
 * Covers §3.3 requirements:
 * - Denylist URL → rejected
 * - Allowlist URL → accepted
 * - Unknown tool → denied (fail-closed)
 * - Command tools still work (regression)
 */

const SCRIPT = join(__dirname, "..", "scripts", "agy-guardrail.mjs");

function runGuardrail(payload: Record<string, unknown>): { decision: string; reason?: string } {
  const input = JSON.stringify(payload);
  const stdout = execFileSync("node", [SCRIPT], {
    input,
    encoding: "utf8",
    timeout: 5000,
  }).trim();
  return JSON.parse(stdout);
}

function browserCall(taskText: string) {
  return {
    toolCall: {
      name: "browser_subagent",
      args: { Task: taskText },
    },
  };
}

function commandCall(commandLine: string) {
  return {
    toolCall: {
      name: "run_command",
      args: { CommandLine: commandLine },
    },
  };
}

describe("guardrail — browser navigation", () => {
  it("rejects a denylist URL (vercel.com/dashboard)", () => {
    const result = runGuardrail(browserCall("Navigate to https://vercel.com/dashboard and check deployments"));
    expect(result.decision).toBe("deny");
    expect(result.reason).toContain("denylist");
  });

  it("rejects a denylist URL (console.neon.tech)", () => {
    const result = runGuardrail(browserCall("Go to https://console.neon.tech/app/projects"));
    expect(result.decision).toBe("deny");
  });

  it("rejects a denylist URL (*.vercel.app)", () => {
    const result = runGuardrail(browserCall("Open https://zefirus-git-main-josseths.vercel.app/"));
    expect(result.decision).toBe("deny");
  });

  it("rejects a denylist URL (business.facebook.com)", () => {
    const result = runGuardrail(browserCall("Navigate to https://business.facebook.com/settings"));
    expect(result.decision).toBe("deny");
  });

  it("rejects a denylist URL (ads.google.com)", () => {
    const result = runGuardrail(browserCall("Check https://ads.google.com/aw/campaigns"));
    expect(result.decision).toBe("deny");
  });

  it("rejects a denylist URL (github.com/*/settings)", () => {
    const result = runGuardrail(browserCall("Go to https://github.com/JossethCastaneda/Zefirus/settings"));
    expect(result.decision).toBe("deny");
  });

  it("allows an allowlist URL (localhost:3000)", () => {
    const result = runGuardrail(browserCall("Navigate to http://localhost:3000/dashboard"));
    expect(result.decision).toBe("allow");
  });

  it("allows an allowlist URL (127.0.0.1)", () => {
    const result = runGuardrail(browserCall("Open http://127.0.0.1:3000/api/health"));
    expect(result.decision).toBe("allow");
  });

  it("allows an allowlist URL (developers.facebook.com/docs)", () => {
    const result = runGuardrail(browserCall("Read https://developers.facebook.com/docs/graph-api/reference"));
    expect(result.decision).toBe("allow");
  });

  it("allows an allowlist URL (developers.google.com/google-ads/api/docs)", () => {
    const result = runGuardrail(browserCall("Check https://developers.google.com/google-ads/api/docs/start"));
    expect(result.decision).toBe("allow");
  });

  it("allows an allowlist URL (vercel.com/docs)", () => {
    const result = runGuardrail(browserCall("Read https://vercel.com/docs/deployments"));
    expect(result.decision).toBe("allow");
  });

  it("rejects an unlisted URL (not in allowlist → fail-closed)", () => {
    const result = runGuardrail(browserCall("Open https://example.com/some-page"));
    expect(result.decision).toBe("deny");
    expect(result.reason).toContain("allowlist");
  });

  it("allows a task with no URLs (e.g., interact with already-open page)", () => {
    const result = runGuardrail(browserCall("Click the submit button and read the result"));
    expect(result.decision).toBe("allow");
  });

  it("rejects if ANY URL in the task is denied (mixed URLs)", () => {
    const result = runGuardrail(browserCall(
      "First go to http://localhost:3000 then navigate to https://vercel.com/dashboard"
    ));
    expect(result.decision).toBe("deny");
  });

  it("rejects call_mcp_tool navigate_page with denied URL", () => {
    const result = runGuardrail({
      toolCall: {
        name: "call_mcp_tool",
        args: {
          ServerName: "chrome-devtools-mcp",
          ToolName: "navigate_page",
          Arguments: { url: "https://vercel.com/dashboard" }
        }
      }
    });
    expect(result.decision).toBe("deny");
    expect(result.reason).toContain("denylist");
  });

  it("allows mcp_chrome-devtools-mcp_navigate_page with allowed URL", () => {
    const result = runGuardrail({
      toolCall: {
        name: "mcp_chrome-devtools-mcp_navigate_page",
        args: { url: "http://localhost:3000" }
      }
    });
    expect(result.decision).toBe("allow");
  });
});

describe("guardrail — unknown tools", () => {
  it("denies an unknown tool (fail-closed)", () => {
    const result = runGuardrail({
      toolCall: { name: "some_unknown_tool", args: { foo: "bar" } },
    });
    expect(result.decision).toBe("deny");
    expect(result.reason).toContain("desconocida");
  });
});

describe("guardrail — command tools (regression)", () => {
  it("allows a safe command", () => {
    const result = runGuardrail(commandCall("npx tsc --noEmit"));
    expect(result.decision).toBe("allow");
  });

  it("blocks prisma db push", () => {
    const result = runGuardrail(commandCall("npx prisma db push"));
    expect(result.decision).toBe("deny");
  });

  it("blocks npm run build", () => {
    const result = runGuardrail(commandCall("npm run build"));
    expect(result.decision).toBe("deny");
  });

  it("allows SKIP_DB_SYNC=1 npx next build", () => {
    const result = runGuardrail(commandCall("SKIP_DB_SYNC=1 npx next build"));
    expect(result.decision).toBe("allow");
  });

  it("blocks npx next build without SKIP_DB_SYNC", () => {
    const result = runGuardrail(commandCall("npx next build"));
    expect(result.decision).toBe("deny");
  });
});
