export const ASSISTANT_RESOLVED_LEVELS = [
  "P0",
  "P1",
  "P2B",
  "P2",
  "P3",
  "FALLBACK",
] as const;

export type AssistantResolvedLevel = (typeof ASSISTANT_RESOLVED_LEVELS)[number];

export type AssistantTurnGatewayOutcome =
  | "success"
  | "null"
  | "error"
  | "denied"
  | "unavailable"
  | "timeout"
  | "contract_mismatch"
  | "invalid_payload";

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
  fallbackPath: string;
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
};
