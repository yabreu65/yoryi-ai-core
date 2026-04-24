"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const health_controller_1 = require("./health.controller");
(0, vitest_1.describe)("HealthController", () => {
    (0, vitest_1.it)("returns healthy when auth is ready", () => {
        const controller = new health_controller_1.HealthController({
            isReady: () => true,
            getPublicStatus: () => ({
                strictMode: true,
                verificationMode: "hs256",
                issuerConfigured: true,
                audienceConfigured: true,
                jwksConfigured: false,
                strictRolloutPercent: 100,
            }),
        });
        const result = controller.check();
        (0, vitest_1.expect)(result.status).toBe("healthy");
        (0, vitest_1.expect)(result.checks.adapter.status).toBe("ok");
        (0, vitest_1.expect)(result.checks.database.status).toBe("ok");
        (0, vitest_1.expect)(result.timestamp).toBeDefined();
    });
    (0, vitest_1.it)("returns unhealthy when auth is not ready", () => {
        const controller = new health_controller_1.HealthController({
            isReady: () => false,
            getPublicStatus: () => ({}),
        });
        const result = controller.check();
        (0, vitest_1.expect)(result.status).toBe("unhealthy");
        (0, vitest_1.expect)(result.checks.adapter.status).toBe("error");
    });
});
