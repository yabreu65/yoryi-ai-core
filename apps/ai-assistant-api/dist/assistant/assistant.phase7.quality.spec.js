"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const assistant_service_1 = require("./assistant.service");
const phase7_quality_dataset_1 = require("./phase7-quality.dataset");
(0, vitest_1.describe)("AssistantService phase 7 quality matrix", () => {
    let envBackup;
    (0, vitest_1.beforeEach)(() => {
        envBackup = {
            RAG_ENABLED: process.env.RAG_ENABLED,
            RAG_TOP_K: process.env.RAG_TOP_K,
            RAG_MIN_SCORE: process.env.RAG_MIN_SCORE,
            BUILDINGOS_FINANCIAL_API_BASE_URL: process.env.BUILDINGOS_FINANCIAL_API_BASE_URL,
            BUILDINGOS_FINANCIAL_API_KEY: process.env.BUILDINGOS_FINANCIAL_API_KEY,
            BUILDINGOS_READONLY_QUERY_API_BASE_URL: process.env.BUILDINGOS_READONLY_QUERY_API_BASE_URL,
            BUILDINGOS_READONLY_QUERY_API_KEY: process.env.BUILDINGOS_READONLY_QUERY_API_KEY,
            BUILDINGOS_READONLY_QUERY_TIMEOUT_MS: process.env.BUILDINGOS_READONLY_QUERY_TIMEOUT_MS,
        };
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.afterEach)(() => {
        process.env.RAG_ENABLED = envBackup.RAG_ENABLED;
        process.env.RAG_TOP_K = envBackup.RAG_TOP_K;
        process.env.RAG_MIN_SCORE = envBackup.RAG_MIN_SCORE;
        process.env.BUILDINGOS_FINANCIAL_API_BASE_URL =
            envBackup.BUILDINGOS_FINANCIAL_API_BASE_URL;
        process.env.BUILDINGOS_FINANCIAL_API_KEY = envBackup.BUILDINGOS_FINANCIAL_API_KEY;
        process.env.BUILDINGOS_READONLY_QUERY_API_BASE_URL =
            envBackup.BUILDINGOS_READONLY_QUERY_API_BASE_URL;
        process.env.BUILDINGOS_READONLY_QUERY_API_KEY =
            envBackup.BUILDINGOS_READONLY_QUERY_API_KEY;
        process.env.BUILDINGOS_READONLY_QUERY_TIMEOUT_MS =
            envBackup.BUILDINGOS_READONLY_QUERY_TIMEOUT_MS;
        vitest_1.vi.restoreAllMocks();
    });
    vitest_1.it.each(phase7_quality_dataset_1.PHASE7_QUALITY_CASES)("[$persona] $id", async ({ message, context, authContext, env, expected }) => {
        delete process.env.BUILDINGOS_FINANCIAL_API_BASE_URL;
        delete process.env.BUILDINGOS_FINANCIAL_API_KEY;
        delete process.env.BUILDINGOS_READONLY_QUERY_API_BASE_URL;
        delete process.env.BUILDINGOS_READONLY_QUERY_API_KEY;
        delete process.env.BUILDINGOS_READONLY_QUERY_TIMEOUT_MS;
        if (env) {
            for (const [key, value] of Object.entries(env)) {
                if (value !== undefined) {
                    process.env[key] = value;
                }
            }
        }
        const fetchMock = vitest_1.vi.fn(async (url) => {
            if (url.includes("/resident-debt-summary")) {
                return {
                    ok: true,
                    json: async () => ({
                        amount: 4210.75,
                        currency: "ARS",
                        asOf: "2026-04-18",
                    }),
                };
            }
            if (url.includes("/assistant/read-only-query")) {
                return {
                    ok: true,
                    json: async () => ({
                        answer: "Resumen de cobranzas: total ARS 12.450.000 y morosidad 7.1%.",
                        metadata: {
                            metricValue: 12450000,
                            source: "buildingos-read-db",
                        },
                    }),
                };
            }
            return {
                ok: false,
                json: async () => ({}),
            };
        });
        vitest_1.vi.stubGlobal("fetch", fetchMock);
        const service = new assistant_service_1.AssistantService();
        const response = await service.handleChat({
            message,
            context,
            authContext,
        });
        (0, vitest_1.expect)(response.answerSource).toBe(expected.answerSource);
        (0, vitest_1.expect)(response.responseType).toBe(expected.responseType);
        (0, vitest_1.expect)(response.dataScope).toBe(expected.dataScope);
        (0, vitest_1.expect)(response.context.tenantId).toBe(expected.expectedTenantId);
        (0, vitest_1.expect)(typeof response.auditId).toBe("string");
        (0, vitest_1.expect)(response.auditId.length).toBeGreaterThan(10);
        if (expected.answerIncludes) {
            (0, vitest_1.expect)(response.answer.toLowerCase()).toContain(expected.answerIncludes.toLowerCase());
        }
    });
    (0, vitest_1.it)("uses RAG semantic retrieval for knowledge responses after indexing", async () => {
        process.env.RAG_ENABLED = "true";
        process.env.RAG_TOP_K = "5";
        process.env.RAG_MIN_SCORE = "0.2";
        vitest_1.vi.stubGlobal("fetch", vitest_1.vi.fn().mockResolvedValue({ ok: false }));
        const service = new assistant_service_1.AssistantService();
        await service.reindexRagKnowledge({ apps: ["buildingos"] });
        const response = await service.handleChat({
            message: "¿Qué incluye el módulo de pagos en BuildingOS?",
            context: {
                appId: "buildingos",
                tenantId: "tenant-1",
                userId: "admin-1",
                role: "TENANT_ADMIN",
                route: "/tenant/payments",
            },
            authContext: {
                appId: "buildingos",
                tenantId: "tenant-1",
                userId: "admin-1",
                role: "TENANT_ADMIN",
            },
        });
        (0, vitest_1.expect)(response.answerSource).toBe("knowledge");
        (0, vitest_1.expect)(response.knowledgeUsed?.found).toBe(true);
        (0, vitest_1.expect)(response.knowledgeUsed?.sources.length).toBeGreaterThan(0);
    });
});
