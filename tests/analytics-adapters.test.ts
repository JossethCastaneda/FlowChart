import { describe, it, expect } from "vitest";
import { AnalyticsAdapterFactory } from "../lib/analytics/adapters/AnalyticsAdapterFactory";

describe("Analytics Adapters", () => {
  it("should return the Cari AI adapter", () => {
    const adapter = AnalyticsAdapterFactory.getAdapter("cari_ai");
    expect(adapter).toBeDefined();
    expect(adapter.testConnection).toBeDefined();
  });

  it("should return the Botmaker adapter", () => {
    const adapter = AnalyticsAdapterFactory.getAdapter("botmaker");
    expect(adapter).toBeDefined();
  });

  it("should throw for unsupported providers", () => {
    expect(() => AnalyticsAdapterFactory.getAdapter("unsupported")).toThrow("Provider no soportado");
  });

  it("should fail testing connection with empty token", async () => {
    const adapter = AnalyticsAdapterFactory.getAdapter("cari_ai");
    await expect(adapter.testConnection({})).rejects.toThrow("El token de Cari AI es requerido");
  });

  it("should fail testing connection with exactly 'fail' token", async () => {
    const adapter = AnalyticsAdapterFactory.getAdapter("cari_ai");
    await expect(adapter.testConnection({ accessToken: "fail" })).rejects.toThrow("Credenciales inválidas para Cari AI");
  });

  it("should succeed testing connection with valid token", async () => {
    const adapter = AnalyticsAdapterFactory.getAdapter("cari_ai");
    const result = await adapter.testConnection({ accessToken: "valid_token" });
    expect(result).toBe(true);
  });
});
