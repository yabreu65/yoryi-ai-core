import { describe, expect, it } from "vitest";
import { BuildingOSP0Router } from "./buildingos-p0-router";

describe("BuildingOSP0Router", () => {
  const router = new BuildingOSP0Router();

  it("routes debt without unit to overdue defaults", () => {
    const result = router.route("Necesito ver la deuda vencida del edificio");
    expect(result).not.toBeNull();
    expect(result?.intentCode).toBe("GET_OVERDUE_UNITS");
    expect(result?.toolName).toBe("search_payments");
    expect(result?.toolInput.status).toBe("OVERDUE");
    expect(result?.toolInput.ranking).toBe(5);
  });

  it("routes tickets questions to search_tickets", () => {
    const result = router.route("Mostrame tickets abiertos");
    expect(result?.intentCode).toBe("GET_OPEN_TICKETS");
    expect(result?.toolName).toBe("search_tickets");
  });

  it("builds at most two clarification options", () => {
    const clarification = router.buildClarification("estado general");
    expect(clarification.options.length).toBeLessThanOrEqual(2);
    expect(clarification.answer).toContain("1)");
  });

  it("applies routing precedence to strongest keyword match", () => {
    const result = router.route("Mostrame tickets abiertos y en progreso");
    expect(result?.intentCode).toBe("GET_OPEN_TICKETS");
    expect(result?.toolName).toBe("search_tickets");
  });
});
