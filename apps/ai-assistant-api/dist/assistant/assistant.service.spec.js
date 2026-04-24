"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const assistant_service_1 = require("./assistant.service");
const ai_rag_1 = require("@yoryi/ai-rag");
(0, vitest_1.describe)("AssistantService", () => {
    (0, vitest_1.afterEach)(() => {
        delete process.env.ASSISTANT_MODE;
        delete process.env.ASSISTANT_GLOBAL_ENABLED;
        delete process.env.ASSISTANT_ROLLOUT_MODE;
        delete process.env.ASSISTANT_ROLLOUT_TENANTS;
        delete process.env.ASSISTANT_ROLLOUT_CANARY_PERCENT;
        delete process.env.ASSISTANT_ROLLOUT_CANARY_SEED;
        delete process.env.ASSISTANT_ROLLOUT_EXCLUDED_TENANTS;
        delete process.env.RAG_REINDEX_TOKEN;
        delete process.env.RAG_DB_URL;
        delete process.env.ASSISTANT_RATE_LIMIT_ENABLED;
        delete process.env.ASSISTANT_RATE_LIMIT_MAX_REQUESTS;
        delete process.env.ASSISTANT_RATE_LIMIT_WINDOW_MS;
        delete process.env.BUILDINGOS_READONLY_QUERY_API_BASE_URL;
        delete process.env.BUILDINGOS_READONLY_QUERY_API_KEY;
        delete process.env.BUILDINGOS_READONLY_QUERY_TIMEOUT_MS;
        delete process.env.BUILDINGOS_GATEWAY_CB_FAILURE_THRESHOLD;
        delete process.env.BUILDINGOS_GATEWAY_CB_OPEN_MS;
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.it)("uses server-authoritative auth context over body context", async () => {
        const service = new assistant_service_1.AssistantService();
        const handle = vitest_1.vi.fn().mockResolvedValue({
            message: "¿cuánto debo?",
            answer: "Tu deuda actual es ARS 100.00 (corte: 2026-04-18).",
            answerSource: "live_data",
            context: {
                appId: "buildingos",
                tenantId: "tenant-auth",
                userId: "user-auth",
                role: "RESIDENT",
                route: "/resident/finanzas",
                currentModule: "charges",
                permissions: ["charges.read", "payments.read"],
            },
            actions: [],
            llmUsed: false,
            knowledgeUsed: { found: false, sources: [] },
        });
        service.chatServicesByApp = new Map([
            ["buildingos", { handle }],
        ]);
        await service.handleChat({
            message: "¿cuánto debo?",
            sessionId: "session-1",
            context: {
                appId: "buildingos",
                tenantId: "tenant-body",
                userId: "user-body",
                role: "TENANT_ADMIN",
                route: "/resident/finanzas",
            },
            authContext: {
                appId: "buildingos",
                tenantId: "tenant-auth",
                userId: "user-auth",
                role: "RESIDENT",
            },
        });
        (0, vitest_1.expect)(handle).toHaveBeenCalledTimes(1);
        const callInput = handle.mock.calls[0][0];
        (0, vitest_1.expect)(callInput.context.tenantId).toBe("tenant-auth");
        (0, vitest_1.expect)(callInput.context.userId).toBe("user-auth");
        (0, vitest_1.expect)(callInput.context.role).toBe("RESIDENT");
        (0, vitest_1.expect)(callInput.sessionId).toBe("session-1");
    });
    (0, vitest_1.it)("keeps backward compatibility when auth context is missing", async () => {
        const service = new assistant_service_1.AssistantService();
        const handle = vitest_1.vi.fn().mockResolvedValue({
            message: "test",
            answer: "ok",
            answerSource: "fallback",
            context: {
                appId: "buildingos",
                userId: "legacy-user",
                role: "RESIDENT",
                route: "/test",
                currentModule: "general",
                permissions: [],
            },
            actions: [],
            llmUsed: false,
            knowledgeUsed: { found: false, sources: [] },
        });
        service.chatServicesByApp = new Map([
            ["buildingos", { handle }],
        ]);
        await service.handleChat({
            message: "test",
            context: {
                appId: "buildingos",
                userId: "legacy-user",
                role: "RESIDENT",
                route: "/test",
            },
        });
        const callInput = handle.mock.calls[0][0];
        (0, vitest_1.expect)(callInput.context.userId).toBe("legacy-user");
        (0, vitest_1.expect)(callInput.context.role).toBe("RESIDENT");
        (0, vitest_1.expect)(callInput.context.route).toBe("/test");
    });
    (0, vitest_1.it)("executes action using server-authoritative auth context", async () => {
        process.env.ASSISTANT_MODE = "actions_enabled";
        const service = new assistant_service_1.AssistantService();
        const getContext = vitest_1.vi.fn().mockResolvedValue({
            appId: "buildingos",
            tenantId: "tenant-auth",
            userId: "user-auth",
            role: "RESIDENT",
            route: "/resident/finanzas",
            currentModule: "payments",
            permissions: ["payments.read"],
        });
        const executeAction = vitest_1.vi.fn().mockResolvedValue({
            status: "executed",
            message: "ok",
            actionKey: "open-payments",
            execution: {
                type: "navigate",
                targetPath: "/tenant/payments",
            },
        });
        service.adaptersByApp = new Map([
            ["buildingos", { getContext, executeAction }],
        ]);
        await service.executeAction({
            actionKey: "open-payments",
            context: {
                appId: "buildingos",
                tenantId: "tenant-body",
                userId: "user-body",
                role: "TENANT_ADMIN",
                route: "/tenant/payments",
            },
            authContext: {
                appId: "buildingos",
                tenantId: "tenant-auth",
                userId: "user-auth",
                role: "RESIDENT",
            },
        });
        (0, vitest_1.expect)(getContext).toHaveBeenCalledTimes(1);
        const resolvedInput = getContext.mock.calls[0][0];
        (0, vitest_1.expect)(resolvedInput.tenantId).toBe("tenant-auth");
        (0, vitest_1.expect)(resolvedInput.userId).toBe("user-auth");
        (0, vitest_1.expect)(resolvedInput.role).toBe("RESIDENT");
        (0, vitest_1.expect)(executeAction).toHaveBeenCalledTimes(1);
        const executeInput = executeAction.mock.calls[0][0];
        (0, vitest_1.expect)(executeInput.actionKey).toBe("open-payments");
        (0, vitest_1.expect)(executeInput.context.tenantId).toBe("tenant-auth");
    });
    (0, vitest_1.it)("returns not_found when adapter has no action execution support", async () => {
        process.env.ASSISTANT_MODE = "actions_enabled";
        const service = new assistant_service_1.AssistantService();
        const getContext = vitest_1.vi.fn().mockResolvedValue({
            appId: "buildingos",
            tenantId: "tenant-auth",
            userId: "user-auth",
            role: "RESIDENT",
            route: "/resident/finanzas",
            currentModule: "payments",
            permissions: ["payments.read"],
        });
        service.adaptersByApp = new Map([
            ["buildingos", { getContext }],
        ]);
        const result = await service.executeAction({
            actionKey: "open-payments",
            context: {
                appId: "buildingos",
                tenantId: "tenant-auth",
                userId: "user-auth",
                role: "RESIDENT",
                route: "/resident/finanzas",
            },
        });
        (0, vitest_1.expect)(result.status).toBe("not_found");
    });
    (0, vitest_1.it)("blocks BuildingOS action execution by default in query-only mode", async () => {
        const service = new assistant_service_1.AssistantService();
        const getContext = vitest_1.vi.fn();
        const executeAction = vitest_1.vi.fn();
        service.adaptersByApp = new Map([
            ["buildingos", { getContext, executeAction }],
        ]);
        await (0, vitest_1.expect)(service.executeAction({
            actionKey: "open-payments",
            context: {
                appId: "buildingos",
                tenantId: "tenant-auth",
                userId: "user-auth",
                role: "RESIDENT",
                route: "/resident/finanzas",
            },
        })).rejects.toThrow("modo solo consulta");
        (0, vitest_1.expect)(getContext).not.toHaveBeenCalled();
        (0, vitest_1.expect)(executeAction).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)("routes chat to jurismanager adapter by authoritative appId", async () => {
        const service = new assistant_service_1.AssistantService();
        const handleJuris = vitest_1.vi.fn().mockResolvedValue({
            message: "estado del expediente",
            answer: "ok",
            answerSource: "knowledge",
            context: {
                appId: "jurismanager",
                userId: "lawyer-auth",
                role: "ABOGADO",
                route: "/juris/expedientes",
                currentModule: "expedientes",
                permissions: ["expedientes.read"],
            },
            actions: [],
            knowledgeUsed: { found: true, sources: [] },
        });
        const handleBuilding = vitest_1.vi.fn().mockResolvedValue({
            message: "x",
            answer: "y",
            answerSource: "fallback",
            context: {
                appId: "buildingos",
                userId: "u",
                role: "RESIDENT",
                route: "/",
                currentModule: "general",
                permissions: [],
            },
            actions: [],
            knowledgeUsed: { found: false, sources: [] },
        });
        service.chatServicesByApp = new Map([
            ["buildingos", { handle: handleBuilding }],
            ["jurismanager", { handle: handleJuris }],
        ]);
        await service.handleChat({
            message: "estado del expediente",
            context: {
                appId: "buildingos",
                route: "/juris/expedientes",
            },
            authContext: {
                appId: "jurismanager",
                userId: "lawyer-auth",
                role: "ABOGADO",
            },
        });
        (0, vitest_1.expect)(handleJuris).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(handleBuilding).not.toHaveBeenCalled();
        const callInput = handleJuris.mock.calls[0][0];
        (0, vitest_1.expect)(callInput.context.appId).toBe("jurismanager");
        (0, vitest_1.expect)(callInput.context.role).toBe("ABOGADO");
    });
    (0, vitest_1.it)("protects rag reindex with configured token", async () => {
        process.env.RAG_REINDEX_TOKEN = "expected-token";
        const service = new assistant_service_1.AssistantService();
        const reindexApps = vitest_1.vi.fn().mockResolvedValue([
            { appId: "buildingos", totalDocuments: 1, indexedDocuments: 1, skippedDocuments: 0, totalChunks: 2 },
        ]);
        service.ragIndexer = { reindexApps };
        await (0, vitest_1.expect)(service.reindexRagKnowledge({
            token: "wrong-token",
        })).rejects.toThrow();
        const result = await service.reindexRagKnowledge({
            token: "expected-token",
            apps: ["buildingos"],
        });
        (0, vitest_1.expect)(reindexApps).toHaveBeenCalledWith(["buildingos"]);
        (0, vitest_1.expect)(result.reports).toHaveLength(1);
    });
    (0, vitest_1.it)("uses PostgresRagStore when RAG_DB_URL is configured", () => {
        process.env.RAG_DB_URL = "postgres://user:pass@localhost:5432/rag";
        const service = new assistant_service_1.AssistantService();
        const store = service.ragIndexer?.store;
        (0, vitest_1.expect)(store).toBeInstanceOf(ai_rag_1.PostgresRagStore);
    });
    (0, vitest_1.it)("resolves admin live read-only answers through BuildingOS query gateway", async () => {
        process.env.BUILDINGOS_READONLY_QUERY_API_BASE_URL = "https://buildingos.example.com";
        process.env.BUILDINGOS_READONLY_QUERY_API_KEY = "readonly-key";
        process.env.BUILDINGOS_READONLY_QUERY_TIMEOUT_MS = "950";
        const fetchMock = vitest_1.vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                answer: "Resumen del mes: cobranzas por ARS 12.340.000 y morosidad 8.2%.",
                metadata: {
                    source: "buildingos-live-read-db",
                    reportId: "rpt-2026-04",
                },
            }),
        });
        vitest_1.vi.stubGlobal("fetch", fetchMock);
        const service = new assistant_service_1.AssistantService();
        const response = await service.handleChat({
            message: "Dame un resumen de cobranzas del mes",
            context: {
                appId: "buildingos",
                tenantId: "tenant-body",
                userId: "user-body",
                role: "RESIDENT",
                route: "/tenant/charges",
            },
            authContext: {
                appId: "buildingos",
                tenantId: "tenant-auth",
                userId: "admin-auth",
                role: "TENANT_ADMIN",
            },
        });
        (0, vitest_1.expect)(response.answerSource).toBe("live_data");
        (0, vitest_1.expect)(response.answer).toContain("Resumen del mes");
        (0, vitest_1.expect)(fetchMock).toHaveBeenCalledTimes(1);
        const [, init] = fetchMock.mock.calls[0];
        const body = JSON.parse(String(init.body));
        (0, vitest_1.expect)(body.context.tenantId).toBe("tenant-auth");
        (0, vitest_1.expect)(body.context.userId).toBe("admin-auth");
        (0, vitest_1.expect)(body.context.role).toBe("TENANT_ADMIN");
    });
    (0, vitest_1.it)("enforces rate limiting using authoritative tenant/user context", async () => {
        process.env.ASSISTANT_RATE_LIMIT_MAX_REQUESTS = "1";
        process.env.ASSISTANT_RATE_LIMIT_WINDOW_MS = "60000";
        const service = new assistant_service_1.AssistantService();
        const handle = vitest_1.vi.fn().mockResolvedValue({
            message: "test",
            answer: "ok",
            answerSource: "fallback",
            responseType: "no_data",
            dataScope: "tenant",
            provenance: { strategy: "fallback", sources: [] },
            auditId: "audit-1",
            context: {
                appId: "buildingos",
                userId: "user-auth",
                role: "RESIDENT",
                route: "/test",
                currentModule: "general",
                permissions: [],
            },
            actions: [],
            llmUsed: false,
            knowledgeUsed: { found: false, sources: [] },
        });
        service.chatServicesByApp = new Map([
            ["buildingos", { handle }],
        ]);
        await service.handleChat({
            message: "uno",
            context: {
                appId: "buildingos",
                tenantId: "tenant-body",
                userId: "user-body",
                role: "TENANT_ADMIN",
                route: "/test",
            },
            authContext: {
                appId: "buildingos",
                tenantId: "tenant-auth",
                userId: "user-auth",
                role: "RESIDENT",
            },
        });
        await (0, vitest_1.expect)(service.handleChat({
            message: "dos",
            context: {
                appId: "buildingos",
                tenantId: "tenant-body-spoof",
                userId: "user-body-spoof",
                role: "TENANT_ADMIN",
                route: "/test",
            },
            authContext: {
                appId: "buildingos",
                tenantId: "tenant-auth",
                userId: "user-auth",
                role: "RESIDENT",
            },
        })).rejects.toThrow("límite temporal");
        (0, vitest_1.expect)(handle).toHaveBeenCalledTimes(1);
    });
    (0, vitest_1.it)("blocks chat when tenant is outside rollout allowlist", async () => {
        process.env.ASSISTANT_ROLLOUT_MODE = "allowlist";
        process.env.ASSISTANT_ROLLOUT_TENANTS = "tenant-allowed";
        const service = new assistant_service_1.AssistantService();
        await (0, vitest_1.expect)(service.handleChat({
            message: "hola",
            context: {
                appId: "buildingos",
                tenantId: "tenant-body",
                userId: "user-body",
                role: "TENANT_ADMIN",
                route: "/tenant/dashboard",
            },
            authContext: {
                appId: "buildingos",
                tenantId: "tenant-blocked",
                userId: "admin-auth",
                role: "TENANT_ADMIN",
            },
        })).rejects.toThrow("tenant_not_allowlisted");
    });
    (0, vitest_1.it)("returns rollout status using authoritative auth context", () => {
        process.env.ASSISTANT_ROLLOUT_MODE = "allowlist";
        process.env.ASSISTANT_ROLLOUT_TENANTS = "tenant-allowed";
        const service = new assistant_service_1.AssistantService();
        const result = service.getRolloutStatus({
            context: {
                appId: "buildingos",
                tenantId: "tenant-body",
                userId: "user-body",
                role: "TENANT_ADMIN",
                route: "/tenant/dashboard",
            },
            authContext: {
                appId: "buildingos",
                tenantId: "tenant-allowed",
                userId: "admin-auth",
                role: "TENANT_ADMIN",
            },
        });
        (0, vitest_1.expect)(result.context.tenantId).toBe("tenant-allowed");
        (0, vitest_1.expect)(result.decision.enabled).toBe(true);
        (0, vitest_1.expect)(result.decision.reason).toBe("tenant_allowlisted");
    });
});
