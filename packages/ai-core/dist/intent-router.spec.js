"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const intent_router_1 = require("./intent-router");
(0, vitest_1.describe)("ChatIntentRouter", () => {
    const router = new intent_router_1.ChatIntentRouter();
    (0, vitest_1.it)("routes mutation requests to mutation_blocked in query-only mode", () => {
        const route = router.route({
            question: "aprueba este pago",
            queryOnly: true,
            currentModule: "payments",
        });
        (0, vitest_1.expect)(route).toBe("mutation_blocked");
    });
    (0, vitest_1.it)("allows how-to mutation questions to use knowledge in query-only mode", () => {
        const route = router.route({
            question: "¿Cómo crear unidades?",
            queryOnly: true,
            currentModule: "units",
        });
        (0, vitest_1.expect)(route).toBe("live_data_or_knowledge");
    });
    (0, vitest_1.it)("routes short non-specific prompts to ambiguous", () => {
        const route = router.route({
            question: "¿y eso?",
            queryOnly: true,
            currentModule: "general",
        });
        (0, vitest_1.expect)(route).toBe("ambiguous");
    });
    (0, vitest_1.it)("keeps follow-up prompts in normal flow when session module context exists", () => {
        const route = router.route({
            question: "¿qué hago ahora?",
            queryOnly: true,
            currentModule: "general",
            hasRecentModuleContext: true,
        });
        (0, vitest_1.expect)(route).toBe("live_data_or_knowledge");
    });
    (0, vitest_1.it)("keeps concrete domain questions out of ambiguous route", () => {
        const route = router.route({
            question: "¿Qué pagos fueron aprobados hoy?",
            queryOnly: true,
            currentModule: "general",
        });
        (0, vitest_1.expect)(route).toBe("live_data_or_knowledge");
    });
});
