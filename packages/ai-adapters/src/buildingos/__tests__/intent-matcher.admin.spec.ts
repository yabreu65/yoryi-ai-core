import { describe, expect, it } from "vitest";
import { matchIntent } from "../intent-library/intent-matcher";

type AdminMatcherCase = {
  id: string;
  question: string;
  expectedIntent: string | null;
  minConfidence: number;
};

const ADMIN_MATCHER_CASES: AdminMatcherCase[] = [
  { id: "ADM-001", question: "cual es la deuda total del edificio hoy", expectedIntent: "GET_BUILDING_DEBT_TOTAL", minConfidence: 0.85 },
  { id: "ADM-002", question: "mostrar saldo total adeudado del consorcio", expectedIntent: "GET_BUILDING_DEBT_TOTAL", minConfidence: 0.85 },
  { id: "ADM-003", question: "mostrar morosidad de unidades vencidas del edificio", expectedIntent: "GET_UNIT_OVERDUE_TREND", minConfidence: 0.85 },
  { id: "ADM-004", question: "panel operativo de vencidos por unidad", expectedIntent: "GET_UNIT_OVERDUE_TREND", minConfidence: 0.85 },
  { id: "ADM-005", question: "necesito top deudores del edificio", expectedIntent: "UNIT_DEBT_OCCUPANCY", minConfidence: 0.85 },
  { id: "ADM-006", question: "ranking de unidades mas deudoras hoy", expectedIntent: "UNIT_DEBT_OCCUPANCY", minConfidence: 0.85 },
  { id: "ADM-007", question: "deuda vencida por torre del edificio", expectedIntent: "GET_DEBT_BY_TOWER", minConfidence: 0.85 },
  { id: "ADM-008", question: "comparar deuda entre torres del edificio", expectedIntent: "GET_DEBT_BY_TOWER", minConfidence: 0.85 },
  { id: "ADM-009", question: "aging de deuda del edificio por buckets", expectedIntent: "DEBT_AGING_BY_BUILDING", minConfidence: 0.85 },
  { id: "ADM-010", question: "distribucion de deuda 0 30 31 60 61 90 90 mas", expectedIntent: null, minConfidence: 0 },
  { id: "ADM-011", question: "ultimo pago recibido global del edificio", expectedIntent: null, minConfidence: 0 },
  { id: "ADM-012", question: "ultimo pago confirmado en torre a", expectedIntent: null, minConfidence: 0 },
  { id: "ADM-013", question: "tendencia de morosidad del edificio ultimos meses", expectedIntent: "GET_BUILDING_OVERDUE_TREND", minConfidence: 0.85 },
  { id: "ADM-014", question: "variacion mensual de morosidad edificio", expectedIntent: "GET_BUILDING_OVERDUE_TREND", minConfidence: 0.85 },
  { id: "ADM-015", question: "tendencia de deuda del edificio en el ultimo ano", expectedIntent: "GET_BUILDING_TREND_LAST_YEAR", minConfidence: 0.85 },
  { id: "ADM-016", question: "analisis de deuda ultimos 12 meses building", expectedIntent: "GET_BUILDING_TREND_LAST_YEAR", minConfidence: 0.85 },
  { id: "ADM-017", question: "tendencia deuda ultimos n meses del edificio", expectedIntent: "GET_12MONTH_TREND", minConfidence: 0.85 },
  { id: "ADM-018", question: "balance por periodo del edificio cobrado vs pendiente", expectedIntent: "GET_COLLECTIONS_TREND", minConfidence: 0.85 },
  { id: "ADM-019", question: "comparar torre a vs torre b en morosidad y cobro", expectedIntent: null, minConfidence: 0 },
  { id: "ADM-020", question: "unidades con mayor crecimiento de deuda", expectedIntent: "GET_UNIT_CHARGED_TREND", minConfidence: 0.85 },
];

describe("Intent matcher ADMIN coverage", () => {
  it("matches ADMIN payment cases and keeps known no-match edge case", () => {
    for (const testCase of ADMIN_MATCHER_CASES) {
      const result = matchIntent({ question: testCase.question, role: "ADMIN" });
      if (testCase.expectedIntent === null) {
        expect(result, `[${testCase.id}] should not match under current semantics`).toBeNull();
        continue;
      }
      expect(result, `[${testCase.id}] should match`).not.toBeNull();
      expect(result?.intentCode, `[${testCase.id}] wrong intent`).toBe(
        testCase.expectedIntent
      );
      expect(result?.confidence ?? 0, `[${testCase.id}] low confidence`).toBeGreaterThanOrEqual(
        testCase.minConfidence
      );
    }
  });

  it("does not force ADMIN-only intents for RESIDENT role", () => {
    const result = matchIntent({
      question: "cual es la deuda total del edificio hoy",
      role: "RESIDENT",
    });

    expect(result?.intentCode).not.toBe("GET_BUILDING_DEBT_TOTAL");
  });
});
