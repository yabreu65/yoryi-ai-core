import { describe, expect, it } from "vitest";
import { matchIntent } from "../intent-library/intent-matcher";

describe("Intent matcher families", () => {
  it("routes Top 10 deudores to TOP_N and never BREAKDOWN", () => {
    const result = matchIntent({ question: "top 10 deudores del edificio", role: "TENANT_ADMIN" });

    expect(result).not.toBeNull();
    expect(result?.intentCode).toBe("UNIT_DEBT_OCCUPANCY");
    expect(result?.familyChosen).toBe("TOP_N");
    expect(result?.topCandidates.some((candidate) => candidate.family === "BREAKDOWN")).toBe(false);
  });

  it("routes deuda por torre to BREAKDOWN", () => {
    const result = matchIntent({ question: "deuda por torre del edificio", role: "TENANT_ADMIN" });

    expect(result).not.toBeNull();
    expect(result?.familyChosen).toBe("BREAKDOWN");
    expect(result?.intentCode).toBe("GET_DEBT_BY_TOWER");
  });

  it("routes deuda total to TOTAL", () => {
    const result = matchIntent({ question: "deuda total del edificio hoy", role: "TENANT_ADMIN" });

    expect(result).not.toBeNull();
    expect(result?.familyChosen).toBe("TOTAL");
    expect(result?.intentCode).toBe("GET_BUILDING_DEBT_TOTAL");
  });

  it("routes evolucion ultimos meses to TREND", () => {
    const result = matchIntent({ question: "evolucion de deuda ultimos meses", role: "TENANT_ADMIN" });

    expect(result).not.toBeNull();
    expect(result?.familyChosen).toBe("TREND");
  });
});
