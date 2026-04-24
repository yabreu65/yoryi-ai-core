import type { AssistantRuntimeContext } from "@yoryi/ai-types";
import type { AssistantDataScope, AssistantResponseType } from "@yoryi/ai-core";
type QualityPersona = "admin" | "resident" | "security";
export type AssistantPhase7QualityCase = {
    id: string;
    persona: QualityPersona;
    message: string;
    context: Partial<AssistantRuntimeContext>;
    authContext: Partial<AssistantRuntimeContext>;
    env?: Partial<Record<string, string>>;
    expected: {
        answerSource: "live_data" | "knowledge" | "fallback";
        responseType: AssistantResponseType;
        dataScope: AssistantDataScope;
        expectedTenantId: string;
        answerIncludes?: string;
    };
};
export declare const PHASE7_QUALITY_CASES: AssistantPhase7QualityCase[];
export {};
