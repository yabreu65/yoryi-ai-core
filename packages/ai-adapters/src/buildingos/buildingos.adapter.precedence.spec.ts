import { afterEach, describe, expect, it } from "vitest";
import type { ResolvedAssistantContext } from "@yoryi/ai-types";
import type { BuildingOSReadOnlyQueryGateway } from "./buildingos-readonly-query.gateway";
import { BuildingOSAdapter } from "./buildingos.adapter";

const ADMIN_CONTEXT: ResolvedAssistantContext = {
  appId: "buildingos",
  tenantId: "tenant-1",
  userId: "admin-1",
  role: "TENANT_ADMIN",
  route: "/tenant/dashboard",
  currentModule: "general",
  permissions: [
    "charges.read",
    "units.read",
    "payments.read",
    "buildings.read",
    "tickets.read",
  ],
  extra: {
    buildingId: "EDIF-1",
    period: "2026-04",
    unitId: "A-1203",
  },
};

const RESIDENT_CONTEXT: ResolvedAssistantContext = {
  appId: "buildingos",
  tenantId: "tenant-1",
  userId: "resident-1",
  role: "RESIDENT",
  route: "/resident/payments",
  currentModule: "payments",
  permissions: ["charges.read", "payments.read"],
};

describe("BuildingOSAdapter routing precedence", () => {
  const originalP0Enforcement = process.env.ASSISTANT_P0_ENFORCEMENT_ENABLED;
  const originalP3Enabled = process.env.ASSISTANT_P3_ENABLED;
  const originalCanaryTenants = process.env.ASSISTANT_YORYI_CANARY_TENANTS;

  afterEach(() => {
    process.env.ASSISTANT_P0_ENFORCEMENT_ENABLED = originalP0Enforcement;
    process.env.ASSISTANT_P3_ENABLED = originalP3Enabled;
    process.env.ASSISTANT_YORYI_CANARY_TENANTS = originalCanaryTenants;
  });

  it("Case A: when P0 and P3 match, resolves P0 first", async () => {
    const calls: Array<{ intentCode: string; toolName?: string | null }> = [];
    const readOnlyQueryGateway: BuildingOSReadOnlyQueryGateway = {
      query: async (input) => {
        calls.push({ intentCode: input.intentCode, toolName: input.toolName ?? null });
        if (input.intentCode === "GET_OVERDUE_UNITS") {
          return { answer: "P0 answer" };
        }
        if (input.intentCode === "CROSS_QUERY") {
          return { answer: "P3 answer" };
        }
        return { answer: "unexpected" };
      },
    };

    const adapter = new BuildingOSAdapter({ readOnlyQueryGateway });

    const result = await adapter.resolveDataBackedAnswer({
      question: "tengo deuda vencida en mi unidad",
      context: ADMIN_CONTEXT,
    });

    expect(result).not.toBeNull();
    expect(result?.answer).toContain("deuda vencida");
    expect(result?.metadata?.intentCode).toBe("GET_OVERDUE_UNITS");
    expect(result?.metadata?.resolvedLevel).toBe("P0");
    expect(typeof result?.metadata?.traceId).toBe("string");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.intentCode).toBe("GET_OVERDUE_UNITS");
  });

  it("Case B: when P1 and P3 match, resolves P1 first", async () => {
    const calls: Array<{ intentCode: string; toolName?: string | null }> = [];
    const readOnlyQueryGateway: BuildingOSReadOnlyQueryGateway = {
      query: async (input) => {
        calls.push({ intentCode: input.intentCode, toolName: input.toolName ?? null });
        if (input.intentCode === "GET_LAST_PAYMENT") {
          return { answer: "P1 answer" };
        }
        if (input.intentCode === "CROSS_QUERY") {
          return { answer: "P3 answer" };
        }
        return { answer: "unexpected" };
      },
    };

    const adapter = new BuildingOSAdapter({ readOnlyQueryGateway });

    const result = await adapter.resolveDataBackedAnswer({
      question: "dashboard ultimo pago de la unidad A-1203 torre A",
      context: ADMIN_CONTEXT,
    });

    expect(result).not.toBeNull();
    expect(result?.answer).toBe("P1 answer");
    expect(result?.metadata?.intentCode).toBe("GET_LAST_PAYMENT");
    expect(result?.metadata?.resolvedLevel).toBe("P1");
    expect(typeof result?.metadata?.traceId).toBe("string");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.intentCode).toBe("GET_LAST_PAYMENT");
  });

  it("Case C: enforcement ON + P0 match + gateway null => controlled response, no classifier fallback", async () => {
    process.env.ASSISTANT_P0_ENFORCEMENT_ENABLED = "true";

    const calls: Array<{ intentCode: string; toolName?: string | null }> = [];
    const readOnlyQueryGateway: BuildingOSReadOnlyQueryGateway = {
      query: async (input) => {
        calls.push({ intentCode: input.intentCode, toolName: input.toolName ?? null });
        return null;
      },
    };

    const adapter = new BuildingOSAdapter({ readOnlyQueryGateway });

    const result = await adapter.resolveDataBackedAnswer({
      question: "tengo deuda vencida en mi unidad",
      context: ADMIN_CONTEXT,
    });

    expect(result).not.toBeNull();
    expect(result?.metadata?.p0Routed).toBe(true);
    expect(result?.metadata?.gatewayOutcome).toBe("null");
    expect(result?.metadata?.fallbackPath).toBe("intent_library_tool_null");
    expect(result?.answer).toContain("No encontré datos operativos");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.intentCode).toBe("GET_OVERDUE_UNITS");
  });

  it("Case D: P3 flag OFF does not evaluate P3 router branch", async () => {
    process.env.ASSISTANT_P3_ENABLED = "false";
    process.env.ASSISTANT_YORYI_CANARY_TENANTS = "tenant-1";

    const calls: Array<{ intentCode: string; toolName?: string | null }> = [];
    const readOnlyQueryGateway: BuildingOSReadOnlyQueryGateway = {
      query: async (input) => {
        calls.push({ intentCode: input.intentCode, toolName: input.toolName ?? null });
        return { answer: "unexpected" };
      },
    };

    const adapter = new BuildingOSAdapter({ readOnlyQueryGateway });

    const result = await adapter.resolveDataBackedAnswer({
      question: "dashboard ejecutivo",
      context: ADMIN_CONTEXT,
    });

    expect(result).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it("Case E: fallback payment clarification emits FALLBACK level metadata", async () => {
    const readOnlyQueryGateway: BuildingOSReadOnlyQueryGateway = {
      query: async () => ({ answer: "unexpected" }),
    };

    const adapter = new BuildingOSAdapter({ readOnlyQueryGateway });
    const result = await adapter.resolveDataBackedAnswer({
      question: "busca pagos",
      context: ADMIN_CONTEXT,
    });

    expect(result).not.toBeNull();
    expect(result?.metadata?.resolvedLevel).toBe("FALLBACK");
    expect(typeof result?.metadata?.traceId).toBe("string");
  });

  it("Case F: resident P0 intent can resolve through intent-library tool branch", async () => {
    const readOnlyQueryGateway: BuildingOSReadOnlyQueryGateway = {
      query: async () => ({
        answer: "mock",
        metadata: {
          amount: 1000,
          currency: "ARS",
          asOf: "2026-04-29",
          status: "al dia",
        },
      }),
    };
    const adapter = new BuildingOSAdapter({ readOnlyQueryGateway });
    const result = await adapter.resolveDataBackedAnswer({
      question: "cuanto debo hoy en mi unidad",
      context: {
        ...RESIDENT_CONTEXT,
        extra: {
          unitId: "A-1203",
          buildingId: "Torre-A",
        },
      },
    });

    expect(result).not.toBeNull();
    expect(result?.metadata?.resolvedLevel).toBe("P0");
    expect(result?.metadata?.gatewayOutcome).toBe("success");
    expect(result?.metadata?.fallbackPath).toBe("intent_library_tool_success");
    expect(result?.metadata?.intentLibraryMatched).toBe(true);
  });

  it("Case G: enforcement ON with no operational sources returns controlled P0 response", async () => {
    process.env.ASSISTANT_P0_ENFORCEMENT_ENABLED = "true";
    const adapter = new BuildingOSAdapter();
    const result = await adapter.resolveDataBackedAnswer({
      question: "top morosos",
      context: {
        ...ADMIN_CONTEXT,
        extra: {
          buildingId: "EDIF-1",
          period: "2026-04",
        },
      },
    });

    expect(result).not.toBeNull();
    expect(result?.answer).toContain("No pude confirmar datos operativos");
    expect(result?.metadata?.resolvedLevel).toBe("P0");
    expect(result?.metadata?.fallbackPath).toBe("intent_library_tool_error");
    expect(result?.metadata?.gatewayOutcome).toBe("error");
  });
});
