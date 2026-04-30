export const GATEWAY_OUTCOMES = [
  "success",
  "null",
  "error",
  "denied",
  "timeout",
  "unavailable",
  "invalid_entities",
  "invalid_payload",
  "missing_entities",
  "cache_hit",
  "cache_miss",
] as const;

export type GatewayOutcome = (typeof GATEWAY_OUTCOMES)[number];

export const FALLBACK_PATHS = [
  "none",
  "intent_library_answer",
  "intent_library_clarification",
  "intent_library_no_match",
  "intent_library_tool_success",
  "intent_library_tool_null",
  "intent_library_tool_error",
  "invalid_entities",
  "cache_hit",
  "cache_miss",
  "p0_financial_bypass",
  "p0_enforced_no_data",
  "rag_used",
  "rag_no_sources",
  "hitl_created",
  "blocked_rbac",
  "blocked_mutation",
  "routing_no_match",
  "p0_gateway_missing",
  "p0_gateway_unavailable",
  "p1_gateway_no_result",
  "p1_gateway_error",
  "forced_unit_debt_gateway_missing",
  "forced_unit_debt_no_match",
  "forced_unit_debt_gateway_error",
  "p0_enforcement_operational_unavailable",
  "classifier_operational_fallback",
  "ambiguous_unit_building_query",
  "pending_clarification_invalid_option",
  "pending_clarification_expired",
  "aggregate_scope_required",
  "unit_lookup_ambiguous",
  "payment_missing_building_token",
  "payment_scope_required",
] as const;

export type FallbackPath = (typeof FALLBACK_PATHS)[number];

export function isValidGatewayOutcome(v: unknown): v is GatewayOutcome {
  return GATEWAY_OUTCOMES.includes(v as GatewayOutcome);
}

export function isValidFallbackPath(v: unknown): v is FallbackPath {
  return FALLBACK_PATHS.includes(v as FallbackPath);
}

export function assertGatewayOutcome(v: unknown, context?: string): GatewayOutcome {
  if (!isValidGatewayOutcome(v)) {
    const msg = context ? `Invalid gatewayOutcome: ${v} (${context})` : `Invalid gatewayOutcome: ${v}`;
    throw new Error(msg);
  }
  return v;
}

export function assertFallbackPath(v: unknown, context?: string): FallbackPath {
  if (!isValidFallbackPath(v)) {
    const msg = context ? `Invalid fallbackPath: ${v} (${context})` : `Invalid fallbackPath: ${v}`;
    throw new Error(msg);
  }
  return v;
}
