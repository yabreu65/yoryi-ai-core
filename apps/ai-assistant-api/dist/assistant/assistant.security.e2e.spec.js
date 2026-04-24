"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const node_crypto_1 = require("node:crypto");
const supertest_1 = __importDefault(require("supertest"));
const testing_1 = require("@nestjs/testing");
const vitest_1 = require("vitest");
const assistant_module_1 = require("./assistant.module");
const assistant_service_1 = require("./assistant.service");
(0, vitest_1.describe)("Assistant security e2e", () => {
    let app;
    const handleChat = vitest_1.vi.fn();
    const executeAction = vitest_1.vi.fn();
    const reindexRagKnowledge = vitest_1.vi.fn();
    (0, vitest_1.beforeEach)(async () => {
        handleChat.mockReset();
        executeAction.mockReset();
        reindexRagKnowledge.mockReset();
        handleChat.mockResolvedValue({
            message: "test",
            answer: "ok",
            answerSource: "fallback",
            context: {
                appId: "buildingos",
                userId: "u_1",
                role: "RESIDENT",
                route: "/resident/finanzas",
                currentModule: "charges",
                permissions: ["charges.read", "payments.read"],
            },
            actions: [],
            llmUsed: false,
            knowledgeUsed: { found: false, sources: [] },
        });
        executeAction.mockResolvedValue({
            status: "executed",
            message: "ok",
            actionKey: "open-payments",
            execution: {
                type: "navigate",
                targetPath: "/tenant/payments",
            },
        });
        reindexRagKnowledge.mockResolvedValue({
            reports: [],
        });
        const moduleRef = await testing_1.Test.createTestingModule({
            imports: [assistant_module_1.AssistantModule],
        })
            .overrideProvider(assistant_service_1.AssistantService)
            .useValue({ handleChat, executeAction, reindexRagKnowledge })
            .compile();
        app = moduleRef.createNestApplication();
        await app.init();
    });
    (0, vitest_1.afterEach)(async () => {
        await app.close();
        delete process.env.ASSISTANT_STRICT_AUTH;
        delete process.env.ASSISTANT_STRICT_ROLLOUT_PERCENT;
        delete process.env.ASSISTANT_AUTH_JWT_HS_SECRET;
        delete process.env.ASSISTANT_AUTH_JWT_ISSUER;
        delete process.env.ASSISTANT_AUTH_JWT_AUDIENCE;
        delete process.env.RAG_REINDEX_TOKEN;
        delete process.env.ASSISTANT_MODE;
    });
    (0, vitest_1.it)("returns 401 in strict mode when JWT signature is invalid", async () => {
        process.env.ASSISTANT_STRICT_AUTH = "true";
        process.env.ASSISTANT_AUTH_JWT_HS_SECRET = "correct-secret";
        const invalidToken = createHs256Token({
            sub: "resident-1",
            role: "RESIDENT",
            tenant_id: "tenant-auth",
            app_id: "buildingos",
            exp: Math.floor(Date.now() / 1000) + 3600,
        }, "wrong-secret");
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .post("/assistant/chat")
            .set("Authorization", `Bearer ${invalidToken}`)
            .send({
            message: "¿cuánto debo?",
            context: {
                appId: "buildingos",
                tenantId: "tenant-body",
                userId: "body-user",
                role: "TENANT_ADMIN",
                route: "/resident/finanzas",
            },
        });
        (0, vitest_1.expect)(response.status).toBe(401);
        (0, vitest_1.expect)(handleChat).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)("keeps compatibility behavior when strict rollout is 0", async () => {
        process.env.ASSISTANT_STRICT_AUTH = "true";
        process.env.ASSISTANT_STRICT_ROLLOUT_PERCENT = "0";
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .post("/assistant/chat")
            .send({
            message: "¿cuánto debo?",
            context: {
                appId: "buildingos",
                tenantId: "tenant-body",
                userId: "user-body",
                role: "TENANT_ADMIN",
                route: "/resident/finanzas",
            },
        });
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(handleChat).toHaveBeenCalledTimes(1);
    });
    (0, vitest_1.it)("uses token identity over body spoofing for role and tenant", async () => {
        process.env.ASSISTANT_STRICT_AUTH = "true";
        process.env.ASSISTANT_AUTH_JWT_HS_SECRET = "correct-secret";
        process.env.ASSISTANT_AUTH_JWT_ISSUER = "issuer.test";
        process.env.ASSISTANT_AUTH_JWT_AUDIENCE = "assistant-api";
        const validToken = createHs256Token({
            sub: "resident-auth",
            role: "RESIDENT",
            tenant_id: "tenant-auth",
            app_id: "buildingos",
            iss: "issuer.test",
            aud: "assistant-api",
            exp: Math.floor(Date.now() / 1000) + 3600,
        }, "correct-secret");
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .post("/assistant/chat")
            .set("Authorization", `Bearer ${validToken}`)
            .send({
            message: "¿cuánto debo?",
            context: {
                appId: "buildingos",
                tenantId: "tenant-body",
                userId: "user-body",
                role: "TENANT_ADMIN",
                route: "/resident/finanzas",
            },
        });
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(handleChat).toHaveBeenCalledTimes(1);
        const callArg = handleChat.mock.calls[0][0];
        (0, vitest_1.expect)(callArg.authContext.userId).toBe("resident-auth");
        (0, vitest_1.expect)(callArg.authContext.role).toBe("RESIDENT");
        (0, vitest_1.expect)(callArg.authContext.tenantId).toBe("tenant-auth");
    });
    (0, vitest_1.it)("returns 401 in strict mode when token is expired", async () => {
        process.env.ASSISTANT_STRICT_AUTH = "true";
        process.env.ASSISTANT_AUTH_JWT_HS_SECRET = "correct-secret";
        const expiredToken = createHs256Token({
            sub: "resident-auth",
            role: "RESIDENT",
            tenant_id: "tenant-auth",
            app_id: "buildingos",
            exp: Math.floor(Date.now() / 1000) - 5,
        }, "correct-secret");
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .post("/assistant/chat")
            .set("Authorization", `Bearer ${expiredToken}`)
            .send({
            message: "¿cuánto debo?",
            context: {
                appId: "buildingos",
                role: "TENANT_ADMIN",
                route: "/resident/finanzas",
            },
        });
        (0, vitest_1.expect)(response.status).toBe(401);
        (0, vitest_1.expect)(handleChat).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)("returns 401 in strict mode when token issuer does not match", async () => {
        process.env.ASSISTANT_STRICT_AUTH = "true";
        process.env.ASSISTANT_AUTH_JWT_HS_SECRET = "correct-secret";
        process.env.ASSISTANT_AUTH_JWT_ISSUER = "issuer.expected";
        const tokenWithWrongIssuer = createHs256Token({
            sub: "resident-auth",
            role: "RESIDENT",
            tenant_id: "tenant-auth",
            app_id: "buildingos",
            iss: "issuer.other",
            exp: Math.floor(Date.now() / 1000) + 3600,
        }, "correct-secret");
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .post("/assistant/chat")
            .set("Authorization", `Bearer ${tokenWithWrongIssuer}`)
            .send({
            message: "¿cuánto debo?",
            context: {
                appId: "buildingos",
                role: "TENANT_ADMIN",
                route: "/resident/finanzas",
            },
        });
        (0, vitest_1.expect)(response.status).toBe(401);
        (0, vitest_1.expect)(handleChat).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)("returns 401 in strict mode when token audience does not match", async () => {
        process.env.ASSISTANT_STRICT_AUTH = "true";
        process.env.ASSISTANT_AUTH_JWT_HS_SECRET = "correct-secret";
        process.env.ASSISTANT_AUTH_JWT_AUDIENCE = "assistant-api";
        const tokenWithWrongAudience = createHs256Token({
            sub: "resident-auth",
            role: "RESIDENT",
            tenant_id: "tenant-auth",
            app_id: "buildingos",
            aud: "other-service",
            exp: Math.floor(Date.now() / 1000) + 3600,
        }, "correct-secret");
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .post("/assistant/chat")
            .set("Authorization", `Bearer ${tokenWithWrongAudience}`)
            .send({
            message: "¿cuánto debo?",
            context: {
                appId: "buildingos",
                role: "TENANT_ADMIN",
                route: "/resident/finanzas",
            },
        });
        (0, vitest_1.expect)(response.status).toBe(401);
        (0, vitest_1.expect)(handleChat).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)("uses token identity over body spoofing when executing actions", async () => {
        process.env.ASSISTANT_MODE = "actions_enabled";
        process.env.ASSISTANT_STRICT_AUTH = "true";
        process.env.ASSISTANT_AUTH_JWT_HS_SECRET = "correct-secret";
        process.env.ASSISTANT_AUTH_JWT_ISSUER = "issuer.test";
        process.env.ASSISTANT_AUTH_JWT_AUDIENCE = "assistant-api";
        const validToken = createHs256Token({
            sub: "resident-auth",
            role: "RESIDENT",
            tenant_id: "tenant-auth",
            app_id: "buildingos",
            iss: "issuer.test",
            aud: "assistant-api",
            exp: Math.floor(Date.now() / 1000) + 3600,
        }, "correct-secret");
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .post("/assistant/actions/execute")
            .set("Authorization", `Bearer ${validToken}`)
            .send({
            actionKey: "open-payments",
            context: {
                appId: "buildingos",
                tenantId: "tenant-body",
                userId: "user-body",
                role: "TENANT_ADMIN",
                route: "/tenant/payments",
            },
        });
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(executeAction).toHaveBeenCalledTimes(1);
        const callArg = executeAction.mock.calls[0][0];
        (0, vitest_1.expect)(callArg.authContext.userId).toBe("resident-auth");
        (0, vitest_1.expect)(callArg.authContext.role).toBe("RESIDENT");
        (0, vitest_1.expect)(callArg.authContext.tenantId).toBe("tenant-auth");
    });
    (0, vitest_1.it)("blocks BuildingOS action execution by default in query-only mode", async () => {
        process.env.ASSISTANT_STRICT_AUTH = "true";
        process.env.ASSISTANT_AUTH_JWT_HS_SECRET = "correct-secret";
        process.env.ASSISTANT_AUTH_JWT_ISSUER = "issuer.test";
        process.env.ASSISTANT_AUTH_JWT_AUDIENCE = "assistant-api";
        const validToken = createHs256Token({
            sub: "resident-auth",
            role: "RESIDENT",
            tenant_id: "tenant-auth",
            app_id: "buildingos",
            iss: "issuer.test",
            aud: "assistant-api",
            exp: Math.floor(Date.now() / 1000) + 3600,
        }, "correct-secret");
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .post("/assistant/actions/execute")
            .set("Authorization", `Bearer ${validToken}`)
            .send({
            actionKey: "open-payments",
            context: {
                appId: "buildingos",
                tenantId: "tenant-body",
                userId: "user-body",
                role: "TENANT_ADMIN",
                route: "/tenant/payments",
            },
        });
        (0, vitest_1.expect)(response.status).toBe(403);
        (0, vitest_1.expect)(executeAction).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)("uses token appId over body appId spoofing on chat", async () => {
        process.env.ASSISTANT_STRICT_AUTH = "true";
        process.env.ASSISTANT_AUTH_JWT_HS_SECRET = "correct-secret";
        process.env.ASSISTANT_AUTH_JWT_ISSUER = "issuer.test";
        process.env.ASSISTANT_AUTH_JWT_AUDIENCE = "assistant-api";
        const validToken = createHs256Token({
            sub: "lawyer-auth",
            role: "ABOGADO",
            tenant_id: "tenant-jm",
            app_id: "jurismanager",
            iss: "issuer.test",
            aud: "assistant-api",
            exp: Math.floor(Date.now() / 1000) + 3600,
        }, "correct-secret");
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .post("/assistant/chat")
            .set("Authorization", `Bearer ${validToken}`)
            .send({
            message: "estado del expediente",
            context: {
                appId: "buildingos",
                tenantId: "tenant-body",
                userId: "user-body",
                role: "TENANT_ADMIN",
                route: "/juris/expedientes",
            },
        });
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(handleChat).toHaveBeenCalledTimes(1);
        const callArg = handleChat.mock.calls[0][0];
        (0, vitest_1.expect)(callArg.authContext.appId).toBe("jurismanager");
        (0, vitest_1.expect)(callArg.authContext.userId).toBe("lawyer-auth");
        (0, vitest_1.expect)(callArg.authContext.role).toBe("ABOGADO");
    });
    (0, vitest_1.it)("protects rag reindex endpoint with internal token when configured", async () => {
        process.env.RAG_REINDEX_TOKEN = "internal-token";
        const forbiddenResponse = await (0, supertest_1.default)(app.getHttpServer())
            .post("/assistant/rag/reindex")
            .send({});
        (0, vitest_1.expect)(forbiddenResponse.status).toBe(401);
        (0, vitest_1.expect)(reindexRagKnowledge).not.toHaveBeenCalled();
        const successResponse = await (0, supertest_1.default)(app.getHttpServer())
            .post("/assistant/rag/reindex")
            .set("x-internal-token", "internal-token")
            .send({
            apps: ["buildingos"],
        });
        (0, vitest_1.expect)(successResponse.status).toBe(200);
        (0, vitest_1.expect)(reindexRagKnowledge).toHaveBeenCalledWith({
            apps: ["buildingos"],
            token: "internal-token",
        });
    });
});
function createHs256Token(payload, secret) {
    const header = { alg: "HS256", typ: "JWT" };
    const rawHeader = encodeBase64Url(JSON.stringify(header));
    const rawPayload = encodeBase64Url(JSON.stringify(payload));
    const signatureBase = `${rawHeader}.${rawPayload}`;
    const signature = (0, node_crypto_1.createHmac)("sha256", secret)
        .update(signatureBase)
        .digest("base64url");
    return `${rawHeader}.${rawPayload}.${signature}`;
}
function encodeBase64Url(value) {
    return Buffer.from(value, "utf8").toString("base64url");
}
