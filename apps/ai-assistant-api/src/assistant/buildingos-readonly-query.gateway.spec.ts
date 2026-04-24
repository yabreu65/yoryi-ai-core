import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpBuildingOSReadOnlyQueryGateway } from "./buildingos-readonly-query.gateway";

describe("HttpBuildingOSReadOnlyQueryGateway", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a data-backed answer when API responds with a valid payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        answer: "Hay 12 unidades morosas en Torre A.",
        answerSource: "live_data",
        responseType: "list",
        metadata: {
          queryId: "q-1",
          source: "buildingos-read-db",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const gateway = new HttpBuildingOSReadOnlyQueryGateway({
      baseUrl: "https://buildingos.example.com",
      apiKey: "secret-key",
      timeoutMs: 900,
    });

    const result = await gateway.query({
      intentCode: "GET_OVERDUE_UNITS",
      question: "¿Cuántas unidades morosas tiene Torre A?",
      context: {
        appId: "buildingos",
        tenantId: "tenant-auth",
        userId: "admin-auth",
        role: "TENANT_ADMIN",
        route: "/tenant/dashboard",
        currentModule: "charges",
        permissions: ["charges.read", "units.read"],
      },
    });

    expect(result).toEqual({
      answer: "Hay 12 unidades morosas en Torre A.",
      metadata: {
        queryId: "q-1",
        source: "buildingos-read-db",
        intent: "GET_OVERDUE_UNITS",
        intentCode: "GET_OVERDUE_UNITS",
        answerSource: "live_data",
        responseType: "list",
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = (init.headers ?? {}) as Record<string, string>;
    expect(headers["content-type"]).toBe("application/json");
    expect(headers["x-api-key"]).toBe("secret-key");
    expect(headers["x-tenant-id"]).toBe("tenant-auth");
    expect(headers["x-user-id"]).toBe("admin-auth");
    expect(headers["x-user-role"]).toBe("TENANT_ADMIN");

    const body = JSON.parse(String(init.body));
    expect(body.intentCode).toBe("GET_OVERDUE_UNITS");
    expect(body.context.tenantId).toBe("tenant-auth");
    expect(body.context.userId).toBe("admin-auth");
  });

  it("returns null when baseUrl is missing", async () => {
    const gateway = new HttpBuildingOSReadOnlyQueryGateway();

    const result = await gateway.query({
      intentCode: "GET_COLLECTIONS_SUMMARY",
      question: "Dame un resumen de cobranzas del mes",
      context: {
        appId: "buildingos",
        tenantId: "tenant-1",
        userId: "user-1",
        role: "TENANT_ADMIN",
        route: "/tenant/charges",
        currentModule: "charges",
        permissions: ["charges.read"],
      },
    });

    expect(result).toBeNull();
  });

  it("returns null when tenant context is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const gateway = new HttpBuildingOSReadOnlyQueryGateway({
      baseUrl: "https://buildingos.example.com",
    });

    const result = await gateway.query({
      intentCode: "GET_COLLECTIONS_SUMMARY",
      question: "Dame un resumen de cobranzas del mes",
      context: {
        appId: "buildingos",
        userId: "user-1",
        role: "TENANT_ADMIN",
        route: "/tenant/charges",
        currentModule: "charges",
        permissions: ["charges.read"],
      },
    });

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null on malformed API payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        answer: "",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const gateway = new HttpBuildingOSReadOnlyQueryGateway({
      baseUrl: "https://buildingos.example.com",
    });

    const result = await gateway.query({
      intentCode: "GET_OPEN_TICKETS",
      question: "¿Cuántos tickets abiertos hay?",
      context: {
        appId: "buildingos",
        tenantId: "tenant-1",
        userId: "admin-1",
        role: "TENANT_ADMIN",
        route: "/tenant/tickets",
        currentModule: "tickets",
        permissions: ["tickets.read"],
      },
    });

    expect(result).toBeNull();
  });

  it("opens circuit breaker after repeated gateway failures", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network error"));
    vi.stubGlobal("fetch", fetchMock);

    const gateway = new HttpBuildingOSReadOnlyQueryGateway({
      baseUrl: "https://buildingos.example.com",
      circuitBreakerFailureThreshold: 2,
      circuitBreakerOpenMs: 5_000,
    });

    const input = {
      intentCode: "GET_COLLECTIONS_SUMMARY" as const,
      question: "Dame un resumen de cobranzas del mes",
      context: {
        appId: "buildingos",
        tenantId: "tenant-1",
        userId: "user-1",
        role: "TENANT_ADMIN",
        route: "/tenant/charges",
        currentModule: "charges",
        permissions: ["charges.read"],
      },
    };

    await gateway.query(input);
    await gateway.query(input);
    await gateway.query(input);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses tool endpoint when toolName is provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        contractVersion: "2026-04-p0-response-v1",
        answer: "Unidad A-101 resuelta.",
        answerSource: "live_data",
        responseType: "summary",
        dataScope: "tenant",
        actions: [],
        metadata: {},
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const gateway = new HttpBuildingOSReadOnlyQueryGateway({
      baseUrl: "https://buildingos.example.com",
      apiKey: "secret-key",
    });

    await gateway.query({
      intentCode: "GET_UNIT_DEBT",
      question: "Cuanto debe la unidad 101",
      toolName: "get_unit_balance",
      toolInput: { unitCode: "101", debtStatus: "OVERDUE" },
      context: {
        appId: "buildingos",
        tenantId: "tenant-auth",
        userId: "admin-auth",
        role: "TENANT_ADMIN",
        route: "/tenant/charges",
        currentModule: "charges",
        permissions: ["charges.read", "units.read"],
      },
    });

    const [calledUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toContain("/assistant/tools/get_unit_balance");
  });

  it("rejects knowledge answerSource in p0 responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        answer: "Respuesta basada en knowledge",
        answerSource: "knowledge",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const gateway = new HttpBuildingOSReadOnlyQueryGateway({
      baseUrl: "https://buildingos.example.com",
    });

    const result = await gateway.query({
      intentCode: "GET_OPEN_TICKETS",
      question: "tickets abiertos",
      toolName: "search_tickets",
      context: {
        appId: "buildingos",
        tenantId: "tenant-1",
        userId: "admin-1",
        role: "TENANT_ADMIN",
        route: "/tenant/tickets",
        currentModule: "tickets",
        permissions: ["tickets.read"],
      },
    });

    expect(result).toBeNull();
  });
});
