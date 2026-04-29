import type {
  ActionDefinition,
  ActionExecutionInput,
  ActionExecutionResult,
  AppModuleDefinition,
  DataBackedAnswerInput,
  DataBackedAnswerResult,
  ResolvedAssistantContext,
  RoleDefinition,
  RuntimeContextInput,
  SaasAssistantAdapter,
  KnowledgeScope,
} from "@yoryi/ai-types";
import type { BuildingOSFinancialGateway } from "./buildingos-financial.gateway";
import type {
  BuildingOSReadOnlyQueryGateway,
  BuildingOSReadOnlyQueryInput,
} from "./buildingos-readonly-query.gateway";
import { BuildingOSIntentClassifier } from "./buildingos-intent-classifier";
import { BuildingOSP0Router } from "./buildingos-p0-router";
import { BuildingOSP1Router } from "./buildingos-p1-router";
import { BuildingOSP2Router } from "./buildingos-p2-router";
import { BuildingOSP2BRouter } from "./buildingos-p2b-router";
import { BuildingOSP3Router } from "./buildingos-p3-router";
import {
  type BuildingOSCanonicalIntentCode,
  getBuildingOSIntentDefinition,
} from "./buildingos-intent-registry";

export type BuildingOSAdapterOptions = {
  financialGateway?: BuildingOSFinancialGateway;
  readOnlyQueryGateway?: BuildingOSReadOnlyQueryGateway;
};

type GatewayOutcome = "success" | "denied" | "unavailable" | "timeout" | "contract_mismatch" | "invalid_payload";

function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

type PendingClarification = {
  intentCode: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  timestamp: number;
  sessionId?: string;
  clarificationOptionChosen?: number;
  options: Array<{
    index: number;
    label: string;
    intentCode: string;
    toolName: string;
    toolInput: Record<string, unknown>;
  }>;
};

type BuildingOSActionRegistryEntry = {
  execution: {
    type: "navigate" | "workflow";
    targetPath?: string;
    workflowKey?: string;
  };
  requiredPermission?: string;
  requiresConfirmation?: boolean;
  destructive?: boolean;
};

const BUILDINGOS_ACTION_REGISTRY: Record<string, BuildingOSActionRegistryEntry> = {
  "open-buildings": {
    execution: { type: "navigate", targetPath: "/tenant/buildings" },
    requiredPermission: "buildings.read",
  },
  "open-units": {
    execution: { type: "navigate", targetPath: "/tenant/units" },
    requiredPermission: "units.read",
  },
  "open-charges": {
    execution: { type: "navigate", targetPath: "/tenant/charges" },
    requiredPermission: "charges.read",
  },
  "review-generated-charges": {
    execution: { type: "workflow", workflowKey: "charges.review_generated" },
    requiredPermission: "charges.write",
  },
  "publish-charges": {
    execution: { type: "workflow", workflowKey: "charges.publish" },
    requiredPermission: "charges.publish",
    requiresConfirmation: true,
    destructive: true,
  },
  "open-payments": {
    execution: { type: "navigate", targetPath: "/tenant/payments" },
    requiredPermission: "payments.read",
  },
  "view-payment-history": {
    execution: { type: "navigate", targetPath: "/resident/payments/history" },
    requiredPermission: "payments.read",
  },
  "review-pending-payments": {
    execution: { type: "workflow", workflowKey: "payments.review_pending" },
    requiredPermission: "payments.approve",
  },
  "view-all-payments": {
    execution: { type: "navigate", targetPath: "/tenant/payments?scope=all" },
    requiredPermission: "payments.approve",
  },
  "view-pending-charges": {
    execution: { type: "navigate", targetPath: "/resident/finanzas?view=pending" },
    requiredPermission: "charges.read",
  },
  "view-my-balance": {
    execution: { type: "navigate", targetPath: "/resident/finanzas?view=balance" },
    requiredPermission: "charges.read",
  },
  "report-payment": {
    execution: { type: "navigate", targetPath: "/resident/payments/report" },
    requiredPermission: "payments.write",
  },
  "upload-payment-proof": {
    execution: { type: "navigate", targetPath: "/resident/payments/report?step=proof" },
    requiredPermission: "payments.write",
  },
  "view-my-charges": {
    execution: { type: "navigate", targetPath: "/resident/charges" },
    requiredPermission: "charges.read",
  },
  "check-my-payment-status": {
    execution: { type: "navigate", targetPath: "/resident/payments?view=status" },
    requiredPermission: "payments.read",
  },
  "open-tickets": {
    execution: { type: "navigate", targetPath: "/tenant/support" },
    requiredPermission: "tickets.read",
  },
  "create-ticket": {
    execution: { type: "navigate", targetPath: "/resident/support/new" },
    requiredPermission: "tickets.write",
  },
  "review-open-tickets": {
    execution: { type: "workflow", workflowKey: "tickets.review_open" },
    requiredPermission: "tickets.write",
  },
  "view-my-tickets": {
    execution: { type: "navigate", targetPath: "/resident/support" },
    requiredPermission: "tickets.read",
  },
  "open-communications": {
    execution: { type: "navigate", targetPath: "/tenant/communications" },
    requiredPermission: "communications.read",
  },
  "create-communication": {
    execution: { type: "navigate", targetPath: "/tenant/communications/new" },
    requiredPermission: "communications.write",
  },
  "view-all-communications": {
    execution: { type: "navigate", targetPath: "/tenant/communications?scope=all" },
    requiredPermission: "communications.read",
  },
  "view-my-inbox": {
    execution: { type: "navigate", targetPath: "/resident/inbox" },
    requiredPermission: "communications.read",
  },
  "view-notices": {
    execution: { type: "navigate", targetPath: "/resident/notices" },
    requiredPermission: "communications.read",
  },
  "open-documents": {
    execution: { type: "navigate", targetPath: "/tenant/documents" },
    requiredPermission: "documents.read",
  },
  "upload-document": {
    execution: { type: "navigate", targetPath: "/tenant/documents/upload" },
    requiredPermission: "documents.write",
  },
  "view-building-documents": {
    execution: { type: "navigate", targetPath: "/resident/documents" },
    requiredPermission: "documents.read",
  },
  "view-rules": {
    execution: { type: "navigate", targetPath: "/resident/documents/rules" },
    requiredPermission: "documents.read",
  },
};

export class BuildingOSAdapter implements SaasAssistantAdapter {
  public readonly appId = "buildingos";
  private readonly financialGateway!: BuildingOSFinancialGateway | undefined;
  private readonly readOnlyQueryGateway!: BuildingOSReadOnlyQueryGateway | undefined;
  private readonly readOnlyIntentClassifier = new BuildingOSIntentClassifier();
  private readonly p0Router = new BuildingOSP0Router();
  private readonly p1Router = new BuildingOSP1Router();
  private readonly p2Router = new BuildingOSP2Router();
  private readonly p2bRouter = new BuildingOSP2BRouter();
  private readonly p3Router = new BuildingOSP3Router();

  private readonly pendingClarifications = new Map<string, PendingClarification>();
  private static readonly CLARIFICATION_TTL_MS = 5 * 60 * 1000;

  constructor(options: BuildingOSAdapterOptions = {}) {
    this.financialGateway = options.financialGateway;
    this.readOnlyQueryGateway = options.readOnlyQueryGateway;
  }

  private getSessionId(context: ResolvedAssistantContext): string | undefined {
    return typeof context.extra?.sessionId === "string" ? context.extra.sessionId : undefined;
  }

  private buildClarificationKey(context: ResolvedAssistantContext, sessionId?: string): string {
    const effectiveSessionId = sessionId ?? this.getSessionId(context) ?? "default";
    return `${context.appId}:${context.tenantId ?? "no-tenant"}:${context.userId}:${effectiveSessionId}`;
  }

