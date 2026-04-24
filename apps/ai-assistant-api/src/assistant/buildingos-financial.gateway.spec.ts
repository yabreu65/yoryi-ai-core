import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HttpBuildingOSFinancialGateway } from "./buildingos-financial.gateway";

describe("HttpBuildingOSFinancialGateway", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns debt summary when API responds with valid payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        amount: 123.45,
        currency: "ARS",
        asOf: "2026-04-18",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const gateway = new HttpBuildingOSFinancialGateway({
      baseUrl: "https://finance.example.com",
      timeoutMs: 800,
      apiKey: "secret",
    });

    const result = await gateway.getResidentDebtSummary({
      tenantId: "tenant-1",
      userId: "user-1",
    });

    expect(result).toEqual({
      amount: 123.45,
      currency: "ARS",
      asOf: "2026-04-18",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null on gateway errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    const gateway = new HttpBuildingOSFinancialGateway({
      baseUrl: "https://finance.example.com",
      timeoutMs: 800,
    });

    const result = await gateway.getResidentDebtSummary({
      tenantId: "tenant-1",
      userId: "user-1",
    });

    expect(result).toBeNull();
  });

  it("returns null when baseUrl is missing", async () => {
    const gateway = new HttpBuildingOSFinancialGateway();

    const result = await gateway.getResidentDebtSummary({
      tenantId: "tenant-1",
      userId: "user-1",
    });

    expect(result).toBeNull();
  });

  it("opens circuit breaker after consecutive failures", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network error"));
    vi.stubGlobal("fetch", fetchMock);

    const gateway = new HttpBuildingOSFinancialGateway({
      baseUrl: "https://finance.example.com",
      timeoutMs: 800,
      circuitBreakerFailureThreshold: 2,
      circuitBreakerOpenMs: 5_000,
    });

    await gateway.getResidentDebtSummary({
      tenantId: "tenant-1",
      userId: "user-1",
    });
    await gateway.getResidentDebtSummary({
      tenantId: "tenant-1",
      userId: "user-1",
    });
    await gateway.getResidentDebtSummary({
      tenantId: "tenant-1",
      userId: "user-1",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
