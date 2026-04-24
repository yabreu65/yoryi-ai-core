import { describe, expect, it } from "vitest";
import { BuildingOSIntentClassifier } from "./buildingos-intent-classifier";
import {
  getBuildingOSIntentDefinitions,
  resolveCanonicalIntentCode,
} from "./buildingos-intent-registry";

describe("BuildingOSIntentClassifier", () => {
  const classifier = new BuildingOSIntentClassifier();

  it("classifies one canonical intent for each primary intent family", () => {
    const checks: Array<{ question: string; expected: string }> = [
      {
        question: "¿Qué unidades tienen deuda vencida?",
        expected: "GET_OVERDUE_UNITS",
      },
      {
        question: "Mostrame pagos pendientes de aprobación",
        expected: "GET_PENDING_PAYMENTS",
      },
      {
        question: "¿Cuántos tickets abiertos hay?",
        expected: "GET_OPEN_TICKETS",
      },
      {
        question: "Quiero ver unidades vacantes",
        expected: "GET_VACANT_UNITS",
      },
      {
        question: "Dame un resumen de cobranzas del mes",
        expected: "GET_COLLECTIONS_SUMMARY",
      },
    ];

    for (const check of checks) {
      const result = classifier.classify(check.question);
      expect(result.intentCode).toBe(check.expected);
      expect(result.score).toBeGreaterThanOrEqual(0.44);
    }
  });

  it("returns NO_INTENT for short ambiguous prompts", () => {
    const result = classifier.classify("¿Y ahora?");

    expect(result.intentCode).toBeNull();
    expect(result.fallbackReason).toBeDefined();
  });
});

describe("buildingos intent registry", () => {
  it("contains at least 10 examples per intent", () => {
    for (const intent of getBuildingOSIntentDefinitions()) {
      expect(intent.examples.length).toBeGreaterThanOrEqual(10);
    }
  });

  it("maps legacy aliases to canonical intent codes", () => {
    expect(resolveCanonicalIntentCode(undefined, "admin_arrears_by_building")).toBe(
      "GET_OVERDUE_UNITS"
    );
    expect(resolveCanonicalIntentCode(undefined, "admin_pending_payments_month")).toBe(
      "GET_PENDING_PAYMENTS"
    );
    expect(resolveCanonicalIntentCode(undefined, "admin_open_tickets_by_building")).toBe(
      "GET_OPEN_TICKETS"
    );
    expect(resolveCanonicalIntentCode(undefined, "admin_vacant_units")).toBe(
      "GET_VACANT_UNITS"
    );
    expect(resolveCanonicalIntentCode(undefined, "admin_collections_summary_month")).toBe(
      "GET_COLLECTIONS_SUMMARY"
    );
  });
});