  private savePendingClarification(
    context: ResolvedAssistantContext,
    pending: Omit<PendingClarification, "timestamp" | "sessionId">,
    sessionId?: string
  ): void {
    const effectiveSessionId = sessionId ?? this.getSessionId(context) ?? "default";
    const key = this.buildClarificationKey(context, effectiveSessionId);
    this.pendingClarifications.set(key, { ...pending, timestamp: Date.now(), sessionId: effectiveSessionId });
  }

private getAndValidatePendingClarification(
    context: ResolvedAssistantContext,
    sessionId?: string
  ): PendingClarification | null {
    const effectiveSessionId = sessionId ?? this.getSessionId(context) ?? "default";
    const key = this.buildClarificationKey(context, effectiveSessionId);
    const pending = this.pendingClarifications.get(key);
    if (!pending) return null;
    if (Date.now() - pending.timestamp > BuildingOSAdapter.CLARIFICATION_TTL_MS) {
      this.pendingClarifications.delete(key);
      return null;
    }
    return pending;
  }

  private resolveNumericOption(
    context: ResolvedAssistantContext,
    question: string,
    sessionId?: string
  ): PendingClarification | "invalid_option" | "already_executed" | null {
    const normalized = question.trim();
    const numberMatch = normalized.match(/^(\d+)$/);
    if (!numberMatch) return null;
    const effectiveSessionId = sessionId ?? this.getSessionId(context) ?? "default";
    const pending = this.getAndValidatePendingClarification(context, effectiveSessionId);
    if (!pending) return "already_executed";
    const selectedIndex = parseInt(numberMatch[1] ?? "0", 10);
    const selectedOption = pending.options.find(opt => opt.index === selectedIndex);
    if (!selectedOption) return "invalid_option";
    return {
      ...pending,
      intentCode: selectedOption.intentCode,
      toolName: selectedOption.toolName,
      toolInput: selectedOption.toolInput,
      options: pending.options,
      clarificationOptionChosen: selectedIndex,
    };
  }

  private buildObservabilityMetadata(
    intentCode: string,
    answerSource: string,
    options?: {
      traceId?: string;
      gatewayOutcome?: GatewayOutcome;
      latencyMsTotal?: number;
      clarificationOptionChosen?: number;
      followUpExecuted?: boolean;
      responseType?: string;
      p1Routed?: boolean;
      p2Routed?: boolean;
      p2bRouted?: boolean;
      p3Routed?: boolean;
      p0Routed?: boolean;
      authorizationDenied?: boolean;
    }
  ): Record<string, unknown> {
    const base: Record<string, unknown> = {
      intentCode,
      answerSource,
      manifestVersion: this.p1Router.getManifestVersion(),
    };
    if (options?.traceId) base.traceId = options.traceId;
    if (options?.gatewayOutcome) base.gatewayOutcome = options.gatewayOutcome;
    if (options?.latencyMsTotal) base.latencyMsTotal = options.latencyMsTotal;
    if (options?.clarificationOptionChosen) base.clarificationOptionChosen = options.clarificationOptionChosen;
    if (options?.followUpExecuted) base.followUpExecuted = options.followUpExecuted;
    if (options?.responseType) base.responseType = options.responseType;
    if (options?.p1Routed) base.p1Routed = options.p1Routed;
    if (options?.p2Routed) base.p2Routed = options.p2Routed;
    if (options?.p2bRouted) base.p2bRouted = options.p2bRouted;
    if (options?.p3Routed) base.p3Routed = options.p3Routed;
    if (options?.p0Routed) base.p0Routed = options.p0Routed;
    if (options?.authorizationDenied) base.authorizationDenied = options.authorizationDenied;
    return base;
  }

  async getModules(): Promise<AppModuleDefinition[]> {
    return [
      { key: "buildings", label: "Buildings" },
      { key: "units", label: "Units" },
      { key: "charges", label: "Charges" },
      { key: "payments", label: "Payments" },
      { key: "tickets", label: "Support" },
      { key: "communications", label: "Communications" },
      { key: "documents", label: "Documents" },
    ];
  }

  async getRoles(): Promise<RoleDefinition[]> {
    return [
      { key: "SUPER_ADMIN", label: "Super Admin" },
      { key: "TENANT_OWNER", label: "Tenant Owner" },
      { key: "TENANT_ADMIN", label: "Tenant Admin" },
      { key: "OPERATOR", label: "Operator" },
      { key: "RESIDENT", label: "Resident" },
    ];
  }

  async getContext(
    input: RuntimeContextInput
  ): Promise<ResolvedAssistantContext> {
    return {
      ...input,
      currentModule: this.resolveModuleFromRoute(input.route),
      permissions: await this.resolvePermissions(input.userId, input.tenantId, input.role),
    };
  }

  async getKnowledgeScopes(): Promise<KnowledgeScope[]> {
    return [
      { appId: "buildingos", module: "buildings", roleScope: ["SUPER_ADMIN", "TENANT_OWNER", "TENANT_ADMIN", "OPERATOR"] },
      { appId: "buildingos", module: "units", roleScope: ["SUPER_ADMIN", "TENANT_OWNER", "TENANT_ADMIN", "OPERATOR"] },
      { appId: "buildingos", module: "charges", roleScope: ["SUPER_ADMIN", "TENANT_OWNER", "TENANT_ADMIN", "OPERATOR", "RESIDENT"] },
      { appId: "buildingos", module: "payments", roleScope: ["SUPER_ADMIN", "TENANT_OWNER", "TENANT_ADMIN", "OPERATOR", "RESIDENT"] },
      { appId: "buildingos", module: "tickets", roleScope: ["SUPER_ADMIN", "TENANT_OWNER", "TENANT_ADMIN", "OPERATOR", "RESIDENT"] },
      { appId: "buildingos", module: "communications", roleScope: ["SUPER_ADMIN", "TENANT_OWNER", "TENANT_ADMIN", "OPERATOR", "RESIDENT"] },
      { appId: "buildingos", module: "documents", roleScope: ["SUPER_ADMIN", "TENANT_OWNER", "TENANT_ADMIN", "OPERATOR", "RESIDENT"] },
    ];
  }

  async getAvailableActions(
    context: ResolvedAssistantContext
  ): Promise<ActionDefinition[]> {
    const baseActions = this.buildPermissionActions(context.permissions);
    const roleFilteredActions = this.filterActionsByRole(context.role, baseActions);
    return this.enrichActionsWithRegistry(roleFilteredActions);
  }

  async executeAction(
    input: ActionExecutionInput
  ): Promise<ActionExecutionResult> {
    const { actionKey, context, confirmed } = input;

    if (actionKey === "open-entity") {
      return this.executeOpenEntityAction(context, input.params);
    }

    const definition = BUILDINGOS_ACTION_REGISTRY[actionKey];
    if (!definition) {
      return {
        status: "not_found",
        message: `La acción '${actionKey}' no está registrada para BuildingOS.`,
        actionKey,
      };
    }

    if (
      definition.requiredPermission &&
      !context.permissions.includes(definition.requiredPermission)
    ) {
      return {
        status: "forbidden",
        message: "No tenés permisos para ejecutar esta acción.",
        actionKey,
        metadata: {
          requiredPermission: definition.requiredPermission,
        },
      };
    }

    if (definition.requiresConfirmation && confirmed !== true) {
      return {
        status: "confirmation_required",
        message: "Esta acción requiere confirmación explícita antes de ejecutarse.",
        actionKey,
        requiresConfirmation: true,
        execution: {
          type: definition.execution.type!,
          targetPath: definition.execution.targetPath!,
          workflowKey: definition.execution.workflowKey!,
        },
        metadata: {
          destructive: definition.destructive === true,
        },
      };
    }

    return {
      status: "executed",
      message: "Acción validada y lista para ejecutarse.",
      actionKey,
      execution: {
        type: definition.execution.type!,
        targetPath: definition.execution.targetPath!,
        workflowKey: definition.execution.workflowKey!,
      },
      metadata: {
        destructive: definition.destructive === true,
      },
    };
  }

