export const ASSISTANT_RESPONSE_SCHEMA_VERSION = "2026-04-p0-response-v1";
export const ASSISTANT_RESPONSE_SCHEMA_VERSION_V2 = "2026-05-p2-response-v2";

export type AssistantResponseSourceV1 = "live_data" | "fallback";
export type AssistantResponseSourceV2 = "live_data" | "snapshot" | "clarification";
export type AssistantResponseSource = AssistantResponseSourceV1 | AssistantResponseSourceV2;

export type AssistantResponseType =
  | "metric"
  | "list"
  | "summary"
  | "no_data"
  | "clarification";

export type AssistantDataScope = "tenant" | "self" | "module" | "unknown";

export type AssistantResponseAction = {
  key: string;
  label: string;
  description?: string;
  requiresConfirmation?: boolean;
  destructive?: boolean;
  requiredPermission?: string;
};

export type AssistantResponseSchema = {
  contractVersion: string;
  answer: string;
  answerSource: AssistantResponseSource;
  responseType: AssistantResponseType;
  dataScope: AssistantDataScope;
  actions: AssistantResponseAction[];
  metadata: Record<string, unknown>;
};

export function isAssistantResponseSchemaV1(value: unknown): value is AssistantResponseSchema {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.contractVersion === ASSISTANT_RESPONSE_SCHEMA_VERSION &&
    isNonEmptyString(value.answer) &&
    (value.answerSource === "live_data" || value.answerSource === "fallback") &&
    isResponseType(value.responseType) &&
    isDataScope(value.dataScope) &&
    Array.isArray(value.actions) &&
    isRecord(value.metadata)
  );
}

export function isAssistantResponseSchemaV2(value: unknown): value is AssistantResponseSchema {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.contractVersion === ASSISTANT_RESPONSE_SCHEMA_VERSION_V2 &&
    isNonEmptyString(value.answer) &&
    (value.answerSource === "live_data" || value.answerSource === "snapshot" || value.answerSource === "clarification") &&
    isResponseType(value.responseType) &&
    isDataScope(value.dataScope) &&
    Array.isArray(value.actions) &&
    isRecord(value.metadata)
  );
}

export function isAssistantResponseSchema(value: unknown): value is AssistantResponseSchema {
  return isAssistantResponseSchemaV1(value) || isAssistantResponseSchemaV2(value);
}

function isResponseType(value: unknown): value is AssistantResponseType {
  return (
    value === "metric" ||
    value === "list" ||
    value === "summary" ||
    value === "no_data" ||
    value === "clarification"
  );
}

function isDataScope(value: unknown): value is AssistantDataScope {
  return (
    value === "tenant" ||
    value === "self" ||
    value === "module" ||
    value === "unknown"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
