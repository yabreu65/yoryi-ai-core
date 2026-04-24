import type {
  DataBackedAnswerResult,
  ResolvedAssistantContext,
} from "@yoryi/ai-types";
import type { BuildingOSCanonicalIntentCode } from "./buildingos-intent-registry";

export type BuildingOSReadOnlyQueryInput = {
  intentCode: BuildingOSCanonicalIntentCode;
  question: string;
  context: ResolvedAssistantContext;
  toolName?:
    | "resolve_unit_ref"
    | "get_unit_balance"
    | "get_unit_profile"
    | "search_payments"
    | "search_tickets";
  toolInput?: Record<string, unknown>;
};

export interface BuildingOSReadOnlyQueryGateway {
  query(input: BuildingOSReadOnlyQueryInput): Promise<DataBackedAnswerResult | null>;
}
