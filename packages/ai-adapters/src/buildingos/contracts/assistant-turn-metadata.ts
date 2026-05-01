import type { GatewayOutcome, FallbackPath } from "../observability/enums";
import type { IntentFamily } from "../intent-library/schema";

export const ASSISTANT_RESOLVED_LEVELS = [
  "P0",
  "P1",
  "P2B",
  "P2",
  "P3",
  "FALLBACK",
] as const;

export type AssistantResolvedLevel = (typeof ASSISTANT_RESOLVED_LEVELS)[number];

export { GATEWAY_OUTCOMES } from "../observability/enums";
export { FALLBACK_PATHS } from "../observability/enums";
export type { GatewayOutcome, FallbackPath } from "../observability/enums";

export type AssistantTurnGatewayOutcome = GatewayOutcome;

export type AssistantTurnCompletedMetadata = {
  traceId: string;
  timestamp: string;
  tenantId: string;
  userId?: string;
  role: string;
  buildingId?: string;
  unitId?: string;
  resolvedLevel: AssistantResolvedLevel;
  resolvedIntentCode?: string;
  toolName?: string;
  fallbackPath: FallbackPath;
  gatewayOutcome: AssistantTurnGatewayOutcome;
  latencyMsTotal: number;
  latencyMsRouting: number;
  latencyMsGateway?: number;
  p0EnforcementEnabled: boolean;
  p3Enabled: boolean;
  intentLibraryMatched?: boolean;
  intentLibraryConfidence?: number;
  intentLibraryIntentCode?: string;
  clarificationAsked?: boolean;
  missingEntities?: string[];
  defaultsApplied?: string[];
  familyChosen?: IntentFamily;
};

export type AssistantTurnDebugMetadata = {
  matchedUtterance?: string;
  topCandidates?: Array<{
    intentCode: string;
    level: string;
    confidence: number;
    family?: IntentFamily;
  }>;
};

export type AssistantTurnCompletedMetadataWithDebug = AssistantTurnCompletedMetadata & {
  debug?: AssistantTurnDebugMetadata;
};
