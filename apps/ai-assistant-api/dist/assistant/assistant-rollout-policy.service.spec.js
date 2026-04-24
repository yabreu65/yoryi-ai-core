"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const assistant_rollout_policy_service_1 = require("./assistant-rollout-policy.service");
(0, vitest_1.describe)("AssistantRolloutPolicyService", () => {
    (0, vitest_1.afterEach)(() => {
        delete process.env.ASSISTANT_GLOBAL_ENABLED;
        delete process.env.ASSISTANT_ROLLOUT_MODE;
        delete process.env.ASSISTANT_ROLLOUT_TENANTS;
        delete process.env.ASSISTANT_ROLLOUT_CANARY_PERCENT;
        delete process.env.ASSISTANT_ROLLOUT_CANARY_SEED;
        delete process.env.ASSISTANT_ROLLOUT_EXCLUDED_TENANTS;
    });
    (0, vitest_1.it)("disables assistant globally when kill switch is active", () => {
        process.env.ASSISTANT_GLOBAL_ENABLED = "false";
        const service = new assistant_rollout_policy_service_1.AssistantRolloutPolicyService();
        const decision = service.evaluate({ tenantId: "tenant-1" });
        (0, vitest_1.expect)(decision.enabled).toBe(false);
        (0, vitest_1.expect)(decision.reason).toBe("assistant_global_disabled");
    });
    (0, vitest_1.it)("enables allowlisted tenants only in allowlist mode", () => {
        process.env.ASSISTANT_ROLLOUT_MODE = "allowlist";
        process.env.ASSISTANT_ROLLOUT_TENANTS = "tenant-a,tenant-b";
        const service = new assistant_rollout_policy_service_1.AssistantRolloutPolicyService();
        const enabled = service.evaluate({ tenantId: "tenant-a" });
        const disabled = service.evaluate({ tenantId: "tenant-z" });
        (0, vitest_1.expect)(enabled.enabled).toBe(true);
        (0, vitest_1.expect)(enabled.reason).toBe("tenant_allowlisted");
        (0, vitest_1.expect)(disabled.enabled).toBe(false);
        (0, vitest_1.expect)(disabled.reason).toBe("tenant_not_allowlisted");
    });
    (0, vitest_1.it)("uses deterministic canary bucketing", () => {
        process.env.ASSISTANT_ROLLOUT_MODE = "canary";
        process.env.ASSISTANT_ROLLOUT_CANARY_PERCENT = "10";
        process.env.ASSISTANT_ROLLOUT_CANARY_SEED = "seed-fixed";
        const service = new assistant_rollout_policy_service_1.AssistantRolloutPolicyService();
        const first = service.evaluate({ tenantId: "tenant-demo" });
        const second = service.evaluate({ tenantId: "tenant-demo" });
        (0, vitest_1.expect)(first.enabled).toBe(second.enabled);
        (0, vitest_1.expect)(first.reason).toBe(second.reason);
        (0, vitest_1.expect)(first.canaryPercent).toBe(10);
    });
    (0, vitest_1.it)("blocks missing tenant when rollout mode requires tenant scoping", () => {
        process.env.ASSISTANT_ROLLOUT_MODE = "canary";
        const service = new assistant_rollout_policy_service_1.AssistantRolloutPolicyService();
        const decision = service.evaluate({});
        (0, vitest_1.expect)(decision.enabled).toBe(false);
        (0, vitest_1.expect)(decision.reason).toBe("tenant_required_for_rollout");
    });
});
