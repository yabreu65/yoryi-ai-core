import { describe, expect, it, vi } from "vitest";
import type { ResolvedAssistantContext } from "@yoryi/ai-types";
import type { BuildingOSReadOnlyQueryGateway } from "../buildingos-readonly-query.gateway";
import { BuildingOSAdapter } from "../buildingos.adapter";

const ADMIN_CONTEXT: ResolvedAssistantContext = {
  appId: "buildingos",
  tenantId: "tenant-1",
  userId: "admin-1",
  role: "TENANT_ADMIN",
  route: "/tenant/finanzas",
  currentModule: "charges",
  permissions: ["charges.read", "payments.read"],
  extra: { buildingId: "EDIF-1" },
};

describe("Intent Library defaults hardening", () => {
  it("snapshot families default period to current snapshot and recalculate missingEntities", async () => {
    const queryMock = vi.fn<BuildingOSReadOnlyQueryGateway["query"]>().mockResolvedValue({
      answer: "ok",
      metadata: { amount: 1000, overdueAmount: 0, asOf: "2026-04-30", currency: "ARS" },
    });
    const context = { ...ADMIN_CONTEXT, extra: { buildingId: "EDIF-1" } };
    const adapter = new BuildingOSAdapter({ readOnlyQueryGateway: { query: queryMock } });

    const result = await adapter.resolveDataBackedAnswer({
      question: "cuanta deuda total tiene el edificio",
      context,
    });

    expect(result).not.toBeNull();
    expect(result?.metadata?.familyChosen).toBe("TOTAL");
    expect(result?.metadata?.defaultsApplied).toContain("period");
    expect(result?.metadata?.missingEntities).toEqual([]);
    expect(context.extra?.period).toBe("today");
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("TREND defaults period to documented current YYYY-MM range", () => {
    const adapter = new BuildingOSAdapter();
    const context = { ...ADMIN_CONTEXT, extra: { buildingId: "EDIF-1" } };

    const result = (adapter as any).applyMissingEntityDefaults(
      "GET_BUILDING_DEBT_TREND",
      ["period"],
      context
    );

    expect(result.remaining).toEqual([]);
    expect(result.applied).toEqual(["period"]);
    expect(context.extra?.period).toMatch(/^\d{4}-\d{2}$/);
  });

  it("does not execute tools when missing entities remain after defaults", async () => {
    const queryMock = vi.fn<BuildingOSReadOnlyQueryGateway["query"]>().mockResolvedValue({ answer: "unexpected" });
    const adapter = new BuildingOSAdapter({ readOnlyQueryGateway: { query: queryMock } });

    const result = await adapter.resolveDataBackedAnswer({
      question: "cuanto debo hoy",
      context: {
        appId: "buildingos",
        tenantId: "tenant-1",
        userId: "resident-1",
        role: "RESIDENT",
        route: "/resident/finanzas",
        currentModule: "charges",
        permissions: ["charges.read", "payments.read"],
        extra: { buildingId: "EDIF-1" },
      },
    });

    expect(result).not.toBeNull();
    expect(result?.metadata?.gatewayOutcome).toBe("missing_entities");
    expect(result?.metadata?.missingEntities).toContain("unitId");
    expect(queryMock).not.toHaveBeenCalled();
  });
});
