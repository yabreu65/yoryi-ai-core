"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const assistant_auth_guard_1 = require("./assistant-auth.guard");
(0, vitest_1.describe)("AssistantAuthGuard", () => {
    let guard;
    (0, vitest_1.beforeEach)(() => {
        guard = new assistant_auth_guard_1.AssistantAuthGuard();
        delete process.env.ASSISTANT_STRICT_AUTH;
        delete process.env.ASSISTANT_STRICT_ROLLOUT_PERCENT;
        delete process.env.ASSISTANT_AUTH_JWT_HS_SECRET;
        delete process.env.ASSISTANT_AUTH_JWT_PUBLIC_KEY;
        delete process.env.ASSISTANT_AUTH_JWKS_URL;
        delete process.env.ASSISTANT_AUTH_JWT_ISSUER;
        delete process.env.ASSISTANT_AUTH_JWT_AUDIENCE;
    });
    (0, vitest_1.afterEach)(() => {
        delete process.env.ASSISTANT_STRICT_AUTH;
        delete process.env.ASSISTANT_STRICT_ROLLOUT_PERCENT;
        delete process.env.ASSISTANT_AUTH_JWT_HS_SECRET;
        delete process.env.ASSISTANT_AUTH_JWT_PUBLIC_KEY;
        delete process.env.ASSISTANT_AUTH_JWKS_URL;
        delete process.env.ASSISTANT_AUTH_JWT_ISSUER;
        delete process.env.ASSISTANT_AUTH_JWT_AUDIENCE;
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.it)("prefers req.user context over headers", async () => {
        const request = {
            user: {
                appId: "buildingos",
                tenantId: "tenant-from-user",
                userId: "user-from-user",
                role: "RESIDENT",
            },
            headers: {
                "x-tenant-id": "tenant-from-header",
                "x-user-id": "user-from-header",
                "x-user-role": "TENANT_ADMIN",
            },
        };
        const context = {
            switchToHttp: () => ({
                getRequest: () => request,
            }),
        };
        const result = await guard.canActivate(context);
        (0, vitest_1.expect)(result).toBe(true);
        (0, vitest_1.expect)(request.authContext.tenantId).toBe("tenant-from-user");
        (0, vitest_1.expect)(request.authContext.userId).toBe("user-from-user");
        (0, vitest_1.expect)(request.authContext.role).toBe("RESIDENT");
    });
    (0, vitest_1.it)("throws in strict mode when missing authoritative identity", async () => {
        process.env.ASSISTANT_STRICT_AUTH = "true";
        const request = { headers: {} };
        const context = {
            switchToHttp: () => ({
                getRequest: () => request,
            }),
        };
        await (0, vitest_1.expect)(guard.canActivate(context)).rejects.toThrow(common_1.UnauthorizedException);
    });
    (0, vitest_1.it)("allows compatibility mode when strict rollout percent is 0", async () => {
        process.env.ASSISTANT_STRICT_AUTH = "true";
        process.env.ASSISTANT_STRICT_ROLLOUT_PERCENT = "0";
        const request = { headers: {} };
        const context = {
            switchToHttp: () => ({
                getRequest: () => request,
            }),
        };
        const result = await guard.canActivate(context);
        (0, vitest_1.expect)(result).toBe(true);
        (0, vitest_1.expect)(request.authStrictMode).toBe(false);
    });
    (0, vitest_1.it)("enforces strict mode when strict rollout percent is 100", async () => {
        process.env.ASSISTANT_STRICT_AUTH = "true";
        process.env.ASSISTANT_STRICT_ROLLOUT_PERCENT = "100";
        const request = { headers: {} };
        const context = {
            switchToHttp: () => ({
                getRequest: () => request,
            }),
        };
        await (0, vitest_1.expect)(guard.canActivate(context)).rejects.toThrow(common_1.UnauthorizedException);
    });
    (0, vitest_1.it)("allows header-based context in compatibility mode", async () => {
        const request = {
            headers: {
                "x-app-id": "buildingos",
                "x-tenant-id": "tenant-1",
                "x-user-id": "user-1",
                "x-user-role": "RESIDENT",
            },
        };
        const context = {
            switchToHttp: () => ({
                getRequest: () => request,
            }),
        };
        const result = await guard.canActivate(context);
        (0, vitest_1.expect)(result).toBe(true);
        (0, vitest_1.expect)(request.authContext.appId).toBe("buildingos");
        (0, vitest_1.expect)(request.authContext.tenantId).toBe("tenant-1");
        (0, vitest_1.expect)(request.authContext.userId).toBe("user-1");
        (0, vitest_1.expect)(request.authContext.role).toBe("RESIDENT");
    });
    (0, vitest_1.it)("extracts identity from a valid HS256 bearer token", async () => {
        process.env.ASSISTANT_AUTH_JWT_HS_SECRET = "super-secret";
        process.env.ASSISTANT_STRICT_AUTH = "true";
        const token = createHs256Token({
            sub: "jwt-user",
            role: "RESIDENT",
            tenant_id: "jwt-tenant",
            app_id: "buildingos",
            exp: Math.floor(Date.now() / 1000) + 3600,
        }, process.env.ASSISTANT_AUTH_JWT_HS_SECRET);
        const request = {
            headers: {
                authorization: `Bearer ${token}`,
            },
        };
        const context = {
            switchToHttp: () => ({
                getRequest: () => request,
            }),
        };
        const result = await guard.canActivate(context);
        (0, vitest_1.expect)(result).toBe(true);
        (0, vitest_1.expect)(request.authContext.userId).toBe("jwt-user");
        (0, vitest_1.expect)(request.authContext.role).toBe("RESIDENT");
        (0, vitest_1.expect)(request.authContext.tenantId).toBe("jwt-tenant");
        (0, vitest_1.expect)(request.authContext.appId).toBe("buildingos");
    });
    (0, vitest_1.it)("throws in strict mode when bearer token signature is invalid", async () => {
        process.env.ASSISTANT_AUTH_JWT_HS_SECRET = "super-secret";
        process.env.ASSISTANT_STRICT_AUTH = "true";
        const token = createHs256Token({
            sub: "jwt-user",
            role: "RESIDENT",
            exp: Math.floor(Date.now() / 1000) + 3600,
        }, "another-secret");
        const request = {
            headers: {
                authorization: `Bearer ${token}`,
            },
        };
        const context = {
            switchToHttp: () => ({
                getRequest: () => request,
            }),
        };
        await (0, vitest_1.expect)(guard.canActivate(context)).rejects.toThrow(common_1.UnauthorizedException);
    });
    (0, vitest_1.it)("extracts identity from a valid RS256 bearer token using JWKS", async () => {
        const { generateKeyPairSync, createSign } = await Promise.resolve().then(() => __importStar(require("node:crypto")));
        const { privateKey, publicKey } = generateKeyPairSync("rsa", {
            modulusLength: 2048,
        });
        const publicJwk = publicKey.export({ format: "jwk" });
        process.env.ASSISTANT_AUTH_JWKS_URL = "https://issuer.test/.well-known/jwks.json";
        process.env.ASSISTANT_STRICT_AUTH = "true";
        process.env.ASSISTANT_AUTH_JWT_ISSUER = "issuer.test";
        process.env.ASSISTANT_AUTH_JWT_AUDIENCE = "assistant-api";
        vitest_1.vi.stubGlobal("fetch", vitest_1.vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                keys: [
                    {
                        ...publicJwk,
                        kid: "k1",
                        alg: "RS256",
                        use: "sig",
                    },
                ],
            }),
        }));
        const token = createRs256Token({
            sub: "jwt-user-rs",
            role: "RESIDENT",
            tenant_id: "tenant-rs",
            app_id: "buildingos",
            iss: "issuer.test",
            aud: "assistant-api",
            exp: Math.floor(Date.now() / 1000) + 3600,
        }, privateKey, createSign, "k1");
        const request = {
            headers: {
                authorization: `Bearer ${token}`,
            },
        };
        const context = {
            switchToHttp: () => ({
                getRequest: () => request,
            }),
        };
        const result = await guard.canActivate(context);
        (0, vitest_1.expect)(result).toBe(true);
        (0, vitest_1.expect)(request.authContext.userId).toBe("jwt-user-rs");
        (0, vitest_1.expect)(request.authContext.role).toBe("RESIDENT");
        (0, vitest_1.expect)(request.authContext.tenantId).toBe("tenant-rs");
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
function createRs256Token(payload, privateKey, createSignFn, kid) {
    const header = { alg: "RS256", typ: "JWT", kid };
    const rawHeader = encodeBase64Url(JSON.stringify(header));
    const rawPayload = encodeBase64Url(JSON.stringify(payload));
    const signatureBase = `${rawHeader}.${rawPayload}`;
    const signer = createSignFn("RSA-SHA256");
    signer.update(signatureBase);
    signer.end();
    const signature = signer.sign(privateKey).toString("base64url");
    return `${rawHeader}.${rawPayload}.${signature}`;
}