  async resolveDataBackedAnswer(
    input: DataBackedAnswerInput
  ): Promise<DataBackedAnswerResult | null> {
    const { question, context } = input;

    if (!context.tenantId) {
      return null;
    }

    if (this.isMutationLikeQuery(question)) {
      return {
        answer:
          "Estoy en modo solo consulta. No puedo ejecutar cambios (crear cargos, registrar pagos o modificar residentes).",
        actions: [],
        metadata: this.buildObservabilityMetadata("UNKNOWN", "live_data", {
          gatewayOutcome: "denied",
          responseType: "clarification",
        }),
      };
    }

    const forcedUnitDebt = await this.tryResolveForcedUnitDebtQuestion(question, context);
    if (forcedUnitDebt) {
      return forcedUnitDebt;
    }

    const aggregateDebt = await this.tryResolveAggregateDebtQuestion(question, context);
    if (aggregateDebt) {
      return aggregateDebt;
    }

    if (this.isAmbiguousUnitBuildingQuery(question)) {
      return {
        answer:
          "Necesito una aclaracion para responder en modo operativo. Decime si queres saldo, pagos, residente o busqueda de la unidad.",
        actions: [],
        metadata: this.buildObservabilityMetadata("UNKNOWN", "live_data", {
          gatewayOutcome: "invalid_payload",
          responseType: "clarification",
        }),
      };
    }

    const p3Route = this.p3Router.route(question, {
      buildingId: context.extra?.buildingId as string | undefined,
      unitId: context.extra?.unitId as string | undefined,
      buildingCount: (context.extra?.buildingCount as number) || 1,
    });
    if (p3Route && "intentCode" in p3Route && p3Route.intentCode) {
      console.log("[ROUTER] P3 matched:", p3Route.intentCode, p3Route.toolName, JSON.stringify(p3Route.toolInput));
      console.log("[ROUTER] P3 ENTERED block");
      if (this.canRunReadOnlyIntent("GET_COLLECTIONS_SUMMARY" as BuildingOSCanonicalIntentCode, context)) {
        if (!this.readOnlyQueryGateway) {
          console.log("[ROUTER] P3 gateway UNDEFINED");
          return null;
        }
        try {
          const result = await this.readOnlyQueryGateway.query({
            intentCode: "CROSS_QUERY" as BuildingOSCanonicalIntentCode,
            question,
            context,
            toolName: p3Route.toolName as any,
            toolInput: p3Route.toolInput,
          });
          if (result) {
            const traceId = generateTraceId();
            const startedAt = Date.now();
            return {
              answer: result.answer,
              actions: result.actions?.length ? result.actions : [],
              metadata: this.buildObservabilityMetadata(
                p3Route.intentCode,
                "live_data",
                { traceId, gatewayOutcome: "success", latencyMsTotal: Date.now() - startedAt, p3Routed: true }
              ),
            };
          }
        } catch {
          // Fall through to next router
        }
      }
    }

    if (this.financialGateway && this.isResidentDebtQuestion(question, context)) {
      const startedAt = Date.now();

      try {
        const debtSummary = await this.financialGateway.getResidentDebtSummary({
          tenantId: context.tenantId,
          userId: context.userId,
        });

        if (!debtSummary) {
          return null;
        }

        const amount = new Intl.NumberFormat("es-AR", {
          style: "currency",
          currency: debtSummary.currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(debtSummary.amount);

        const asOfDate = this.formatDateSafe(debtSummary.asOf);

        return {
          answer: `Tu deuda actual es ${amount} (corte: ${asOfDate}).`,
          actions: [
            {
              key: "view-my-balance",
              label: "View My Balance",
              description: "View your current balance",
            },
            {
              key: "view-pending-charges",
              label: "View Pending Charges",
              description: "View your pending charges",
            },
          ],
          metadata: {
            debtQueryDetected: true,
            debtAnswerExact: true,
            financialGatewayLatencyMs: Date.now() - startedAt,
            asOf: debtSummary.asOf,
            currency: debtSummary.currency,
            intent: "resident_debt_summary",
          },
        };
      } catch {
        return null;
      }
    }

    if (!this.readOnlyQueryGateway) {
      return null;
    }

    const pendingFollowUp = this.resolveNumericOption(context, question);
    if (pendingFollowUp === "invalid_option") {
      return {
        answer: "La opción ingresada no es válida. Elegí 1 o 2.",
        actions: [],
        metadata: this.buildObservabilityMetadata(
          "UNKNOWN",
          "live_data",
          { gatewayOutcome: "denied" }
        ),
      };
    }
    if (pendingFollowUp === "already_executed") {
      return {
        answer: "La clarificación ya fue ejecutada o expiró. Si necesitás otra consulta, hacela de nuevo.",
        actions: [],
        metadata: this.buildObservabilityMetadata(
          "UNKNOWN",
          "live_data",
          { gatewayOutcome: "unavailable" }
        ),
      };
    }
    if (pendingFollowUp && typeof pendingFollowUp === "object" && "intentCode" in pendingFollowUp) {
      const traceId = generateTraceId();
      const startedAt = Date.now();
      console.log("[ROUTER] P1 follow-up:", pendingFollowUp.intentCode, pendingFollowUp.toolName);
      if (this.canRunReadOnlyIntent(pendingFollowUp.intentCode as BuildingOSCanonicalIntentCode, context)) {
        try {
          const result = await this.readOnlyQueryGateway.query({
            intentCode: pendingFollowUp.intentCode as BuildingOSCanonicalIntentCode,
            question,
            context,
            toolName: pendingFollowUp.toolName as any,
            toolInput: pendingFollowUp.toolInput,
          });
          this.pendingClarifications.delete(this.buildClarificationKey(context));
          if (result) {
            return {
              answer: result.answer,
              actions: result.actions?.length ? result.actions : this.getDefaultReadOnlyActions(pendingFollowUp.intentCode as BuildingOSCanonicalIntentCode),
              metadata: this.buildObservabilityMetadata(
                pendingFollowUp.intentCode,
                "live_data",
                {
                  traceId,
                  gatewayOutcome: "success",
                  latencyMsTotal: Date.now() - startedAt,
                  clarificationOptionChosen: pendingFollowUp.clarificationOptionChosen,
                  followUpExecuted: true,
                }
              ),
            };
          }
        } catch {
          // Fall through to normal routing on follow-up error
        }
      }
    }

    const p1Route = this.p1Router.route(question);
    if (p1Route) {
      console.log("[ROUTER] P1 matched:", p1Route.intentCode, p1Route.toolName);
      const intentCode = p1Route.intentCode;
      if (this.canRunReadOnlyIntent(intentCode as BuildingOSCanonicalIntentCode, context)) {
        try {
          const result = await this.readOnlyQueryGateway.query({
            intentCode: intentCode as BuildingOSCanonicalIntentCode,
            question,
            context,
            toolName: p1Route.toolName as any,
            toolInput: p1Route.toolInput,
          });
          if (result) {
            const traceId = generateTraceId();
            const startedAt = Date.now();
            return {
              answer: result.answer,
              actions: result.actions?.length ? result.actions : this.getDefaultReadOnlyActions(intentCode as BuildingOSCanonicalIntentCode),
              metadata: this.buildObservabilityMetadata(
                intentCode,
                "live_data",
                { traceId, gatewayOutcome: "success", latencyMsTotal: Date.now() - startedAt }
              ),
            };
          }
          const controlledClarification = this.buildNonGenericClarification(
            question,
            intentCode
          );
          if (controlledClarification) {
            return controlledClarification;
          }
          this.savePendingClarification(context, {
            intentCode,
            toolName: p1Route.toolName,
            toolInput: p1Route.toolInput,
            options: this.p1Router.buildClarificationWithOptions(question).fullOptions,
          });
          const clarification = this.p1Router.buildClarification(question);
          return {
            answer: clarification.answer,
            actions: [],
            metadata: this.buildObservabilityMetadata(
              intentCode,
              "live_data",
              { traceId: generateTraceId(), gatewayOutcome: "unavailable", responseType: "clarification", p1Routed: true }
            ),
          };
        } catch {
          const controlledClarification = this.buildNonGenericClarification(
            question,
            intentCode
          );
          if (controlledClarification) {
            return controlledClarification;
          }
          this.savePendingClarification(context, {
            intentCode,
            toolName: p1Route.toolName,
            toolInput: p1Route.toolInput,
            options: this.p1Router.buildClarificationWithOptions(question).fullOptions,
          });
          const clarification = this.p1Router.buildClarification(question);
          return {
            answer: clarification.answer,
            actions: [],
            metadata: this.buildObservabilityMetadata(
              intentCode,
              "live_data",
              { traceId: generateTraceId(), gatewayOutcome: "unavailable", responseType: "clarification", p1Routed: true }
            ),
          };
        }
      } else {
        return {
          answer: "No puedo ejecutar esta consulta operativa con el rol o permisos actuales.",
          actions: [],
          metadata: this.buildObservabilityMetadata(
            intentCode,
            "live_data",
            { gatewayOutcome: "denied", responseType: "clarification", authorizationDenied: true }
          ),
        };
      }
    }

    const p2bRoute = this.p2bRouter.route(question, {
      buildingId: context.extra?.buildingId as string | undefined,
    });
    if (p2bRoute && "intentCode" in p2bRoute && p2bRoute.intentCode) {
      console.log("[ROUTER] P2B matched:", p2bRoute.intentCode, p2bRoute.toolName);
      if (this.canRunReadOnlyIntent("GET_OPEN_TICKETS" as BuildingOSCanonicalIntentCode, context)) {
        try {
          const result = await this.readOnlyQueryGateway.query({
            intentCode: p2bRoute.intentCode as BuildingOSCanonicalIntentCode,
            question,
            context,
            toolName: p2bRoute.toolName as any,
            toolInput: p2bRoute.toolInput,
          });
          if (result) {
            const traceId = generateTraceId();
            const startedAt = Date.now();
            return {
              answer: result.answer,
              actions: result.actions?.length ? result.actions : [],
              metadata: this.buildObservabilityMetadata(
                p2bRoute.intentCode,
                "live_data",
                { traceId, gatewayOutcome: "success", latencyMsTotal: Date.now() - startedAt }
              ),
            };
          }
        } catch {
          // Fall through to P2 on error
        }
      }
    }

    const p2Route = this.p2Router.route(question, {
      buildingId: context.extra?.buildingId as string | undefined,
      unitId: context.extra?.unitId as string | undefined,
    });
    if (p2Route && "intentCode" in p2Route && p2Route.intentCode) {
      console.log("[ROUTER] P2 matched:", p2Route.intentCode, p2Route.toolName, JSON.stringify(p2Route.toolInput));
      console.log("[ROUTER] P2 ENTERED routing block, checking canRun...");
console.log("[ROUTER] P2 calling gateway, baseUrl:", this.readOnlyQueryGateway ? "defined" : "UNDEFINED");
    console.log("[ROUTER] P2 baseUrl check:", this.readOnlyQueryGateway);
    console.log("[ROUTER] P2 context:", { tenantId: context.tenantId, role: context.role });
    console.log("[ROUTER] P2 about to call canRunReadOnlyIntent");
    const canRun = this.canRunReadOnlyIntent(p2Route.intentCode as BuildingOSCanonicalIntentCode, context);
console.log("[ROUTER] P2 got canRun result:", canRun);
      if (canRun) {
        console.log("[ROUTER] P2 calling gateway NOW...");
      console.log("[ROUTER] P2 toolInput:", JSON.stringify(p2Route.toolInput));
      console.log("[ROUTER] P2 context:", { tenantId: context.tenantId, role: context.role });
      try {
        const result = await this.readOnlyQueryGateway.query({
            intentCode: p2Route.intentCode as BuildingOSCanonicalIntentCode,
            question,
            context,
            toolName: p2Route.toolName as any,
            toolInput: p2Route.toolInput,
          });
          console.log("[ROUTER] P2 gateway result:", result ? "GOT RESULT" : "NULL RESULT", result?.answer?.substring(0, 50));
          if (result) {
            const traceId = generateTraceId();
            const startedAt = Date.now();
            return {
              answer: result.answer,
              actions: result.actions?.length ? result.actions : [],
              metadata: this.buildObservabilityMetadata(
                p2Route.intentCode,
                "live_data",
                { traceId, gatewayOutcome: "success", latencyMsTotal: Date.now() - startedAt }
              ),
            };
          }
        } catch {
          // Fall through to P0 on error
        }
      }
    }

    const p0Route = this.p0Router.route(question);
    if (p0Route) {
      if (!this.canRunReadOnlyIntent(p0Route.intentCode, context)) {
        return {
          answer:
            "No puedo ejecutar esta consulta operativa con el rol o permisos actuales.",
          actions: [],
          metadata: {
            responseType: "clarification",
            intent: p0Route.intentCode,
            intentCode: p0Route.intentCode,
            answerSource: "live_data",
            authorizationDenied: true,
          },
        };
      }

      try {
        const result = await this.readOnlyQueryGateway.query({
          intentCode: p0Route.intentCode,
          question,
          context,
          toolName: p0Route.toolName as BuildingOSReadOnlyQueryInput["toolName"],
          toolInput: p0Route.toolInput,
        });

        if (result) {
          return {
            answer: result.answer,
            actions:
              result.actions && result.actions.length > 0
                ? result.actions
                : this.getDefaultReadOnlyActions(p0Route.intentCode),
            metadata: {
              ...result.metadata,
              intent: p0Route.intentCode,
              intentCode: p0Route.intentCode,
              intentScore: p0Route.score,
              p0Routed: true,
              answerSource: "live_data",
            },
          };
        }
      } catch {
        // Continue with controlled clarification fallback below.
      }

      const clarification = this.p0Router.buildClarification(question);
      return {
        answer: clarification.answer,
        actions: [],
        metadata: {
          responseType: "clarification",
          answerSource: "live_data",
          clarificationOptions: clarification.options,
          p0Routed: true,
          gatewayUnavailable: true,
        },
      };
    }

    const paymentFallback = this.buildPaymentOperationalFallback(question);
    if (paymentFallback) {
      return paymentFallback;
    }

    const classification = this.readOnlyIntentClassifier.classify(question);
    if (!classification.intentCode) {
      return null;
    }
    const intentDefinition = getBuildingOSIntentDefinition(classification.intentCode);
    if (!this.canRunReadOnlyIntent(intentDefinition.code, context)) {
      return null;
    }

    const startedAt = Date.now();

    try {
      const extractedUnitId = this.extractUnitIdFromQuestion(question);

      const queryInput: BuildingOSReadOnlyQueryInput = {
        intentCode: intentDefinition.code,
        question,
        context: extractedUnitId
          ? { ...context, entityId: extractedUnitId }
          : context,
      };

      const result = await this.readOnlyQueryGateway.query(queryInput);

      if (!result) {
        return null;
      }

      return {
        answer: result.answer,
        actions:
          result.actions && result.actions.length > 0
            ? result.actions
            : this.getDefaultReadOnlyActions(intentDefinition.code),
        metadata: {
          ...result.metadata,
          intent: intentDefinition.code,
          intentCode: intentDefinition.code,
          intentScore: classification.score,
          intentResolverKey: intentDefinition.resolverKey,
          answerSource: intentDefinition.answerSource,
          responseType: result.metadata?.responseType,
          extractedUnitId,
          readOnlyGatewayLatencyMs: Date.now() - startedAt,
        },
      };
    } catch {
      return null;
    }
  }

  private extractUnitIdFromQuestion(question: string): string | undefined {
    const normalized = this.normalizeText(question);
    const unitPatterns = [
      /(?:la\s+)?unidad\s+(\d+)/i,
      /(?:el\s+)?departamento\s+(\d+)/i,
      /unit\s+(\d+)/i,
      /dept[o\.]?\s*(\d+)/i,
    ];

    for (const pattern of unitPatterns) {
      const match = normalized.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return undefined;
  }

  private buildPermissionActions(permissions: string[]): ActionDefinition[] {
    const actions: ActionDefinition[] = [];

    if (permissions.includes("buildings.read")) {
      actions.push({
        key: "open-buildings",
        label: "Open Buildings",
        description: "Navigate to the Buildings module",
      });
    }

    if (permissions.includes("units.read")) {
      actions.push({
        key: "open-units",
        label: "Open Units",
        description: "Navigate to the Units module",
      });
    }

    if (permissions.includes("charges.read")) {
      actions.push({
        key: "open-charges",
        label: "Open Charges",
        description: "Navigate to the Charges module",
      });

      if (permissions.includes("charges.write")) {
        actions.push({
          key: "review-generated-charges",
          label: "Review Generated Charges",
          description: "Review charges before publishing",
        });
      }

      if (permissions.includes("charges.publish")) {
        actions.push({
          key: "publish-charges",
          label: "Publish Charges",
          description: "Publish charges for residents",
        });
      }
    }

    if (permissions.includes("payments.read")) {
      actions.push({
        key: "open-payments",
        label: "Open Payments",
        description: "Navigate to the Payments module",
      });

      actions.push({
        key: "view-payment-history",
        label: "View Payment History",
        description: "View your payment history",
      });

      if (permissions.includes("payments.approve")) {
        actions.push({
          key: "review-pending-payments",
          label: "Review Pending Payments",
          description: "Review and approve or reject payments",
        });
        actions.push({
          key: "view-all-payments",
          label: "View All Payments",
          description: "View all tenant payments",
        });
      }
    }

    if (permissions.includes("charges.read")) {
      actions.push({
        key: "view-pending-charges",
        label: "View Pending Charges",
        description: "View your pending charges",
      });

      actions.push({
        key: "view-my-balance",
        label: "View My Balance",
        description: "View your current balance",
      });
    }

    if (permissions.includes("payments.write")) {
      actions.push({
        key: "report-payment",
        label: "Report Payment",
        description: "Report a payment made",
      });

      actions.push({
        key: "upload-payment-proof",
        label: "Upload Payment Proof",
        description: "Upload payment receipt or proof",
      });
    }

    actions.push({
      key: "view-my-charges",
      label: "View My Charges",
      description: "View your own charges",
    });

    actions.push({
      key: "check-my-payment-status",
      label: "Check My Payment Status",
      description: "Check your payment status",
    });

    if (permissions.includes("tickets.read")) {
      actions.push({
        key: "open-tickets",
        label: "Open Support",
        description: "Navigate to Support (tickets)",
      });

      if (permissions.includes("tickets.write")) {
        actions.push({
          key: "create-ticket",
          label: "Create Ticket",
          description: "Create a new support ticket",
        });
        actions.push({
          key: "review-open-tickets",
          label: "Review Open Tickets",
          description: "Review pending support tickets",
        });
      }
    }

    actions.push({
      key: "view-my-tickets",
      label: "View My Tickets",
      description: "View your own support tickets",
    });

    if (permissions.includes("communications.read")) {
      actions.push({
        key: "open-communications",
        label: "Open Communications",
        description: "Navigate to Communications module",
      });

      if (permissions.includes("communications.write")) {
        actions.push({
          key: "create-communication",
          label: "Create Communication",
          description: "Create a new communication or notice",
        });
        actions.push({
          key: "view-all-communications",
          label: "View All Communications",
          description: "View all communications in the building",
        });
      }

      actions.push({
        key: "view-my-inbox",
        label: "View My Inbox",
        description: "View your received messages",
      });

      actions.push({
        key: "view-notices",
        label: "View Notices",
        description: "View building notices and announcements",
      });
    }

    if (permissions.includes("documents.read")) {
      actions.push({
        key: "open-documents",
        label: "Open Documents",
        description: "Navigate to Documents module",
      });

      if (permissions.includes("documents.write")) {
        actions.push({
          key: "upload-document",
          label: "Upload Document",
          description: "Upload a new document",
        });
      }

      actions.push({
        key: "view-building-documents",
        label: "View Building Documents",
        description: "View building documents and files",
      });

      actions.push({
        key: "view-rules",
        label: "View Building Rules",
        description: "View building regulations and rules",
      });
    }

    return actions;
  }

  private filterActionsByRole(
    role: string,
    actions: ActionDefinition[]
  ): ActionDefinition[] {
    const adminRoles = ["SUPER_ADMIN", "TENANT_OWNER", "TENANT_ADMIN"];
    const operatorRoles = ["OPERATOR"];
    const residentRoles = ["RESIDENT"];

    const residentAllowedKeys = [
      "open-charges",
      "open-payments",
      "view-my-charges",
      "check-my-payment-status",
      "view-my-tickets",
      "view-payment-history",
      "view-pending-charges",
      "view-my-balance",
      "report-payment",
      "upload-payment-proof",
      "open-communications",
      "view-my-inbox",
      "view-notices",
      "open-documents",
      "view-building-documents",
      "view-rules",
    ];

    const operatorLimitedKeys = [
      "open-buildings",
      "open-units",
      "open-charges",
      "open-payments",
      "review-generated-charges",
      "open-tickets",
      "create-ticket",
      "review-open-tickets",
      "view-payment-history",
      "view-pending-charges",
      "view-my-balance",
      "review-pending-payments",
      "view-all-payments",
      "open-communications",
      "create-communication",
      "view-all-communications",
      "view-my-inbox",
      "view-notices",
      "open-documents",
      "upload-document",
      "view-building-documents",
      "view-rules",
    ];

    if (residentRoles.includes(role)) {
      return actions.filter((action) => residentAllowedKeys.includes(action.key));
    }

    if (operatorRoles.includes(role)) {
      return actions.filter((action) => operatorLimitedKeys.includes(action.key));
    }

    if (adminRoles.includes(role)) {
      return actions;
    }

    return actions;
  }

  private enrichActionsWithRegistry(actions: ActionDefinition[]): ActionDefinition[] {
    return actions.map((action) => {
      const registryEntry = BUILDINGOS_ACTION_REGISTRY[action.key];
      if (!registryEntry) {
        return action;
      }

      const enriched: ActionDefinition = {
        key: action.key,
        label: action.label,
        requiresConfirmation: registryEntry.requiresConfirmation === true || action.requiresConfirmation === true,
        destructive: registryEntry.destructive === true || action.destructive === true,
      };
      if (registryEntry.requiredPermission) {
        enriched.requiredPermission = registryEntry.requiredPermission;
      }
      if (action.description) {
        enriched.description = action.description;
      }
      return enriched;
    });
  }

  private executeOpenEntityAction(
    context: ResolvedAssistantContext,
    params?: Record<string, unknown>
  ): ActionExecutionResult {
    const entityType = this.pickParamAsString(params, "entityType");
    const entityId = this.pickParamAsString(params, "entityId");

    if (!entityType || !entityId) {
      return {
        status: "not_found",
        message: "La acción open-entity requiere entityType y entityId.",
        actionKey: "open-entity",
      };
    }

    const normalizedType = entityType.toLowerCase();
    const entityMap: Record<
      string,
      { permission: string; pathPrefix: string }
    > = {
      building: { permission: "buildings.read", pathPrefix: "/tenant/buildings" },
      unit: { permission: "units.read", pathPrefix: "/tenant/units" },
      charge: { permission: "charges.read", pathPrefix: "/tenant/charges" },
      payment: { permission: "payments.read", pathPrefix: "/tenant/payments" },
      ticket: { permission: "tickets.read", pathPrefix: "/tenant/support" },
      communication: {
        permission: "communications.read",
        pathPrefix: "/tenant/communications",
      },
      document: { permission: "documents.read", pathPrefix: "/tenant/documents" },
    };

    const mapping = entityMap[normalizedType];
    if (!mapping) {
      return {
        status: "not_found",
        message: `No existe mapeo de entidad para '${entityType}'.`,
        actionKey: "open-entity",
      };
    }

    if (!context.permissions.includes(mapping.permission)) {
      return {
        status: "forbidden",
        message: "No tenés permisos para abrir esta entidad.",
        actionKey: "open-entity",
        metadata: {
          requiredPermission: mapping.permission,
          entityType: normalizedType,
        },
      };
    }

    return {
      status: "executed",
      message: "Entidad validada y lista para abrir.",
      actionKey: "open-entity",
      execution: {
        type: "open_entity",
        entityType: normalizedType,
        entityId,
        targetPath: `${mapping.pathPrefix}/${entityId}`,
      },
    };
  }

  private pickParamAsString(
    params: Record<string, unknown> | undefined,
    key: string
  ): string | undefined {
    const value = params?.[key];
    if (typeof value !== "string") {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  async canAnswer(
    _question: string,
    context: ResolvedAssistantContext
  ): Promise<boolean> {
    const allowedRoles = [
      "SUPER_ADMIN",
      "TENANT_OWNER",
      "TENANT_ADMIN",
      "OPERATOR",
      "RESIDENT",
    ];
    return allowedRoles.includes(context.role);
  }

  private isResidentDebtQuestion(
    question: string,
    context: ResolvedAssistantContext
  ): boolean {
    if (context.role !== "RESIDENT") {
      return false;
    }

    if (!context.permissions.includes("charges.read")) {
      return false;
    }

    const normalized = this.normalizeText(question);
    const debtKeywords = [
      "deuda",
      "saldo",
      "cuánto debo",
      "cuanto debo",
      "pending charges",
      "balance",
      "charges pending",
      "cargos pendientes",
      "lo que debo",
      "debo",
    ];

    return debtKeywords.some((keyword) => normalized.includes(keyword));
  }

  private canRunReadOnlyIntent(
    intentCode: BuildingOSCanonicalIntentCode,
    context: ResolvedAssistantContext
  ): boolean {
    const definition = getBuildingOSIntentDefinition(intentCode);
    if (definition) {
      if (!definition.rolesAllowed.includes(context.role)) {
        console.log("[PERM] intentCode", intentCode, "role", context.role, "NOT in rolesAllowed");
        return false;
      }
    } else {
      console.log("[PERM] No definition for", intentCode, "- using fallback check");
    }

    const requires = (...permissions: string[]) =>
      permissions.every((permission) => context.permissions.includes(permission));

    switch (intentCode) {
      case "GET_OVERDUE_UNITS":
        return requires("charges.read", "units.read");
      case "GET_PENDING_PAYMENTS":
        return requires("payments.read");
      case "GET_OPEN_TICKETS":
        return requires("tickets.read");
      case "GET_VACANT_UNITS":
        return requires("units.read");
      case "GET_COLLECTIONS_SUMMARY":
        return requires("charges.read");
      case "GET_UNIT_DEBT":
        return requires("charges.read", "units.read");
      case "GET_UNIT_PRIMARY_RESIDENT":
        return requires("units.read");
      case "GET_REJECTED_TODAY":
        return requires("payments.read");
      case "GET_PAYMENTS_WITHOUT_PROOF":
        return requires("payments.read");
      case "GET_LAST_PAYMENT":
        return requires("payments.read");
      case "GET_DEBT_AGING":
        return requires("charges.read");
      case "GET_DEBT_BY_TOWER":
        return requires("charges.read");
      case "GET_UNIT_BALANCE_BY_PERIOD":
        return requires("charges.read", "units.read");
      case "GET_URGENT_UNASSIGNED_TICKETS":
        return requires("tickets.read");
      case "GET_COLLECTIONS_TREND":
        console.log("[PERM] Checking GET_COLLECTIONS_TREND, permissions:", context.permissions);
        return requires("charges.read");
      case "GET_UNIT_DEBT_TREND":
        return requires("charges.read", "units.read");
      case "GET_BUILDING_DEBT_TREND":
        return requires("charges.read", "buildings.read");
      case "CROSS_QUERY":
        return requires("charges.read");
      case "SEARCH_PROCESSES":
        return requires("tickets.read");
      default:
        return false;
    }
  }

  private isMutationLikeQuery(question: string): boolean {
    const normalized = question
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    return (
      normalized.includes("crea un cargo") ||
      normalized.includes("crear cargo") ||
      normalized.includes("registra un pago") ||
      normalized.includes("registrar pago") ||
      normalized.includes("cambia el residente") ||
      normalized.includes("cambiar residente") ||
      normalized.includes("modifica residente")
    );
  }

  private containsUnitAndBuildingTokens(question: string): boolean {
    const normalized = question
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const hasUnit = /(?:unidad|apartamento|depto|departamento|apto|uf)\s+[a-z0-9-]+/.test(normalized);
    const hasBuilding = /(?:torre|edificio|bloque)\s+[a-z0-9]+/.test(normalized);
    return hasUnit && hasBuilding;
  }

  private isUnitDebtIntent(question: string): boolean {
    const normalized = question
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const isHistoricalBalanceQuery =
      normalized.includes("periodo") ||
      normalized.includes("historial") ||
      normalized.includes("evolucion");
    if (isHistoricalBalanceQuery) {
      return false;
    }

    return (
      normalized.includes("deuda") ||
      normalized.includes("debe") ||
      normalized.includes("saldo") ||
      normalized.includes("adeuda") ||
      normalized.includes("al dia") ||
      normalized.includes("expensa")
    );
  }

  private async tryResolveForcedUnitDebtQuestion(
    question: string,
    context: ResolvedAssistantContext,
  ): Promise<DataBackedAnswerResult | null> {
    if (!this.containsUnitAndBuildingTokens(question) || !this.isUnitDebtIntent(question)) {
      return null;
    }
    if (!this.readOnlyQueryGateway) {
      return {
        answer: "No pude confirmar la deuda de la unidad en este momento. Reintentá en unos minutos.",
        actions: [],
        metadata: this.buildObservabilityMetadata("GET_UNIT_DEBT", "live_data", {
          gatewayOutcome: "unavailable",
          responseType: "clarification",
        }),
      };
    }

    const p1Route = this.p1Router.route(question);
    if (!p1Route || p1Route.intentCode !== "GET_UNIT_DEBT") {
      const forcedRoute = {
        intentCode: "GET_UNIT_DEBT" as BuildingOSCanonicalIntentCode,
        toolName: "get_unit_balance",
        toolInput: {
          debtStatus: "OVERDUE",
          ranking: this.p1Router.getDefaults().ranking,
        },
      };
      return this.queryForcedUnitDebt(question, context, forcedRoute);
    }

    return this.queryForcedUnitDebt(question, context, {
      intentCode: "GET_UNIT_DEBT",
      toolName: p1Route.toolName,
      toolInput: p1Route.toolInput,
    });
  }

  private async queryForcedUnitDebt(
    question: string,
    context: ResolvedAssistantContext,
    route: {
      intentCode: BuildingOSCanonicalIntentCode;
      toolName: NonNullable<BuildingOSReadOnlyQueryInput["toolName"]>;
      toolInput: Record<string, unknown>;
    },
  ): Promise<DataBackedAnswerResult> {
    if (!this.canRunReadOnlyIntent("GET_UNIT_DEBT", context)) {
      return {
        answer: "No puedo ejecutar esta consulta operativa con el rol o permisos actuales.",
        actions: [],
        metadata: this.buildObservabilityMetadata("GET_UNIT_DEBT", "live_data", {
          gatewayOutcome: "denied",
          responseType: "clarification",
          authorizationDenied: true,
        }),
      };
    }

    try {
      const result = await this.readOnlyQueryGateway.query({
        intentCode: "GET_UNIT_DEBT",
        question,
        context,
        toolName: route.toolName as any,
        toolInput: route.toolInput,
      });
      if (result) {
        const traceId = generateTraceId();
        const startedAt = Date.now();
        return {
          answer: result.answer,
          actions: result.actions?.length ? result.actions : this.getDefaultReadOnlyActions("GET_UNIT_DEBT"),
          metadata: this.buildObservabilityMetadata("GET_UNIT_DEBT", "live_data", {
            traceId,
            gatewayOutcome: "success",
            latencyMsTotal: Date.now() - startedAt,
            p1Routed: true,
          }),
        };
      }
      return {
        answer: "No encontré una coincidencia única para la unidad indicada. Verificá unidad y torre exactas.",
        actions: [],
        metadata: this.buildObservabilityMetadata("GET_UNIT_DEBT", "live_data", {
          gatewayOutcome: "invalid_payload",
          responseType: "clarification",
          p1Routed: true,
        }),
      };
    } catch {
      return {
        answer: "No pude confirmar la deuda de la unidad en este momento. Reintentá en unos minutos.",
        actions: [],
        metadata: this.buildObservabilityMetadata("GET_UNIT_DEBT", "live_data", {
          gatewayOutcome: "unavailable",
          responseType: "clarification",
          p1Routed: true,
        }),
      };
    }
  }

  private async tryResolveAggregateDebtQuestion(
    question: string,
    context: ResolvedAssistantContext
  ): Promise<DataBackedAnswerResult | null> {
    if (!this.readOnlyQueryGateway) {
      return null;
    }

    const normalized = this.normalizeText(question);
    if (!this.isAggregateDebtQuery(normalized)) {
      return null;
    }

    const route = this.resolveAggregateRoute(normalized);
    if (!route) {
      return this.buildAggregateScopeClarification("GET_COLLECTIONS_SUMMARY");
    }

    if (!this.canRunReadOnlyIntent(route.intentCode, context)) {
      return null;
    }

    try {
      const result = await this.readOnlyQueryGateway.query({
        intentCode: route.intentCode,
        question,
        context,
        toolName: route.toolName,
        toolInput: route.toolInput,
      });
      if (result) {
        return {
          answer: result.answer,
          actions: result.actions?.length ? result.actions : this.getDefaultReadOnlyActions(route.intentCode),
          metadata: this.buildObservabilityMetadata(route.intentCode, "live_data", {
            gatewayOutcome: "success",
            responseType:
              typeof result.metadata?.responseType === "string"
                ? String(result.metadata?.responseType)
                : undefined,
            p1Routed: true,
          }),
        };
      }
    } catch {
      // fallthrough to controlled clarification
    }

    return this.buildAggregateScopeClarification(route.intentCode);
  }

  private resolveAggregateRoute(normalizedQuestion: string): {
    intentCode: BuildingOSCanonicalIntentCode;
    toolName: NonNullable<BuildingOSReadOnlyQueryInput["toolName"]>;
    toolInput: Record<string, unknown>;
  } | null {
    const ranking = this.p1Router.getDefaults().ranking;

    if (
      normalizedQuestion.includes("aging") ||
      normalizedQuestion.includes("antiguedad")
    ) {
      return {
        intentCode: "GET_DEBT_AGING",
        toolName: "analytics_debt_aging",
        toolInput: { asOf: "{today}", ranking },
      };
    }

    if (
      normalizedQuestion.includes("top") ||
      normalizedQuestion.includes("ranking") ||
      normalizedQuestion.includes("que torres") ||
      normalizedQuestion.includes("torres deben") ||
      normalizedQuestion.includes("deuda por torre") ||
      normalizedQuestion.includes("deuda por edificio") ||
      normalizedQuestion.includes("resumen de deuda")
    ) {
      return {
        intentCode: "GET_DEBT_BY_TOWER",
        toolName: "analytics_debt_by_tower",
        toolInput: { asOf: "{today}", ranking },
      };
    }

    if (
      normalizedQuestion.includes("ultimos") ||
      normalizedQuestion.includes("mes pasado") ||
      normalizedQuestion.includes("meses") ||
      normalizedQuestion.includes("tendencia") ||
      normalizedQuestion.includes("evolucion")
    ) {
      return {
        intentCode: "GET_BUILDING_DEBT_TREND",
        toolName: "get_building_debt_trend",
        toolInput: { months: 6, metric: "outstanding", ranking },
      };
    }

    if (
      normalizedQuestion.includes("unidades con deuda") ||
      normalizedQuestion.includes("listame unidades con deuda") ||
      normalizedQuestion.includes("moroso") ||
      normalizedQuestion.includes("morosos") ||
      normalizedQuestion.includes("quienes deben") ||
      normalizedQuestion.includes("quien debe") ||
      normalizedQuestion.includes("tienen deuda") ||
      normalizedQuestion.includes("deben este mes") ||
      normalizedQuestion.includes("deben expensa") ||
      normalizedQuestion.includes("departamentos deben")
    ) {
      return {
        intentCode: "GET_OVERDUE_UNITS",
        toolName: "search_payments",
        toolInput: { status: ["OVERDUE"], ranking },
      };
    }

    if (
      normalizedQuestion.includes("cargos pendientes") ||
      normalizedQuestion.includes("pagos pendientes")
    ) {
      return {
        intentCode: "GET_PENDING_PAYMENTS",
        toolName: "search_payments",
        toolInput: { status: ["SUBMITTED"], ranking },
      };
    }

    if (
      normalizedQuestion.includes("morosidad") ||
      normalizedQuestion.includes("resumen")
    ) {
      return {
        intentCode: "GET_OVERDUE_UNITS",
        toolName: "search_payments",
        toolInput: { status: ["OVERDUE"], ranking },
      };
    }

    return null;
  }

  private buildNonGenericClarification(
    question: string,
    intentCode: string
  ): DataBackedAnswerResult | null {
    const normalized = this.normalizeText(question);
    if (this.isAggregateDebtQuery(normalized)) {
      return this.buildAggregateScopeClarification(intentCode);
    }

    const isUnitLookupIntent =
      intentCode === "GET_UNIT_DEBT" ||
      intentCode === "GET_UNIT_PRIMARY_RESIDENT" ||
      intentCode === "GET_LAST_PAYMENT";
    if (isUnitLookupIntent && this.containsUnitAndBuildingTokens(question)) {
      return this.buildUnitLookupClarification(intentCode);
    }

    return null;
  }

  private buildAggregateScopeClarification(
    intentCode: string
  ): DataBackedAnswerResult {
    return {
      answer:
        "Para responder en forma operativa necesito acotar el alcance mínimo: indicá torre/edificio o período (por ejemplo: Torre A, últimos 3 meses).",
      actions: [],
      metadata: this.buildObservabilityMetadata(intentCode, "live_data", {
        gatewayOutcome: "invalid_payload",
        responseType: "clarification",
        p1Routed: true,
      }),
    };
  }

  private buildUnitLookupClarification(
    intentCode: string
  ): DataBackedAnswerResult {
    return {
      answer:
        "No encontré una coincidencia única para la unidad indicada. Verificá unidad y torre exactas.",
      actions: [],
      metadata: this.buildObservabilityMetadata(intentCode, "live_data", {
        gatewayOutcome: "invalid_payload",
        responseType: "clarification",
        p1Routed: true,
      }),
    };
  }

  private buildPaymentOperationalFallback(
    question: string
  ): DataBackedAnswerResult | null {
    const normalized = this.normalizeText(question);
    if (!normalized.includes("pago")) {
      return null;
    }

    const hasUnitToken = /(?:unidad|apartamento|depto|departamento|apto|uf)\s+[a-z0-9-]+/.test(
      normalized
    );
    const hasBuildingToken = /(?:torre|edificio|bloque)\s+[a-z0-9]+/.test(
      normalized
    );

    if (hasUnitToken && !hasBuildingToken) {
      return {
        answer:
          "Para buscar pagos de una unidad necesito el dato faltante: torre/edificio.",
        actions: [],
        metadata: this.buildObservabilityMetadata("GET_LAST_PAYMENT", "live_data", {
          gatewayOutcome: "invalid_payload",
          responseType: "clarification",
          p1Routed: true,
        }),
      };
    }

    if (
      normalized.includes("busca pagos") ||
      normalized.includes("buscar pagos") ||
      normalized.includes("ver pagos") ||
      normalized.includes("pagos de abril") ||
      normalized.includes("necesito ver pagos")
    ) {
      return {
        answer:
          "Puedo ayudarte con pagos en modo operativo. Indicá alcance mínimo (torre/edificio y período exacto) para ejecutar la consulta.",
        actions: [
          {
            key: "open-payments",
            label: "Open Payments",
            description: "Navigate to the Payments module",
          },
        ],
        metadata: this.buildObservabilityMetadata("GET_PENDING_PAYMENTS", "live_data", {
          gatewayOutcome: "invalid_payload",
          responseType: "clarification",
          p0Routed: true,
        }),
      };
    }

    return null;
  }

  private isAmbiguousUnitBuildingQuery(question: string): boolean {
    const normalized = question
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const hasUnitRef = normalized.includes("unidad");
    const hasBuildingRef = normalized.includes("edificio") || normalized.includes("torre") || normalized.includes("bloque");
    const hasConcreteIntent =
      normalized.includes("deuda") ||
      normalized.includes("saldo") ||
      normalized.includes("debe") ||
      normalized.includes("pago") ||
      normalized.includes("residente") ||
      normalized.includes("telefono") ||
      normalized.includes("buscar") ||
      normalized.includes("listar") ||
      normalized.includes("listame");

    return hasUnitRef && hasBuildingRef && !hasConcreteIntent;
  }

  private getDefaultReadOnlyActions(
    intentCode: BuildingOSCanonicalIntentCode
  ): ActionDefinition[] {
    const intentActions: Partial<Record<BuildingOSCanonicalIntentCode, ActionDefinition[]>> = {
      GET_OVERDUE_UNITS: [
        {
          key: "open-charges",
          label: "Open Charges",
          description: "Navigate to the Charges module",
        },
        {
          key: "open-units",
          label: "Open Units",
          description: "Navigate to the Units module",
        },
      ],
      GET_PENDING_PAYMENTS: [
        {
          key: "open-payments",
          label: "Open Payments",
          description: "Navigate to the Payments module",
        },
      ],
      GET_OPEN_TICKETS: [
        {
          key: "open-tickets",
          label: "Open Support",
          description: "Navigate to Support (tickets)",
        },
      ],
      GET_VACANT_UNITS: [
        {
          key: "open-units",
          label: "Open Units",
          description: "Navigate to the Units module",
        },
      ],
      GET_COLLECTIONS_SUMMARY: [
        {
          key: "open-charges",
          label: "Open Charges",
          description: "Navigate to the Charges module",
        },
      ],
      GET_UNIT_DEBT: [
        {
          key: "open-unit-details",
          label: "View Unit Details",
          description: "View detailed information for this unit",
        },
        {
          key: "open-charges",
          label: "Open Charges",
          description: "Navigate to the Charges module",
        },
      ],
      GET_UNIT_PRIMARY_RESIDENT: [
        {
          key: "open-units",
          label: "Open Units",
          description: "Navigate to the Units module",
        },
      ],
    };

    return intentActions[intentCode] ?? [];
  }

  private isAggregateDebtQuery(normalizedQuestion: string): boolean {
    return (
      normalizedQuestion.includes("top") ||
      normalizedQuestion.includes("ranking") ||
      normalizedQuestion.includes("moroso") ||
      normalizedQuestion.includes("morosidad") ||
      normalizedQuestion.includes("aging") ||
      normalizedQuestion.includes("antiguedad") ||
      normalizedQuestion.includes("resumen") ||
      normalizedQuestion.includes("que torres") ||
      normalizedQuestion.includes("deuda por torre") ||
      normalizedQuestion.includes("deuda por edificio") ||
      normalizedQuestion.includes("unidades con deuda") ||
      normalizedQuestion.includes("listame unidades con deuda") ||
      normalizedQuestion.includes("cargos pendientes") ||
      normalizedQuestion.includes("quienes deben") ||
      normalizedQuestion.includes("quien debe") ||
      normalizedQuestion.includes("tienen deuda") ||
      normalizedQuestion.includes("deben este mes") ||
      normalizedQuestion.includes("deben expensa") ||
      normalizedQuestion.includes("departamentos deben")
    );
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
  }

  private formatDateSafe(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toISOString().slice(0, 10);
  }

  private resolveModuleFromRoute(route: string): string {
    if (route.includes("/charges") || route.includes("/finanzas")) return "charges";
    if (route.includes("/payments")) return "payments";
    if (route.includes("/units")) return "units";
    if (route.includes("/buildings")) return "buildings";
    if (route.includes("/tickets") || route.includes("/support")) return "tickets";
    if (route.includes("/communications") || route.includes("/comunicados") || route.includes("/avisos")) return "communications";
    if (route.includes("/documents") || route.includes("/documentos") || route.includes("/archivos")) return "documents";
    return "general";
  }

  private async resolvePermissions(
    _userId: string,
    _tenantId?: string,
    role?: string
  ): Promise<string[]> {
    const allPermissions = [
      "buildings.read",
      "buildings.write",
      "units.read",
      "units.write",
      "charges.read",
      "charges.write",
      "charges.publish",
      "payments.read",
      "payments.write",
      "payments.approve",
      "tickets.read",
      "tickets.write",
      "communications.read",
      "communications.write",
      "documents.read",
      "documents.write",
    ];

    const operatorPermissions = [
      "buildings.read",
      "units.read",
      "charges.read",
      "charges.write",
      "payments.read",
      "payments.approve",
      "tickets.read",
      "tickets.write",
      "communications.read",
      "communications.write",
      "documents.read",
      "documents.write",
    ];

    const residentPermissions = [
      "charges.read",
      "payments.read",
      "payments.write",
      "tickets.read",
      "communications.read",
      "documents.read",
    ];

    if (role === "RESIDENT") {
      return residentPermissions;
    }

    if (role === "OPERATOR") {
      return operatorPermissions;
    }

    return allPermissions;
  }
}
