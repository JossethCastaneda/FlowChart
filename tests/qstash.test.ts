import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock env so importing lib/qstash no ejecuta parseEnv() real (que lanzaría sin
// DATABASE_URL etc.). Sin claves de firma → el Receiver no se construye y se
// ejercita la ruta de fallback por bearer.
vi.mock("@/lib/env", () => ({
  env: {
    QSTASH_TOKEN: "test-token",
    QSTASH_CURRENT_SIGNING_KEY: undefined,
    QSTASH_NEXT_SIGNING_KEY: undefined,
    QSTASH_WORKER_BASE_URL: undefined,
    NEXT_PUBLIC_APP_URL: undefined,
  },
}));

import { env } from "@/lib/env";
import {
  getWorkerBaseUrl,
  verifyQstashRequest,
  isQstashConfigured,
  isQstashSignatureConfigured,
} from "../lib/qstash";

const mutableEnv = env as unknown as Record<string, string | undefined>;

function reqWith(headers: Record<string, string>): Request {
  return new Request("https://worker.example/api/jobs/publish", {
    method: "POST",
    headers,
  });
}

beforeEach(() => {
  mutableEnv.QSTASH_WORKER_BASE_URL = undefined;
  mutableEnv.NEXT_PUBLIC_APP_URL = undefined;
  delete process.env.PUBLISH_WORKER_SECRET;
});

describe("getWorkerBaseUrl", () => {
  it("prefiere QSTASH_WORKER_BASE_URL y recorta la barra final", () => {
    mutableEnv.QSTASH_WORKER_BASE_URL = "https://app.sodare.xyz/";
    expect(getWorkerBaseUrl()).toBe("https://app.sodare.xyz");
  });

  it("cae a NEXT_PUBLIC_APP_URL cuando no hay base dedicada", () => {
    mutableEnv.NEXT_PUBLIC_APP_URL = "https://preview.sodare.xyz";
    expect(getWorkerBaseUrl()).toBe("https://preview.sodare.xyz");
  });

  it("usa el dominio de producción por defecto si no hay nada configurado", () => {
    expect(getWorkerBaseUrl()).toBe("https://sodare.xyz");
  });
});

describe("isQstashConfigured / isQstashSignatureConfigured", () => {
  it("reporta token presente y firma ausente con esta configuración de prueba", () => {
    expect(isQstashConfigured()).toBe(true);
    expect(isQstashSignatureConfigured()).toBe(false);
  });
});

describe("verifyQstashRequest (fallback por bearer, sin claves de firma)", () => {
  it("acepta cuando el bearer reenviado coincide con PUBLISH_WORKER_SECRET", async () => {
    process.env.PUBLISH_WORKER_SECRET = "s3cret";
    const res = await verifyQstashRequest(
      reqWith({ authorization: "Bearer s3cret" }),
      "{}"
    );
    expect(res).toEqual({ ok: true, method: "bearer" });
  });

  it("rechaza cuando el bearer no coincide", async () => {
    process.env.PUBLISH_WORKER_SECRET = "s3cret";
    const res = await verifyQstashRequest(
      reqWith({ authorization: "Bearer wrong" }),
      "{}"
    );
    expect(res.ok).toBe(false);
  });

  it("rechaza (fail-closed) cuando no hay firma ni secreto configurado", async () => {
    const res = await verifyQstashRequest(
      reqWith({ "upstash-signature": "irrelevant-sin-claves" }),
      "{}"
    );
    expect(res.ok).toBe(false);
  });
});
