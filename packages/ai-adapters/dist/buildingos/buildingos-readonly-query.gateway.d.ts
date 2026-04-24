import type { DataBackedAnswerResult, ResolvedAssistantContext } from "@yoryi/ai-types";
import type { BuildingOSCanonicalIntentCode } from "./buildingos-intent-registry";
export type BuildingOSReadOnlyQueryInput = {
    intentCode: BuildingOSCanonicalIntentCode;
    question: string;
    context: ResolvedAssistantContext;
};
export interface BuildingOSReadOnlyQueryGateway {
    query(input: BuildingOSReadOnlyQueryInput): Promise<DataBackedAnswerResult | null>;
}
