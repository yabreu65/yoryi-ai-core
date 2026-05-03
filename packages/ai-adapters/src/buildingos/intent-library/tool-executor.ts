import type { DataBackedAnswerResult, ResolvedAssistantContext } from "@yoryi/ai-types";
import type { BuildingOSFinancialGateway } from "../buildingos-financial.gateway";
import type {
  BuildingOSReadOnlyQueryGateway,
  BuildingOSReadOnlyQueryInput,
} from "../buildingos-readonly-query.gateway";
import type { BuildingOSCanonicalIntentCode } from "../buildingos-intent-registry";
import type { IntentLibraryIntent } from "./schema";

export type IntentLibraryExecutionStatus = "success" | "null" | "error" | "denied";

export type IntentLibraryToolExecutionInput = {
  intent: IntentLibraryIntent;
  context: ResolvedAssistantContext;
  question: string;
  entities: Record<string, string | undefined>;
  readOnlyQueryGateway?: BuildingOSReadOnlyQueryGateway;
  financialGateway?: BuildingOSFinancialGateway;
};

export type IntentLibraryToolExecutionResult = {
  status: IntentLibraryExecutionStatus;
  sourceType: "live_data";
  latencyMsGateway: number;
  data: Record<string, unknown>;
  gatewayResult?: DataBackedAnswerResult | null;
};

function logToolAccess(event: {
  intentCode: string;
  toolName?: string;
  tenantId?: string;
  outcome: IntentLibraryExecutionStatus | "skipped";
  reason?: string;
  latencyMsGateway: number;
}): void {
  console.log("[INTENT_TOOL_ACCESS]", event);
}

function formatCurrency(value: number, currency = "ARS"): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function normalizeDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

function formatValue(value: unknown, fieldName: string, data: Record<string, unknown>): string {
  if (value === null || value === undefined) return "N/D";

  const lowerField = fieldName.toLowerCase();
  const currency =
    typeof data.currency === "string" && data.currency.trim().length > 0
      ? data.currency
      : "ARS";

  if (typeof value === "number") {
    if (
      lowerField.includes("amount") ||
      lowerField === "amount" ||
      lowerField.includes("debt") ||
      lowerField.includes("saldo")
    ) {
      return formatCurrency(value, currency);
    }
    return String(value);
  }

  if (typeof value === "string") {
    const normalizedDate = normalizeDate(value);
    if (normalizedDate && (lowerField.includes("date") || lowerField.includes("asof"))) {
      return normalizedDate;
    }
    return value;
  }

  return String(value);
}

export function renderCanonicalTemplate(
  template: string,
  outputMapping: Record<string, string>,
  data: Record<string, unknown>
): { answer: string; unresolvedVariables: string[] } {
  const unresolvedVariables: string[] = [];

  const answer = template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, variableName: string) => {
    const mappedField = outputMapping[variableName] ?? variableName;
    const raw = data[mappedField];
    if (raw === null || raw === undefined || raw === "") {
      unresolvedVariables.push(variableName);
      return "N/D";
    }

    return formatValue(raw, variableName, data);
  });

  return { answer, unresolvedVariables };
}

function mapGatewayData(
  intent: IntentLibraryIntent,
  gatewayResult: DataBackedAnswerResult | null
): Record<string, unknown> {
  const metadata = (gatewayResult?.metadata ?? {}) as Record<string, unknown>;
  const outputMapping = intent.toolBinding?.outputMapping ?? {};
  const merged: Record<string, unknown> = {
    ...metadata,
  };

  for (const mappedField of Object.values(outputMapping)) {
    if (!(mappedField in merged)) {
      merged[mappedField] = undefined;
    }
  }

  if (typeof merged.status !== "string") {
    merged.status = "operativo";
  }

  return merged;
}

function buildToolInput(
  intentCode: string,
  entities: Record<string, string | undefined>
): Record<string, unknown> {
  const toolInput: Record<string, unknown> = {};
  if (entities.userId) toolInput.userId = entities.userId;
  if (entities.unitId) toolInput.unitId = entities.unitId;
  if (entities.buildingId) toolInput.buildingId = entities.buildingId;
  if (entities.towerId) toolInput.towerId = entities.towerId;
  if (entities.period) {
    toolInput.period = entities.period;
  } else if (intentCode === "GET_BUILDING_DEBT_TOTAL") {
    toolInput.period = "today";
  }
  if (intentCode === "COLLECTION_EFFICIENCY") {
    toolInput.mode = "last_payment";
    toolInput.ranking = 1;
  }
  return toolInput;
}

function isFinancialTool(toolName: string): boolean {
  return toolName === "financial_resident_debt";
}

function isSupportedReadOnlyTool(toolName: string): boolean {
  return [
    "resolve_unit_ref",
    "get_unit_payments",
    "get_unit_balance",
    "get_unit_balance_by_period",
    "get_unit_profile",
    "search_payments",
    "search_tickets",
    "analytics_debt_aging",
    "analytics_debt_by_tower",
    "get_unit_debt_trend",
    "get_building_debt_trend",
    "get_collections_trend",
  ].includes(toolName);
}

