"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const assistant_controller_1 = require("./assistant.controller");
(0, vitest_1.describe)("AssistantController", () => {
    (0, vitest_1.afterEach)(() => {
        delete process.env.ASSISTANT_MODE;
    });
    (0, vitest_1.it)("forwards authoritative context resolved by guard", async () => {
        const handleChat = vitest_1.vi.fn().mockResolvedValue({
            message: "test",
            answer: "ok",
            answerSource: "fallback",
            context: {
                appId: "buildingos",
                userId: "u",
                role: "RESIDENT",
                route: "/test",
                currentModule: "general",
                permissions: [],
            },
            actions: [],
            llmUsed: false,
            knowledgeUsed: { found: false, sources: [] },
        });
        const reindexRagKnowledge = vitest_1.vi.fn().mockResolvedValue({
            reports: [],
        });
        const controller = new assistant_controller_1.AssistantController({
            handleChat,
            reindexRagKnowledge,
        });
        await controller.chat({
            message: "test",
            context: {
                appId: "buildingos",
                userId: "user-body",
                role: "TENANT_ADMIN",
                route: "/test",
            },
            sessionId: "session-1",
        }, {
            authContext: {
                appId: "buildingos",
                tenantId: "tenant-auth",
                userId: "user-auth",
                role: "RESIDENT",
            },
        });
        (0, vitest_1.expect)(handleChat).toHaveBeenCalledTimes(1);
        const callArg = handleChat.mock.calls[0][0];
        (0, vitest_1.expect)(callArg.authContext.userId).toBe("user-auth");
        (0, vitest_1.expect)(callArg.authContext.role).toBe("RESIDENT");
        (0, vitest_1.expect)(callArg.authContext.tenantId).toBe("tenant-auth");
        (0, vitest_1.expect)(callArg.sessionId).toBe("session-1");
    });
    (0, vitest_1.it)("forwards authoritative context for action execution", async () => {
        process.env.ASSISTANT_MODE = "actions_enabled";
        const executeAction = vitest_1.vi.fn().mockResolvedValue({
            status: "executed",
            message: "ok",
            actionKey: "open-payments",
            execution: {
                type: "navigate",
                targetPath: "/tenant/payments",
            },
        });
        const controller = new assistant_controller_1.AssistantController({
            handleChat: vitest_1.vi.fn(),
            executeAction,
            reindexRagKnowledge: vitest_1.vi.fn(),
        });
        await controller.executeAction({
            actionKey: "open-payments",
            context: {
                appId: "buildingos",
                userId: "user-body",
                role: "TENANT_ADMIN",
                route: "/tenant/payments",
            },
            confirmed: false,
        }, {
            authContext: {
                appId: "buildingos",
                tenantId: "tenant-auth",
                userId: "user-auth",
                role: "RESIDENT",
            },
        });
        (0, vitest_1.expect)(executeAction).toHaveBeenCalledTimes(1);
        const callArg = executeAction.mock.calls[0][0];
        (0, vitest_1.expect)(callArg.actionKey).toBe("open-payments");
        (0, vitest_1.expect)(callArg.authContext.userId).toBe("user-auth");
        (0, vitest_1.expect)(callArg.authContext.role).toBe("RESIDENT");
        (0, vitest_1.expect)(callArg.authContext.tenantId).toBe("tenant-auth");
    });
    (0, vitest_1.it)("blocks action execution for BuildingOS in query-only mode", async () => {
        const executeAction = vitest_1.vi.fn();
        const controller = new assistant_controller_1.AssistantController({
            handleChat: vitest_1.vi.fn(),
            executeAction,
            reindexRagKnowledge: vitest_1.vi.fn(),
        });
        await (0, vitest_1.expect)(controller.executeAction({
            actionKey: "open-payments",
            context: {
                appId: "buildingos",
                userId: "user-body",
                role: "TENANT_ADMIN",
                route: "/tenant/payments",
            },
        }, {
            authContext: {
                appId: "buildingos",
                tenantId: "tenant-auth",
                userId: "user-auth",
                role: "RESIDENT",
            },
        })).rejects.toThrow("modo solo consulta");
        (0, vitest_1.expect)(executeAction).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)("forwards app list and internal token for rag reindex", async () => {
        const reindexRagKnowledge = vitest_1.vi.fn().mockResolvedValue({
            reports: [{ appId: "buildingos", totalDocuments: 1 }],
        });
        const controller = new assistant_controller_1.AssistantController({
            handleChat: vitest_1.vi.fn(),
            executeAction: vitest_1.vi.fn(),
            reindexRagKnowledge,
        });
        await controller.reindexRag({ apps: ["buildingos", "jurismanager"] }, {
            headers: {
                "x-internal-token": "internal-secret",
            },
        });
        (0, vitest_1.expect)(reindexRagKnowledge).toHaveBeenCalledWith({
            apps: ["buildingos", "jurismanager"],
            token: "internal-secret",
        });
    });
    (0, vitest_1.it)("forwards authoritative context for rollout status", () => {
        const getRolloutStatus = vitest_1.vi.fn().mockReturnValue({
            decision: {
                enabled: true,
                mode: "global",
                reason: "global_enabled",
            },
            context: {
                appId: "buildingos",
                tenantId: "tenant-auth",
                userId: "user-auth",
                role: "TENANT_ADMIN",
                route: "/tenant/dashboard",
            },
        });
        const controller = new assistant_controller_1.AssistantController({
            handleChat: vitest_1.vi.fn(),
            executeAction: vitest_1.vi.fn(),
            reindexRagKnowledge: vitest_1.vi.fn(),
            getRolloutStatus,
        });
        const result = controller.getRolloutStatus({
            context: {
                appId: "buildingos",
                tenantId: "tenant-body",
            },
        }, {
            authContext: {
                appId: "buildingos",
                tenantId: "tenant-auth",
                userId: "user-auth",
                role: "TENANT_ADMIN",
            },
        });
        (0, vitest_1.expect)(getRolloutStatus).toHaveBeenCalledWith({
            context: {
                appId: "buildingos",
                tenantId: "tenant-body",
            },
            authContext: {
                appId: "buildingos",
                tenantId: "tenant-auth",
                userId: "user-auth",
                role: "TENANT_ADMIN",
            },
        });
        (0, vitest_1.expect)(result.decision.reason).toBe("global_enabled");
    });
});
