import type { IntentLibraryIntent } from "../intent-library/schema";

/**
 * Static map of intentCode to TTL in seconds.
 * This should be versioned and updated as intents change.
 * In a production system, this might come from a configuration service or be derived from the intent registry.
 */
export const INTENT_TTL_MAP: Record<string, number> = {
  // P0 intents - operational data (shorter TTL as it changes more frequently)
  "get_unit_balance": 30, // 30 seconds
  "get_unit_payments": 30,
  "get_unit_debt": 30,
  "get_unit_charges": 30,
  "get_unit_balance_by_period": 60,
  "get_unit_profile": 300, // 5 minutes
  "resolve_unit_ref": 60,
  "search_payments": 60,
  "search_tickets": 60,
  "analytics_debt_aging": 300,
  "get_building_debt_trend": 300,
  "get_collections_trend": 300,

  // P1 intents - financial data (can be longer TTL as financials are often period-closed)
  "get_financial_summary": 1800, // 30 minutes
  "get_expense_report": 1800,
  "get_income_statement": 1800,
  "get_cash_flow": 1800,

  // Default TTL for intents not explicitly listed
  "default": 60,
};

/**
 * Get TTL for a given intentCode.
 * Falls back to default if not found.
 */
export function ttlForIntent(intentCode: string): number {
  return INTENT_TTL_MAP[intentCode] ?? INTENT_TTL_MAP["default"];
}