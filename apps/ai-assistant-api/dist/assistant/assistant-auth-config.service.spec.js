"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const assistant_auth_config_service_1 = require("./assistant-auth-config.service");
(0, vitest_1.describe)("AssistantAuthConfigService", () => {
    let service;
    (0, vitest_1.beforeEach)(() => {
        service = new assistant_auth_config_service_1.AssistantAuthConfigService();
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
    });
    (0, vitest_1.it)("returns non-strict status by default", () => {
        (0, vitest_1.expect)(service.getPublicStatus()).toEqual({
            strictMode: false,
            verificationMode: "none",
            issuerConfigured: false,
            audienceConfigured: false,
            jwksConfigured: false,
            strictRolloutPercent: 100,
        });
    });
    (0, vitest_1.it)("throws when strict mode is enabled without verifier keys", () => {
        process.env.ASSISTANT_STRICT_AUTH = "true";
        process.env.ASSISTANT_AUTH_JWT_ISSUER = "issuer.test";
        process.env.ASSISTANT_AUTH_JWT_AUDIENCE = "assistant-api";
        (0, vitest_1.expect)(() => service.assertValidForStartup()).toThrow(/ASSISTANT_STRICT_AUTH=true requires ASSISTANT_AUTH_JWT_HS_SECRET or ASSISTANT_AUTH_JWT_PUBLIC_KEY/);
    });
    (0, vitest_1.it)("throws when strict mode is enabled without issuer/audience", () => {
        process.env.ASSISTANT_STRICT_AUTH = "true";
        process.env.ASSISTANT_AUTH_JWT_HS_SECRET = "secret";
        (0, vitest_1.expect)(() => service.assertValidForStartup()).toThrow(/ASSISTANT_AUTH_JWT_ISSUER/);
        process.env.ASSISTANT_AUTH_JWT_ISSUER = "issuer.test";
        (0, vitest_1.expect)(() => service.assertValidForStartup()).toThrow(/ASSISTANT_AUTH_JWT_AUDIENCE/);
    });
    (0, vitest_1.it)("passes strict startup validation when fully configured", () => {
        process.env.ASSISTANT_STRICT_AUTH = "true";
        process.env.ASSISTANT_AUTH_JWT_HS_SECRET = "secret";
        process.env.ASSISTANT_AUTH_JWT_ISSUER = "issuer.test";
        process.env.ASSISTANT_AUTH_JWT_AUDIENCE = "assistant-api";
        (0, vitest_1.expect)(() => service.assertValidForStartup()).not.toThrow();
        (0, vitest_1.expect)(service.getPublicStatus()).toEqual({
            strictMode: true,
            verificationMode: "hs256",
            issuerConfigured: true,
            audienceConfigured: true,
            jwksConfigured: false,
            strictRolloutPercent: 100,
        });
    });
    (0, vitest_1.it)("passes strict startup validation with JWKS URL and no static key", () => {
        process.env.ASSISTANT_STRICT_AUTH = "true";
        process.env.ASSISTANT_AUTH_JWKS_URL = "https://issuer.test/.well-known/jwks.json";
        process.env.ASSISTANT_AUTH_JWT_ISSUER = "issuer.test";
        process.env.ASSISTANT_AUTH_JWT_AUDIENCE = "assistant-api";
        (0, vitest_1.expect)(() => service.assertValidForStartup()).not.toThrow();
        (0, vitest_1.expect)(service.getPublicStatus()).toEqual({
            strictMode: true,
            verificationMode: "jwks_rs256",
            issuerConfigured: true,
            audienceConfigured: true,
            jwksConfigured: true,
            strictRolloutPercent: 100,
        });
    });
    (0, vitest_1.it)("returns configured strict rollout percent", () => {
        process.env.ASSISTANT_STRICT_ROLLOUT_PERCENT = "25";
        (0, vitest_1.expect)(service.getPublicStatus().strictRolloutPercent).toBe(25);
    });
    (0, vitest_1.it)("throws when strict rollout percent is not numeric", () => {
        process.env.ASSISTANT_STRICT_ROLLOUT_PERCENT = "abc";
        (0, vitest_1.expect)(() => service.assertValidForStartup()).toThrow(/ASSISTANT_STRICT_ROLLOUT_PERCENT must be a valid number/);
    });
    (0, vitest_1.it)("throws when strict rollout percent is out of range", () => {
        process.env.ASSISTANT_STRICT_ROLLOUT_PERCENT = "-1";
        (0, vitest_1.expect)(() => service.assertValidForStartup()).toThrow(/ASSISTANT_STRICT_ROLLOUT_PERCENT must be between 0 and 100/);
        process.env.ASSISTANT_STRICT_ROLLOUT_PERCENT = "101";
        (0, vitest_1.expect)(() => service.assertValidForStartup()).toThrow(/ASSISTANT_STRICT_ROLLOUT_PERCENT must be between 0 and 100/);
    });
});
