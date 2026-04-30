import { describe, expect, it } from "vitest";
import { matchIntent } from "../intent-library/intent-matcher";

describe("Intent matcher v1 (P0/P1)", () => {
  it("A) exact utterance maps to correct intent with high confidence", () => {
    const result = matchIntent({
      question: "cual fue mi ultimo pago registrado",
      role: "RESIDENT",
    });

    expect(result).not.toBeNull();
    expect(result?.intentCode).toBe("GET_LAST_PAYMENT");
    expect(result!.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it("B) variantes de deuda unidad mapean a GET_UNIT_DEBT con confidence >= 0.85", () => {
    const variants = [
      "cuanto debo hoy en mi unidad",
      "cuanto debo en mi unidad ahora",
    ];

    for (const question of variants) {
      const result = matchIntent({ question, role: "RESIDENT" });
      expect(result, `No match for: ${question}`).not.toBeNull();
      expect(result?.intentCode, `Wrong intent for: ${question}`).toBe("GET_UNIT_DEBT");
      expect(result!.confidence, `Low confidence for: ${question}`).toBeGreaterThanOrEqual(0.85);
    }
  });

  it("C) pregunta ambigua cae en banda 0.70-0.85 con topCandidates", () => {
    const result = matchIntent({
      question: "quiero revisar pagos y comprobantes",
      role: "RESIDENT",
    });

    expect(result).not.toBeNull();
    expect(result!.confidence).toBeGreaterThanOrEqual(0.7);
    expect(result!.confidence).toBeLessThan(0.85);
    expect(result!.topCandidates.length).toBeGreaterThanOrEqual(2);
  });

  it("D) pregunta fuera de dominio devuelve null o confidence < 0.70", () => {
    const result = matchIntent({
      question: "como esta el clima hoy en buenos aires",
      role: "RESIDENT",
    });

    if (result) {
      expect(result.confidence).toBeLessThan(0.7);
      return;
    }

    expect(result).toBeNull();
  });

  it("prints 5 ejemplos reales (input → intent + confidence)", () => {
    const examples = [
      "cuanto debo hoy en mi unidad",
      "tengo deuda vencida en mi unidad",
      "cual fue mi ultimo pago registrado",
      "estado de cuenta del periodo actual",
      "quiero revisar pagos y comprobantes",
    ];

    for (const question of examples) {
      const result = matchIntent({ question, role: "RESIDENT" });
      // Requerido por PR: ejemplos impresos por test/script
      console.log(
        `[intent-matcher-example] ${question} -> ${result?.intentCode ?? "NO_MATCH"} (${result?.confidence ?? 0})`
      );
    }

    expect(examples).toHaveLength(5);
  });
});
