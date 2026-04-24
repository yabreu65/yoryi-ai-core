"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const buildingos_intent_classifier_1 = require("./buildingos-intent-classifier");
const buildingos_intent_registry_1 = require("./buildingos-intent-registry");
(0, vitest_1.describe)("BuildingOSIntentClassifier", () => {
    const classifier = new buildingos_intent_classifier_1.BuildingOSIntentClassifier();
    (0, vitest_1.it)("classifies one canonical intent for each primary intent family", () => {
        const checks = [
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
            (0, vitest_1.expect)(result.intentCode).toBe(check.expected);
            (0, vitest_1.expect)(result.score).toBeGreaterThanOrEqual(0.44);
        }
    });
    (0, vitest_1.it)("returns NO_INTENT for short ambiguous prompts", () => {
        const result = classifier.classify("¿Y ahora?");
        (0, vitest_1.expect)(result.intentCode).toBeNull();
        (0, vitest_1.expect)(result.fallbackReason).toBeDefined();
    });
});
(0, vitest_1.describe)("buildingos intent registry", () => {
    (0, vitest_1.it)("contains at least 10 examples per intent", () => {
        for (const intent of (0, buildingos_intent_registry_1.getBuildingOSIntentDefinitions)()) {
            (0, vitest_1.expect)(intent.examples.length).toBeGreaterThanOrEqual(10);
        }
    });
    (0, vitest_1.it)("maps legacy aliases to canonical intent codes", () => {
        (0, vitest_1.expect)((0, buildingos_intent_registry_1.resolveCanonicalIntentCode)(undefined, "admin_arrears_by_building")).toBe("GET_OVERDUE_UNITS");
        (0, vitest_1.expect)((0, buildingos_intent_registry_1.resolveCanonicalIntentCode)(undefined, "admin_pending_payments_month")).toBe("GET_PENDING_PAYMENTS");
        (0, vitest_1.expect)((0, buildingos_intent_registry_1.resolveCanonicalIntentCode)(undefined, "admin_open_tickets_by_building")).toBe("GET_OPEN_TICKETS");
        (0, vitest_1.expect)((0, buildingos_intent_registry_1.resolveCanonicalIntentCode)(undefined, "admin_vacant_units")).toBe("GET_VACANT_UNITS");
        (0, vitest_1.expect)((0, buildingos_intent_registry_1.resolveCanonicalIntentCode)(undefined, "admin_collections_summary_month")).toBe("GET_COLLECTIONS_SUMMARY");
    });
});
