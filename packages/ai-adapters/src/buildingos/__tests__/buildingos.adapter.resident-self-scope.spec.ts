import { describe, expect, it, vi } from "vitest";
import type { ResolvedAssistantContext } from "@yoryi/ai-types";
import type { BuildingOSReadOnlyQueryGateway } from "../buildingos-readonly-query.gateway";
import { BuildingOSAdapter } from "../buildingos.adapter";

const RESIDENT_CONTEXT: ResolvedAssistantContext = {
  appId: "buildingos",
  tenantId: "tenant-pr2-resident",
  userId: "resident-1203",
  role: "RESIDENT",
  route: "/resident",
  currentModule: "payments",
  permissions: [
    "charges.read",
    "payments.read",
    "tickets.read",
    "communications.read",
    "documents.read",
  ],
  extra: {
    unitId: "A-1203",
    buildingId: "Torre-A",
  },
};

function createGatewayMock() {
  return vi.fn<BuildingOSReadOnlyQueryGateway["query"]>().mockResolvedValue({
    answer: "gateway-answer",
    metadata: {
      amount: 12500,
      overdueAmount: 3000,
      currency: "ARS",
      asOf: "2026-05-01",
      status: "operativo",
      pendingCount: 1,
      pendingAmount: 2500,
      paymentsWithoutProof: 1,
      lastDetectedAt: "2026-04-29",
      lastPaymentDate: "2026-04-20",
      lastPaymentAmount: 9800,
      receiptNumber: "R-001",
    },
  });
}

describe("BuildingOSAdapter RESIDENT self-scope", () => {
  it("permite consultar deuda propia y envía scope de la unidad del contexto", async () => {
    const queryMock = createGatewayMock();
    const adapter = new BuildingOSAdapter({
      readOnlyQueryGateway: { query: queryMock },
    });

    const result = await adapter.resolveDataBackedAnswer({
      question: "cuanto debo hoy en mi unidad",
      context: { ...RESIDENT_CONTEXT },
    });

    expect(result).not.toBeNull();
    expect(result?.metadata?.resolvedIntentCode).toBe("GET_UNIT_DEBT");
    expect(result?.metadata?.gatewayOutcome).toBe("cache_miss");
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0]?.[0]?.toolName).toBe("get_unit_balance");
    expect(queryMock.mock.calls[0]?.[0]?.toolInput).toMatchObject({
      unitId: "A-1203",
      userId: "resident-1203",
    });
  });

  it("resuelve 'cuánto debo' como deuda propia self-scope", async () => {
    const queryMock = createGatewayMock();
    const adapter = new BuildingOSAdapter({
      readOnlyQueryGateway: { query: queryMock },
    });

    const result = await adapter.resolveDataBackedAnswer({
      question: "cuánto debo",
      context: { ...RESIDENT_CONTEXT },
    });

    expect(result).not.toBeNull();
    expect(result?.metadata?.resolvedIntentCode).toBe("GET_UNIT_DEBT");
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0]?.[0]?.toolName).toBe("get_unit_balance");
    expect(queryMock.mock.calls[0]?.[0]?.toolInput).toMatchObject({
      scope: "self",
      unitId: "A-1203",
      userId: "resident-1203",
    });
  });

  it("bloquea consulta de otra unidad y no ejecuta tools", async () => {
    const queryMock = createGatewayMock();
    const adapter = new BuildingOSAdapter({
      readOnlyQueryGateway: { query: queryMock },
    });

    const result = await adapter.resolveDataBackedAnswer({
      question: "cuanto debe la unidad B-0902",
      context: { ...RESIDENT_CONTEXT },
    });

    expect(result).not.toBeNull();
    expect(result?.metadata?.gatewayOutcome).toBe("denied");
    expect(result?.metadata?.fallbackPath).toBe("blocked_rbac");
    expect(result?.metadata?.authorizationDenied).toBe(true);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("bloquea agregados administrativos de deuda para RESIDENT", async () => {
    const queryMock = createGatewayMock();
    const adapter = new BuildingOSAdapter({
      readOnlyQueryGateway: { query: queryMock },
    });

    const result = await adapter.resolveDataBackedAnswer({
      question: "top 10 deudores del edificio",
      context: { ...RESIDENT_CONTEXT },
    });

    expect(result).not.toBeNull();
    expect(result?.metadata?.gatewayOutcome).toBe("denied");
    expect(result?.metadata?.fallbackPath).toBe("blocked_rbac");
    expect(result?.metadata?.authorizationDenied).toBe(true);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("bloquea tools agregadas internas aunque el intent tenga audience BOTH", async () => {
    const queryMock = createGatewayMock();
    const adapter = new BuildingOSAdapter({
      readOnlyQueryGateway: { query: queryMock },
    });

    const result = await adapter.resolveDataBackedAnswer({
      question: "analisis aging para deuda pendiente",
      context: { ...RESIDENT_CONTEXT },
    });

    expect(result).not.toBeNull();
    expect(result?.metadata?.gatewayOutcome).toBe("denied");
    expect(result?.metadata?.fallbackPath).toBe("blocked_rbac");
    expect(result?.metadata?.authorizationDenied).toBe(true);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("permite último pago propio con scope de usuario", async () => {
    const queryMock = createGatewayMock();
    const adapter = new BuildingOSAdapter({
      readOnlyQueryGateway: { query: queryMock },
    });

    const result = await adapter.resolveDataBackedAnswer({
      question: "cual fue mi ultimo pago registrado",
      context: { ...RESIDENT_CONTEXT },
    });

    expect(result).not.toBeNull();
    expect(result?.metadata?.resolvedIntentCode).toBe("GET_LAST_PAYMENT");
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0]?.[0]?.toolName).toBe("get_unit_payments");
    expect(queryMock.mock.calls[0]?.[0]?.toolInput).toMatchObject({
      userId: "resident-1203",
    });
  });

  it("permite comprobantes propios sin abrir búsqueda agregada", async () => {
    const queryMock = createGatewayMock();
    const adapter = new BuildingOSAdapter({
      readOnlyQueryGateway: { query: queryMock },
    });

    const result = await adapter.resolveDataBackedAnswer({
      question: "faltan comprobantes en mis pagos",
      context: { ...RESIDENT_CONTEXT },
    });

    expect(result).not.toBeNull();
    expect(result?.metadata?.resolvedIntentCode).toBe("GET_PAYMENTS_WITHOUT_PROOF");
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0]?.[0]?.toolName).toBe("search_payments");
    expect(queryMock.mock.calls[0]?.[0]?.toolInput).toMatchObject({
      userId: "resident-1203",
    });
  });

  it("scopea estado de reclamos de RESIDENT al usuario/unidad del contexto", async () => {
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
      userId: "resident-1203",
      unitId: "A-1203",
      scope: "self",
    });
  });

  it("mantiene comunicados/documentos como navegación permitida pero no habilita vistas agregadas", async () => {
    const adapter = new BuildingOSAdapter();

    const actions = await adapter.getAvailableActions({ ...RESIDENT_CONTEXT });
    const keys = actions.map((action) => action.key);

    expect(keys).toContain("view-notices");
    expect(keys).toContain("view-building-documents");
    expect(keys).not.toContain("view-all-communications");
    expect(keys).not.toContain("view-all-payments");
  });
});
