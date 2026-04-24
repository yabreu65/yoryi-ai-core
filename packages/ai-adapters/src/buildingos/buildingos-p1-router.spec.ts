import { describe, expect, it, beforeEach } from "vitest";
import { BuildingOSP1Router } from "./buildingos-p1-router";

describe("BuildingOSP1Router", () => {
  let router: BuildingOSP1Router;

  beforeEach(() => {
    router = new BuildingOSP1Router();
  });

  it("routes overdue debt without unit to overdue defaults", () => {
    const result = router.route("Necesito ver la deuda vencida del edificio");
    expect(result).not.toBeNull();
    expect(result?.intentCode).toBe("GET_OVERDUE_UNITS");
    expect(result?.toolName).toBe("search_payments");
    expect(result?.toolInput.status).toEqual(["OVERDUE"]);
    expect(result?.toolInput.ranking).toBe(5);
  });

  it("routes rejected today question to search_payments with REJECTED status", () => {
    const result = router.route("Pagos rechazados hoy");
    expect(result).not.toBeNull();
    expect(result?.intentCode).toBe("GET_REJECTED_TODAY");
    expect(result?.toolName).toBe("search_payments");
    expect(result?.toolInput.status).toContain("REJECTED");
  });

  it("routes payments without proof to hasProof=false filter", () => {
    const result = router.route("Pagos sin comprobante");
    expect(result).not.toBeNull();
    expect(result?.intentCode).toBe("GET_PAYMENTS_WITHOUT_PROOF");
    expect(result?.toolInput.hasProof).toBe(false);
  });

  it("routes last payment question to get_unit_payments", () => {
    const result = router.route("Ultimo pago del departamento");
    expect(result).not.toBeNull();
    expect(result?.intentCode).toBe("GET_LAST_PAYMENT");
    expect(result?.toolName).toBe("get_unit_payments");
    expect(result?.toolInput.ranking).toBe(1);
  });

  it("routes aging question to analytics_debt_aging", () => {
    const result = router.route("Antigüedad de la deuda");
    expect(result).not.toBeNull();
    expect(result?.intentCode).toBe("GET_DEBT_AGING");
    expect(result?.toolName).toBe("analytics_debt_aging");
    expect(result?.toolInput.asOf).toBe("{today}");
  });

  it("routes debt by tower question to analytics_debt_by_tower", () => {
    const result = router.route("Deuda por edificio");
    expect(result).not.toBeNull();
    expect(result?.intentCode).toBe("GET_DEBT_BY_TOWER");
    expect(result?.toolName).toBe("analytics_debt_by_tower");
  });

  it("routes urgent unassigned tickets to search_tickets", () => {
    const result = router.route("Tickets urgentes sin asignar");
    expect(result).not.toBeNull();
    expect(result?.intentCode).toBe("GET_URGENT_UNASSIGNED_TICKETS");
    expect(result?.toolName).toBe("search_tickets");
    expect(result?.toolInput.priority).toContain("HIGH");
    expect(result?.toolInput.assigned).toBe(false);
  });

  it("routes tickets questions to search_tickets", () => {
    const result = router.route("Mostrame tickets abiertos");
    expect(result?.intentCode).toBe("GET_OPEN_TICKETS");
    expect(result?.toolName).toBe("search_tickets");
  });

  it("builds clarification for ambiguous questions", () => {
    const clarification = router.buildClarification("estado general");
    expect(clarification.options.length).toBeLessThanOrEqual(2);
    expect(clarification.answer).toContain("1)");
  });

  it("applies ranking default from manifest", () => {
    const result = router.route("Morosos");
    expect(result?.toolInput.ranking).toBe(5);
  });

  it("applies periodsBack default from manifest for historical queries", () => {
    const result = router.route("Evolución de saldo por período");
    expect(result?.intentCode).toBe("GET_UNIT_BALANCE_BY_PERIOD");
    expect(result?.toolInput.periodsBack).toBe(3);
    expect(result?.toolInput.includeCurrent).toBe(false);
  });

  it("returns null for unknown questions", () => {
    const result = router.route("something completely random xyz123");
    expect(result).toBeNull();
  });

  it("filters by status array without mode parameter", () => {
    const result = router.route("Pagos pendientes");
    expect(result).not.toBeNull();
    expect(result?.toolName).toBe("search_payments");
    expect(result?.toolInput.status).toContain("SUBMITTED");
    expect(result?.toolInput).not.toHaveProperty("mode");
  });
});

describe("BuildingOSP1Router - Contract Tests", () => {
  let router: BuildingOSP1Router;

  beforeEach(() => {
    router = new BuildingOSP1Router();
  });

  it("happy route: resolves all required fields for GET_OVERDUE_UNITS", () => {
    const result = router.route("Ver unidades morosas");
    expect(result).not.toBeNull();
    expect(result?.intentCode).toBeDefined();
    expect(result?.toolName).toBeDefined();
    expect(result?.toolInput).toBeDefined();
    expect(result?.score).toBeGreaterThan(0);
  });

  it("no-data: handles unknown intent gracefully", () => {
    const result = router.route("consulta inventada xyz987");
    expect(result).toBeNull();
  });

  it("ambiguity: generates clarification with options", () => {
    const clarification = router.buildClarification("reporte financiero");
    expect(clarification.answer).toContain("Elegi una opcion");
    expect(clarification.options.length).toBeGreaterThan(0);
  });

  it("role-denied: returns null for unauthorized routes (routing only, not RBAC)", () => {
    const result = router.route("estadisticas internas");
    expect(result).toBeNull();
  });

  it("tenant isolation: router does not handle tenant context", () => {
    const result = router.route("deuda del tenant abc123");
    expect(result?.toolInput).not.toHaveProperty("tenantId");
  });

  it("no intent by filter: same intent different filters works correctly", () => {
    const result1 = router.route("Pagos rechazados");
    const result2 = router.route("Pagos pendientes");
    
    expect(result1?.intentCode).not.toBe(result2?.intentCode);
    expect(result1?.toolInput.status).not.toEqual(result2?.toolInput.status);
  });
});