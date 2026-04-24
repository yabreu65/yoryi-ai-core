import { createHash } from "node:crypto";
import type { AssistantRuntimeContext } from "@yoryi/ai-types";

export type AssistantRolloutDecision = {
  enabled: boolean;
  mode: "global" | "allowlist" | "canary";
  reason: string;
  canaryPercent?: number;
};

export class AssistantRolloutPolicyService {
  evaluate(context: Pick<AssistantRuntimeContext, "tenantId">): AssistantRolloutDecision {
    if (process.env.ASSISTANT_GLOBAL_ENABLED === "false") {
      return {
        enabled: false,
        mode: "global",
        reason: "assistant_global_disabled",
      };
    }

    const tenantId = context.tenantId;
    const excludedTenants = this.parseList(process.env.ASSISTANT_ROLLOUT_EXCLUDED_TENANTS);
    if (tenantId && excludedTenants.has(tenantId)) {
      return {
        enabled: false,
        mode: "global",
        reason: "tenant_excluded",
      };
    }

    const mode = this.resolveMode();
    if (mode === "global") {
      return {
        enabled: true,
        mode,
        reason: "global_enabled",
      };
    }

    if (!tenantId) {
      return {
        enabled: false,
        mode,
        reason: "tenant_required_for_rollout",
        canaryPercent: mode === "canary" ? this.resolveCanaryPercent() : undefined,
      };
    }

    if (mode === "allowlist") {
      const allowlist = this.parseList(process.env.ASSISTANT_ROLLOUT_TENANTS);
      const enabled = allowlist.has(tenantId);
      return {
        enabled,
        mode,
        reason: enabled ? "tenant_allowlisted" : "tenant_not_allowlisted",
      };
    }

    const canaryPercent = this.resolveCanaryPercent();
    const bucket = this.computeTenantBucket(tenantId);
    const enabled = bucket < canaryPercent;
    return {
      enabled,
      mode,
      reason: enabled ? "tenant_inside_canary_bucket" : "tenant_outside_canary_bucket",
      canaryPercent,
    };
  }

  private resolveMode(): "global" | "allowlist" | "canary" {
    const configured = (process.env.ASSISTANT_ROLLOUT_MODE ?? "global")
      .trim()
      .toLowerCase();

    if (configured === "allowlist" || configured === "canary") {
      return configured;
    }
    return "global";
  }

  private resolveCanaryPercent(): number {
    const raw = process.env.ASSISTANT_ROLLOUT_CANARY_PERCENT;
    const parsed = Number(raw ?? 100);
    if (!Number.isFinite(parsed)) {
      return 100;
    }
    if (parsed < 0) return 0;
    if (parsed > 100) return 100;
    return Math.floor(parsed);
  }

  private computeTenantBucket(tenantId: string): number {
    const seed = process.env.ASSISTANT_ROLLOUT_CANARY_SEED ?? "assistant-rollout";
    const digest = createHash("sha256")
      .update(`${seed}:${tenantId}`)
      .digest();
    return digest.readUInt32BE(0) % 100;
  }

  private parseList(raw: string | undefined): Set<string> {
    if (!raw) {
      return new Set();
    }
    return new Set(
      raw
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    );
  }
}
