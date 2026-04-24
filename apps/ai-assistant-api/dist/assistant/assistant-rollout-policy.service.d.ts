import type { AssistantRuntimeContext } from "@yoryi/ai-types";
export type AssistantRolloutDecision = {
    enabled: boolean;
    mode: "global" | "allowlist" | "canary";
    reason: string;
    canaryPercent?: number;
};
export declare class AssistantRolloutPolicyService {
    evaluate(context: Pick<AssistantRuntimeContext, "tenantId">): AssistantRolloutDecision;
    private resolveMode;
    private resolveCanaryPercent;
    private computeTenantBucket;
    private parseList;
}
