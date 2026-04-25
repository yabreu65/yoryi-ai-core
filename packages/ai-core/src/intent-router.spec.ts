import { describe, expect, it } from "vitest";
import { ChatIntentRouter } from "./intent-router";

describe("ChatIntentRouter", () => {
  const router = new ChatIntentRouter();

  it("routes mutation requests to mutation_blocked in query-only mode", () => {
    const route = router.route({
      question: "aprueba este pago",
      queryOnly: true,
      currentModule: "payments",
    });

    expect(route).toBe("mutation_blocked");
  });

  it("allows how-to mutation questions to use knowledge in query-only mode", () => {
    const route = router.route({
      question: "¿Cómo crear unidades?",
      queryOnly: true,
      currentModule: "units",
    });

    expect(route).toBe("live_data_or_knowledge");
  });

  it("routes short non-specific prompts to ambiguous", () => {
    const route = router.route({
      question: "¿y eso?",
      queryOnly: true,
      currentModule: "general",
    });

    expect(route).toBe("ambiguous");
  });

  it("keeps follow-up prompts in normal flow when session module context exists", () => {
    const route = router.route({
      question: "¿qué hago ahora?",
      queryOnly: true,
      currentModule: "general",
      hasRecentModuleContext: true,
    });

    expect(route).toBe("live_data_or_knowledge");
  });

  it("keeps concrete domain questions out of ambiguous route", () => {
    const route = router.route({
      question: "¿Qué pagos fueron aprobados hoy?",
      queryOnly: true,
      currentModule: "general",
    });

    expect(route).toBe("live_data_or_knowledge");
  });

  it("allows read-only pending payments queries that use approve keyword as question", () => {
    const route = router.route({
      question: "¿Cuántos pagos pendientes hay para aprobar hoy?",
      queryOnly: true,
      currentModule: "payments",
    });

    expect(route).toBe("live_data_or_knowledge");
  });

  it("still blocks real mutation with approve keyword", () => {
    const route = router.route({
      question: "Aprueba este pago",
      queryOnly: true,
      currentModule: "payments",
    });

    expect(route).toBe("mutation_blocked");
  });
});