export async function executeIntentLibraryTool(
  input: IntentLibraryToolExecutionInput
): Promise<IntentLibraryToolExecutionResult> {
  const startedAt = Date.now();
  const toolName = input.intent.toolBinding?.toolName;

  if (!toolName) {
    logToolAccess({
      intentCode: input.intent.intentCode,
      toolName,
      tenantId: input.context.tenantId,
      outcome: "null",
      reason: "missing_tool_name",
      latencyMsGateway: Date.now() - startedAt,
    });
    return {
      status: "null",
      sourceType: "live_data",
      latencyMsGateway: Date.now() - startedAt,
      data: {},
      gatewayResult: null,
    };
  }

  if (isFinancialTool(toolName)) {
    if (!input.financialGateway || !input.context.tenantId) {
      logToolAccess({
        intentCode: input.intent.intentCode,
        toolName,
        tenantId: input.context.tenantId,
        outcome: "error",
        reason: "financial_gateway_or_tenant_missing",
        latencyMsGateway: Date.now() - startedAt,
      });
      return {
        status: "error",
        sourceType: "live_data",
        latencyMsGateway: Date.now() - startedAt,
        data: {},
      };
    }

    try {
      const debt = await input.financialGateway.getResidentDebtSummary({
        tenantId: input.context.tenantId,
        userId: input.context.userId,
      });

      if (!debt) {
        logToolAccess({
          intentCode: input.intent.intentCode,
          toolName,
          tenantId: input.context.tenantId,
          outcome: "null",
          reason: "financial_gateway_no_data",
          latencyMsGateway: Date.now() - startedAt,
        });
        return {
          status: "null",
          sourceType: "live_data",
          latencyMsGateway: Date.now() - startedAt,
          data: {},
        };
      }

      logToolAccess({
        intentCode: input.intent.intentCode,
        toolName,
        tenantId: input.context.tenantId,
        outcome: "success",
        latencyMsGateway: Date.now() - startedAt,
      });
      return {
        status: "success",
        sourceType: "live_data",
        latencyMsGateway: Date.now() - startedAt,
        data: {
          amount: debt.amount,
          currency: debt.currency,
          asOf: debt.asOf,
          overdueAmount: debt.amount,
          dueDate: debt.asOf,
          status: "en mora",
        },
      };
    } catch {
      logToolAccess({
        intentCode: input.intent.intentCode,
        toolName,
        tenantId: input.context.tenantId,
        outcome: "error",
        reason: "financial_gateway_exception",
        latencyMsGateway: Date.now() - startedAt,
      });
      return {
        status: "error",
        sourceType: "live_data",
        latencyMsGateway: Date.now() - startedAt,
        data: {},
      };
    }
  }

  if (!input.readOnlyQueryGateway) {
    logToolAccess({
      intentCode: input.intent.intentCode,
      toolName,
      tenantId: input.context.tenantId,
      outcome: "error",
      reason: "readonly_gateway_missing",
      latencyMsGateway: Date.now() - startedAt,
    });
    return {
      status: "error",
      sourceType: "live_data",
      latencyMsGateway: Date.now() - startedAt,
      data: {},
    };
  }

  if (!isSupportedReadOnlyTool(toolName)) {
    logToolAccess({
      intentCode: input.intent.intentCode,
      toolName,
      tenantId: input.context.tenantId,
      outcome: "error",
      reason: "unsupported_readonly_tool",
      latencyMsGateway: Date.now() - startedAt,
    });
    return {
      status: "error",
      sourceType: "live_data",
      latencyMsGateway: Date.now() - startedAt,
      data: {},
    };
  }

  if (!input.context.tenantId) {
    logToolAccess({
      intentCode: input.intent.intentCode,
      toolName,
      tenantId: input.context.tenantId,
      outcome: "error",
      reason: "missing_tenant_id",
      latencyMsGateway: Date.now() - startedAt,
    });
    return {
      status: "error",
      sourceType: "live_data",
      latencyMsGateway: Date.now() - startedAt,
      data: {},
    };
  }

  const queryInput: BuildingOSReadOnlyQueryInput = {
    intentCode: input.intent.intentCode as BuildingOSCanonicalIntentCode,
    question: input.question,
    context: input.context,
    toolName: toolName as BuildingOSReadOnlyQueryInput["toolName"],
    toolInput: {
      ...buildToolInput(input.intent.intentCode, input.entities),
      ...(input.context.role === "RESIDENT" ? { scope: "self" } : {}),
    },
  };

  try {
    const gatewayResult = await input.readOnlyQueryGateway.query(queryInput);
    if (!gatewayResult) {
      logToolAccess({
        intentCode: input.intent.intentCode,
        toolName,
        tenantId: input.context.tenantId,
        outcome: "null",
        reason: "readonly_gateway_no_data",
        latencyMsGateway: Date.now() - startedAt,
      });
      return {
        status: "null",
        sourceType: "live_data",
        latencyMsGateway: Date.now() - startedAt,
        data: {},
        gatewayResult,
      };
    }

    logToolAccess({
      intentCode: input.intent.intentCode,
      toolName,
      tenantId: input.context.tenantId,
      outcome: "success",
      latencyMsGateway: Date.now() - startedAt,
    });
    return {
      status: "success",
      sourceType: "live_data",
      latencyMsGateway: Date.now() - startedAt,
      data: mapGatewayData(input.intent, gatewayResult),
      gatewayResult,
    };
  } catch {
    logToolAccess({
      intentCode: input.intent.intentCode,
      toolName,
      tenantId: input.context.tenantId,
      outcome: "error",
      reason: "readonly_gateway_exception",
      latencyMsGateway: Date.now() - startedAt,
    });
    return {
      status: "error",
      sourceType: "live_data",
      latencyMsGateway: Date.now() - startedAt,
      data: {},
    };
  }
}
