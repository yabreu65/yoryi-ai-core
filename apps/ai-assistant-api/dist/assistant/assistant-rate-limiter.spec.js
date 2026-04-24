"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const assistant_rate_limiter_1 = require("./assistant-rate-limiter");
(0, vitest_1.describe)("InMemoryAssistantRateLimiter", () => {
    (0, vitest_1.it)("blocks requests when max requests are reached within the window", () => {
        const limiter = new assistant_rate_limiter_1.InMemoryAssistantRateLimiter({
            enabled: true,
            maxRequests: 2,
            windowMs: 1000,
        });
        const first = limiter.consume({
            appId: "buildingos",
            tenantId: "tenant-1",
            userId: "user-1",
            operation: "chat",
        }, 100);
        const second = limiter.consume({
            appId: "buildingos",
            tenantId: "tenant-1",
            userId: "user-1",
            operation: "chat",
        }, 200);
        const third = limiter.consume({
            appId: "buildingos",
            tenantId: "tenant-1",
            userId: "user-1",
            operation: "chat",
        }, 300);
        (0, vitest_1.expect)(first.allowed).toBe(true);
        (0, vitest_1.expect)(second.allowed).toBe(true);
        (0, vitest_1.expect)(third.allowed).toBe(false);
    });
    (0, vitest_1.it)("resets quota after the rate window elapses", () => {
        const limiter = new assistant_rate_limiter_1.InMemoryAssistantRateLimiter({
            enabled: true,
            maxRequests: 1,
            windowMs: 1000,
        });
        limiter.consume({
            appId: "buildingos",
            tenantId: "tenant-1",
            userId: "user-1",
            operation: "chat",
        }, 100);
        const blocked = limiter.consume({
            appId: "buildingos",
            tenantId: "tenant-1",
            userId: "user-1",
            operation: "chat",
        }, 500);
        const afterWindow = limiter.consume({
            appId: "buildingos",
            tenantId: "tenant-1",
            userId: "user-1",
            operation: "chat",
        }, 1101);
        (0, vitest_1.expect)(blocked.allowed).toBe(false);
        (0, vitest_1.expect)(afterWindow.allowed).toBe(true);
    });
});
