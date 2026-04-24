import { afterEach, describe, expect, it } from "vitest";
import { AssistantRolloutPolicyService } from "./assistant-rollout-policy.service";

describe("AssistantRolloutPolicyService", () => {
  afterEach(() => {
    delete process.env.ASSISTANT_GLOBAL_ENABLED;
    delete process.env.ASSISTANT_ROLLOUT_MODE;
    delete process.env.ASSISTANT_ROLLOUT_TENANTS;
    delete process.env.ASSISTANT_ROLLOUT_CANARY_PERCENT;
    delete process.env.ASSISTANT_ROLLOUT_CANARY_SEED;
    delete process.env.ASSISTANT_ROLLOUT_EXCLUDED_TENANTS;
  });

  it("disables assistant globally when kill switch is active", () => {
    process.env.ASSISTANT_GLOBAL_ENABLED = "false";
    const service = new AssistantRolloutPolicyService();

    const decision = service.evaluate({ tenantId: "tenant-1" });
    expect(decision.enabled).toBe(false);
    expect(decision.reason).toBe("assistant_global_disabled");
  });

  it("enables allowlisted tenants only in allowlist mode", () => {
    process.env.ASSISTANT_ROLLOUT_MODE = "allowlist";
    process.env.ASSISTANT_ROLLOUT_TENANTS = "tenant-a,tenant-b";
    const service = new AssistantRolloutPolicyService();

    const enabled = service.evaluate({ tenantId: "tenant-a" });
    const disabled = service.evaluate({ tenantId: "tenant-z" });

    expect(enabled.enabled).toBe(true);
    expect(enabled.reason).toBe("tenant_allowlisted");
    expect(disabled.enabled).toBe(false);
    expect(disabled.reason).toBe("tenant_not_allowlisted");
  });

  it("uses deterministic canary bucketing", () => {
    process.env.ASSISTANT_ROLLOUT_MODE = "canary";
    process.env.ASSISTANT_ROLLOUT_CANARY_PERCENT = "10";
    process.env.ASSISTANT_ROLLOUT_CANARY_SEED = "seed-fixed";
    const service = new AssistantRolloutPolicyService();

    const first = service.evaluate({ tenantId: "tenant-demo" });
    const second = service.evaluate({ tenantId: "tenant-demo" });

    expect(first.enabled).toBe(second.enabled);
    expect(first.reason).toBe(second.reason);
    expect(first.canaryPercent).toBe(10);
  });

  it("blocks missing tenant when rollout mode requires tenant scoping", () => {
    process.env.ASSISTANT_ROLLOUT_MODE = "canary";
    const service = new AssistantRolloutPolicyService();

    const decision = service.evaluate({});
    expect(decision.enabled).toBe(false);
    expect(decision.reason).toBe("tenant_required_for_rollout");
  });
});
