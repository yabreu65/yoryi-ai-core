import { afterEach, describe, expect, it, vi } from "vitest";
import type { ResolvedAssistantContext } from "@yoryi/ai-types";
import type { BuildingOSReadOnlyQueryGateway } from "../buildingos-readonly-query.gateway";
import { BuildingOSAdapter } from "../buildingos.adapter";

const RESIDENT_CONTEXT: ResolvedAssistantContext = {
  appId: "buildingos",
  tenantId: "tenant-1",
  userId: "resident-1",
  role: "RESIDENT",
  route: "/resident/finanzas",
  currentModule: "charges",
  permissions: ["charges.read", "payments.read"],
  extra: {
    unitId: "A-1203",
    buildingId: "Torre-A",
  },
};

const ADMIN_CONTEXT: ResolvedAssistantContext = {
  appId: "buildingos",
  tenantId: "tenant-1",
  userId: "admin-1",
  role: "TENANT_ADMIN",
  route: "/tenant/finanzas",
  currentModule: "charges",
  permissions: ["charges.read", "payments.read"],
  extra: {
    buildingId: "EDIF-1",
    period: "2026-04",
  },
};

describe("BuildingOSAdapter + Intent Library Tool Binding", () => {
  const originalP0Enforcement = process.env.ASSISTANT_P0_ENFORCEMENT_ENABLED;

  afterEach(() => {
    process.env.ASSISTANT_P0_ENFORCEMENT_ENABLED = originalP0Enforcement;
  });

  it("Caso A: deuda unidad ejecuta tool y responde con datos reales", async () => {
    const queryMock = vi
      .fn<BuildingOSReadOnlyQueryGateway["query"]>()
      .mockResolvedValue({
        answer: "gateway-answer",
        metadata: {
          amount: 12500.75,
          currency: "ARS",
          asOf: "2026-04-29",
          status: "en mora",
          overdueAmount: 4100,
          dueDate: "2026-05-10",
        },
      });

    const adapter = new BuildingOSAdapter({
      readOnlyQueryGateway: { query: queryMock },
    });

    const result = await adapter.resolveDataBackedAnswer({
      question: "cuanto debo hoy en mi unidad",
      context: { ...RESIDENT_CONTEXT },
    });

    expect(result).not.toBeNull();
    expect(result?.answer).toContain("$ 12.500,75");
    expect(result?.metadata?.intentLibraryMatched).toBe(true);
    expect(result?.metadata?.intentLibraryIntentCode).toBe("GET_UNIT_DEBT");
    expect(result?.metadata?.fallbackPath).toBe("cache_miss");
    expect(result?.metadata?.gatewayOutcome).toBe("cache_miss");
    expect(result?.metadata?.resolvedLevel).toBe("P0");
    expect(typeof result?.metadata?.latencyMsGateway).toBe("number");
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0]?.[0]?.intentCode).toBe("GET_UNIT_DEBT");
    expect(queryMock.mock.calls[0]?.[0]?.toolName).toBe("get_unit_balance");
  });

  it("Caso B: falta unitId -> clarificación y NO llama tool", async () => {
    const queryMock = vi
      .fn<BuildingOSReadOnlyQueryGateway["query"]>()
      .mockResolvedValue({ answer: "should-not-run" });

    const adapter = new BuildingOSAdapter({
      readOnlyQueryGateway: { query: queryMock },
    });

    const result = await adapter.resolveDataBackedAnswer({
      question: "cuanto debo hoy",
      context: {
        ...RESIDENT_CONTEXT,
        extra: {
          buildingId: "Torre-A",
        },
      },
    });

    expect(result).not.toBeNull();
    expect(result?.metadata?.fallbackPath).toBe("intent_library_clarification");
    expect(result?.metadata?.clarificationAsked).toBe(true);
    expect(result?.metadata?.missingEntities).toContain("unitId");
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("Caso C1: enforcement ON + tool null => respuesta controlada sin classifier/knowledge", async () => {
    process.env.ASSISTANT_P0_ENFORCEMENT_ENABLED = "true";

    const queryMock = vi
      .fn<BuildingOSReadOnlyQueryGateway["query"]>()
      .mockResolvedValue(null);

    const adapter = new BuildingOSAdapter({
      readOnlyQueryGateway: { query: queryMock },
    });

    const result = await adapter.resolveDataBackedAnswer({
      question: "cuanto debo hoy en mi unidad",
      context: { ...RESIDENT_CONTEXT },
    });

    expect(result).not.toBeNull();
    expect(result?.metadata?.fallbackPath).toBe("intent_library_tool_null");
    expect(result?.metadata?.gatewayOutcome).toBe("null");
    expect(result?.metadata?.resolvedLevel).toBe("P0");
    expect(result?.metadata?.intentLibraryMatched).toBe(true);
    expect(result?.answer).toContain("No encontré datos operativos");
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("Caso C2/D: enforcement ON + tool error => respuesta controlada + metadata de error/latencia", async () => {
    process.env.ASSISTANT_P0_ENFORCEMENT_ENABLED = "true";

    const queryMock = vi
      .fn<BuildingOSReadOnlyQueryGateway["query"]>()
      .mockRejectedValue(new Error("gateway down"));

    const adapter = new BuildingOSAdapter({
      readOnlyQueryGateway: { query: queryMock },
    });

    const result = await adapter.resolveDataBackedAnswer({
      question: "cuanto debo hoy en mi unidad",
      context: { ...RESIDENT_CONTEXT },
    });

    expect(result).not.toBeNull();
    expect(result?.metadata?.fallbackPath).toBe("intent_library_tool_error");
    expect(result?.metadata?.gatewayOutcome).toBe("error");
    expect(result?.metadata?.resolvedLevel).toBe("P0");
    expect(typeof result?.metadata?.latencyMsGateway).toBe("number");
    expect((result?.metadata?.latencyMsGateway as number) >= 0).toBe(true);
    expect(result?.answer).toContain("No pude confirmar datos operativos");
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("E2E ADMIN: deuda total edificio responde canónico y no entra a rutas normales", async () => {
    const queryMock = vi
      .fn<BuildingOSReadOnlyQueryGateway["query"]>()
      .mockResolvedValue({
        answer: "should-not-be-used-directly",
        metadata: {
          amount: 85000,
          overdueAmount: 24000,
          asOf: "2026-04-29",
          currency: "ARS",
        },
      });

    const adapter = new BuildingOSAdapter({
      readOnlyQueryGateway: { query: queryMock },
    });

    const result = await adapter.resolveDataBackedAnswer({
      question: "cual es la deuda total del edificio hoy",
      context: { ...ADMIN_CONTEXT },
    });

    expect(result).not.toBeNull();
    expect(result?.answer).toContain("Deuda total del edificio");
    expect(result?.metadata?.intentLibraryMatched).toBe(true);
    expect(result?.metadata?.intentLibraryIntentCode).toBe(
      "GET_BUILDING_DEBT_TREND"
    );
    expect(result?.metadata?.fallbackPath).toBe("cache_miss");
    expect(result?.metadata?.resolvedLevel).toBe("P0");
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0]?.[0]?.intentCode).toBe(
      "GET_BUILDING_DEBT_TREND"
    );
    expect(queryMock.mock.calls[0]?.[0]?.toolName).toBe(
      "get_building_debt_trend"
    );
  });

  it("ADMIN sin payments.read => bloqueado (denied) y no ejecuta tool", async () => {
    const queryMock = vi
      .fn<BuildingOSReadOnlyQueryGateway["query"]>()
      .mockResolvedValue({
        answer: "unexpected",
      });

    const adapter = new BuildingOSAdapter({
      readOnlyQueryGateway: { query: queryMock },
    });

    const result = await adapter.resolveDataBackedAnswer({
      question: "cual es la deuda total del edificio hoy",
      context: {
        ...ADMIN_CONTEXT,
        permissions: ["charges.read"],
      },
    });

    expect(result).not.toBeNull();
    expect(result?.metadata?.gatewayOutcome).toBe("denied");
    expect(result?.metadata?.fallbackPath).toBe("intent_library_tool_error");
    expect(result?.answer).toContain("rol o permisos");
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("ADMIN sin buildingId => clarificación y no ejecuta tool", async () => {
    const queryMock = vi
      .fn<BuildingOSReadOnlyQueryGateway["query"]>()
      .mockResolvedValue({
        answer: "unexpected",
      });

    const adapter = new BuildingOSAdapter({
      readOnlyQueryGateway: { query: queryMock },
    });

    const result = await adapter.resolveDataBackedAnswer({
      question: "cual es la deuda total del edificio hoy",
      context: {
        ...ADMIN_CONTEXT,
        extra: {
          period: "2026-04",
        },
      },
    });

    expect(result).not.toBeNull();
    expect(result?.metadata?.fallbackPath).toBe("intent_library_clarification");
    expect(result?.metadata?.clarificationAsked).toBe(true);
    expect(result?.metadata?.missingEntities).toContain("buildingId");
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("cache hit: no llama gateway y metadata cache_hit", async () => {
    const queryMock = vi
      .fn<BuildingOSReadOnlyQueryGateway["query"]>()
      .mockResolvedValue({
        answer: "gateway-answer",
        metadata: {
          amount: 12500.75,
          currency: "ARS",
          asOf: "2026-04-29",
        },
      });

    const adapter = new BuildingOSAdapter({
      readOnlyQueryGateway: { query: queryMock },
    });

    const first = await adapter.resolveDataBackedAnswer({
      question: "cuanto debo hoy en mi unidad",
      context: { ...RESIDENT_CONTEXT },
    });
    expect(first?.metadata?.gatewayOutcome).toBe("cache_miss");

    const second = await adapter.resolveDataBackedAnswer({
      question: "cuanto debo hoy en mi unidad",
      context: { ...RESIDENT_CONTEXT },
    });

    expect(second).not.toBeNull();
    expect(second?.metadata?.gatewayOutcome).toBe("cache_hit");
    expect(second?.metadata?.fallbackPath).toBe("cache_hit");
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("aislamiento tenant: cache key incluye tenantId", async () => {
    const queryMock = vi
      .fn<BuildingOSReadOnlyQueryGateway["query"]>()
      .mockResolvedValue({
        answer: "gateway-answer",
        metadata: {
          amount: 12500.75,
          currency: "ARS",
          asOf: "2026-04-29",
        },
      });

    const adapter = new BuildingOSAdapter({
      readOnlyQueryGateway: { query: queryMock },
    });

    await adapter.resolveDataBackedAnswer({
      question: "cuanto debo hoy en mi unidad",
      context: { ...RESIDENT_CONTEXT, tenantId: "tenant-1" },
    });
    await adapter.resolveDataBackedAnswer({
      question: "cuanto debo hoy en mi unidad",
      context: { ...RESIDENT_CONTEXT, tenantId: "tenant-2" },
    });

    expect(queryMock).toHaveBeenCalledTimes(2);
  });

  it("ADMIN enforcement ON + tool null => respuesta controlada sin fallbacks libres", async () => {
    process.env.ASSISTANT_P0_ENFORCEMENT_ENABLED = "true";

    const queryMock = vi
      .fn<BuildingOSReadOnlyQueryGateway["query"]>()
      .mockResolvedValue(null);

    const adapter = new BuildingOSAdapter({
      readOnlyQueryGateway: { query: queryMock },
    });

    const result = await adapter.resolveDataBackedAnswer({
      question: "cual es la deuda total del edificio hoy",
      context: { ...ADMIN_CONTEXT },
    });

    expect(result).not.toBeNull();
    expect(result?.metadata?.gatewayOutcome).toBe("null");
    expect(result?.metadata?.fallbackPath).toBe("intent_library_tool_null");
    expect(result?.metadata?.intentLibraryMatched).toBe(true);
    expect(result?.answer).toContain("No encontré datos operativos");
    expect(queryMock).toHaveBeenCalledTimes(1);
  });
});
