import { describe, expect, it, vi } from "vitest";
import type { ResolvedAssistantContext } from "@yoryi/ai-types";
import type { BuildingOSReadOnlyQueryGateway } from "../buildingos-readonly-query.gateway";
import { BuildingOSAdapter } from "../buildingos.adapter";

const ADMIN_CONTEXT: ResolvedAssistantContext = {
  appId: "buildingos",
  tenantId: "tenant-mvp",
  userId: "admin-1",
  role: "TENANT_ADMIN",
  route: "/tenant/support",
  currentModule: "tickets",
  permissions: ["tickets.read", "charges.read", "payments.read"],
  extra: {
    buildingId: "EDIF-1",
  },
};

const RESIDENT_CONTEXT: ResolvedAssistantContext = {
  appId: "buildingos",
  tenantId: "tenant-mvp",
  userId: "resident-1",
  role: "RESIDENT",
  route: "/resident/tickets",
  currentModule: "tickets",
  permissions: ["tickets.read", "charges.read", "payments.read"],
  extra: {
    unitId: "A-1203",
    buildingId: "EDIF-1",
  },
};

function createGatewayMock() {
  return vi.fn<BuildingOSReadOnlyQueryGateway["query"]>().mockResolvedValue({
    answer: "tickets operativos",
    actions: [],
    metadata: {
      count: 2,
      status: ["OPEN", "IN_PROGRESS"],
    },
  });
}

describe("BuildingOSAdapter MVP tickets + HITL gates", () => {
  it("resuelve tickets ADMIN read-only contra search_tickets", async () => {
    const queryMock = createGatewayMock();
    const adapter = new BuildingOSAdapter({
      readOnlyQueryGateway: { query: queryMock },
    });

    const result = await adapter.resolveDataBackedAnswer({
      question: "mostrame tickets abiertos",
      context: { ...ADMIN_CONTEXT },
    });

    expect(result).not.toBeNull();
    expect(result?.metadata?.resolvedIntentCode).toBe("GET_OPEN_TICKETS");
    expect(result?.metadata?.gatewayOutcome).toBe("success");
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0]?.[0]?.toolName).toBe("search_tickets");
  });

  it("pide aclaración de edificio para ADMIN multi-building antes de ejecutar tickets", async () => {
    const queryMock = createGatewayMock();
    const adapter = new BuildingOSAdapter({
      readOnlyQueryGateway: { query: queryMock },
    });

    const result = await adapter.resolveDataBackedAnswer({
      question: "mostrame tickets abiertos",
      context: {
        ...ADMIN_CONTEXT,
        extra: {
          buildingCount: 2,
        },
      },
    });

    expect(result).not.toBeNull();
    expect(result?.metadata?.gatewayOutcome).toBe("missing_entities");
    expect(result?.metadata?.fallbackPath).toBe("aggregate_scope_required");
    expect(result?.metadata?.missingEntities).toContain("buildingId");
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("resuelve reclamos RESIDENT solo en self-scope", async () => {
    const queryMock = createGatewayMock();
    const adapter = new BuildingOSAdapter({
      readOnlyQueryGateway: { query: queryMock },
    });

    const result = await adapter.resolveDataBackedAnswer({
      question: "estado de mis reclamos abiertos",
      context: { ...RESIDENT_CONTEXT },
    });

    expect(result).not.toBeNull();
    expect(result?.metadata?.resolvedIntentCode).toBe("GET_OPEN_TICKETS");
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0]?.[0]?.toolName).toBe("search_tickets");
    expect(queryMock.mock.calls[0]?.[0]?.toolInput).toMatchObject({
      scope: "self",
      userId: "resident-1",
      unitId: "A-1203",
    });
  });

  it("bloquea reclamos agregados para RESIDENT y no deriva a HITL", async () => {
    const queryMock = createGatewayMock();
    const adapter = new BuildingOSAdapter({
      readOnlyQueryGateway: { query: queryMock },
    });

    const result = await adapter.resolveDataBackedAnswer({
      question: "quiero hablar con humano sobre reclamos del edificio",
      context: { ...RESIDENT_CONTEXT },
    });

    expect(result).not.toBeNull();
    expect(result?.metadata?.gatewayOutcome).toBe("denied");
    expect(result?.metadata?.fallbackPath).toBe("blocked_rbac");
    expect(result?.metadata?.authorizationDenied).toBe(true);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("activa HITL como gate operacional para reclamo urgente self-scope sin ejecutar tools", async () => {
    const queryMock = createGatewayMock();
    const adapter = new BuildingOSAdapter({
      readOnlyQueryGateway: { query: queryMock },
    });

    const result = await adapter.resolveDataBackedAnswer({
      question: "necesito hablar con un humano por un reclamo urgente de mi unidad",
      context: { ...RESIDENT_CONTEXT },
    });

    expect(result).not.toBeNull();
    expect(result?.metadata?.fallbackPath).toBe("hitl_created");
    expect(result?.metadata?.gatewayOutcome).toBe("unavailable");
    expect(result?.metadata?.resolvedLevel).toBe("FALLBACK");
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("HITL no reemplaza RBAC cuando el rol no tiene permiso de tickets", async () => {
    const queryMock = createGatewayMock();
    const adapter = new BuildingOSAdapter({
      readOnlyQueryGateway: { query: queryMock },
    });

    const result = await adapter.resolveDataBackedAnswer({
      question: "necesito hablar con un humano por un reclamo urgente de mi unidad",
      context: {
        ...RESIDENT_CONTEXT,
        permissions: ["charges.read", "payments.read"],
      },
    });

    expect(result).not.toBeNull();
    expect(result?.metadata?.gatewayOutcome).toBe("denied");
    expect(result?.metadata?.fallbackPath).toBe("blocked_rbac");
    expect(result?.metadata?.authorizationDenied).toBe(true);
    expect(queryMock).not.toHaveBeenCalled();
  });
});
