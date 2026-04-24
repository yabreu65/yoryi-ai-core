import { describe, it, expect, beforeEach, vi } from "vitest";
import { BuildingOSAdapter } from "./buildingos.adapter";
import type { ResolvedAssistantContext } from "@yoryi/ai-types";
import { getBuildingOSIntentDefinition } from "./buildingos-intent-registry";

describe("BuildingOS Admin Chat Fallback - Debug", () => {
  let adapter: BuildingOSAdapter;

  beforeEach(() => {
    adapter = new BuildingOSAdapter({
      readOnlyQueryGateway: {
        query: vi.fn().mockResolvedValue({
          answer: "Hay 12 unidades morosas en el edificio.",
          actions: [],
          metadata: { responseType: "list" },
        }),
      },
    });
  });

  it("should classify morosas question as GET_OVERDUE_UNITS", async () => {
    const result = await adapter.resolveDataBackedAnswer({
      question: "¿Cuántas unidades morosas hay?",
      context: {
        appId: "buildingos",
        tenantId: "test-tenant",
        userId: "test-user",
        role: "TENANT_ADMIN",
        permissions: ["buildings.read", "units.read", "charges.read"],
        route: "/charges",
      } as unknown as ResolvedAssistantContext,
    });

    console.log("Result:", JSON.stringify(result, null, 2));
    expect(result?.metadata?.intentCode).toBe("GET_OVERDUE_UNITS");
    expect(result?.answer).toContain("unidades morosas");
  });

  it("should work with exact unit debt query", async () => {
    const result = await adapter.resolveDataBackedAnswer({
      question: "La unidad 123 cuánto debe",
      context: {
        appId: "buildingos",
        tenantId: "test-tenant",
        userId: "test-user",
        role: "TENANT_ADMIN",
        permissions: ["buildings.read", "units.read", "charges.read"],
        route: "/charges",
      } as unknown as ResolvedAssistantContext,
    });

    console.log("Unit debt result:", JSON.stringify(result, null, 2));
  });

  it("should NOT return null for TENANT_ADMIN with correct permissions", async () => {
    const context = {
      appId: "buildingos",
      tenantId: "test-tenant",
      userId: "test-user",
      role: "TENANT_ADMIN",
      permissions: ["buildings.read", "units.read", "charges.read"],
      route: "/charges",
    } as unknown as ResolvedAssistantContext;

    const result = await adapter.resolveDataBackedAnswer({
      question: "¿Cuántas unidades morosas hay?",
      context,
    });

    console.log("Full context test result:", JSON.stringify(result, null, 2));
    expect(result).not.toBeNull();
    expect(result?.answer).toBeDefined();
  });
});