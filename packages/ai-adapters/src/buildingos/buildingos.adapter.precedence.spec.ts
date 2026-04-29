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
      question: "dashboard deuda vencida",
      context: ADMIN_CONTEXT,
    });

    expect(result).not.toBeNull();
    expect(result?.answer).toBe("P0 answer");
    expect(result?.metadata?.intentCode).toBe("GET_OVERDUE_UNITS");
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
      question: "deuda vencida del edificio",
      context: ADMIN_CONTEXT,
    });

    expect(result).not.toBeNull();
    expect(result?.metadata?.p0Routed).toBe(true);
    expect(result?.metadata?.gatewayUnavailable).toBe(true);
    expect(result?.answer).toContain("Necesito una aclaracion");
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
});
