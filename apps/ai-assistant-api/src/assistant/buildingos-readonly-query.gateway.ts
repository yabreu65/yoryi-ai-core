import type {
  ActionDefinition,
  DataBackedAnswerResult,
} from "@yoryi/ai-types";
import type {
  BuildingOSReadOnlyQueryGateway,
  BuildingOSReadOnlyQueryInput,
} from "@yoryi/ai-adapters";

type HttpReadOnlyQueryGatewayOptions = {
  baseUrl?: string;
  timeoutMs?: number;
  apiKey?: string;
  endpointPath?: string;
  circuitBreakerFailureThreshold?: number;
  circuitBreakerOpenMs?: number;
};

type ReadOnlyGatewayResponse = {
  contractVersion?: string;
  answer: string;
  answerSource?: "live_data";
  responseType?: "metric" | "list" | "summary" | "no_data" | "clarification";
  dataScope?: "tenant" | "self" | "module" | "unknown";
  actions?: ActionDefinition[];
  metadata?: Record<string, unknown>;
};

const RESPONSE_SCHEMA_VERSION = "2026-04-p0-response-v1";

export class HttpBuildingOSReadOnlyQueryGateway
  implements BuildingOSReadOnlyQueryGateway
{
  private readonly baseUrl?: string;
  private readonly timeoutMs: number;
  private readonly apiKey?: string;
  private readonly endpointPath: string;
  private readonly circuitBreakerFailureThreshold: number;
  private readonly circuitBreakerOpenMs: number;
  private consecutiveFailures = 0;
  private openUntilTs = 0;

  constructor(options: HttpReadOnlyQueryGatewayOptions = {}) {
    this.baseUrl = options.baseUrl;
    this.timeoutMs = options.timeoutMs ?? 900;
    this.apiKey = options.apiKey;
    this.endpointPath = options.endpointPath ?? "/assistant/read-only-query";
    this.circuitBreakerFailureThreshold =
      options.circuitBreakerFailureThreshold ?? 3;
    this.circuitBreakerOpenMs = options.circuitBreakerOpenMs ?? 30_000;
  }

  async query(
    input: BuildingOSReadOnlyQueryInput
  ): Promise<DataBackedAnswerResult | null> {
    if (!this.baseUrl || !input.context.tenantId) {
      return null;
    }
    if (Date.now() < this.openUntilTs) {
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const endpointPath = input.toolName
        ? `/assistant/tools/${input.toolName}`
        : this.endpointPath;
      const url = new URL(endpointPath, this.baseUrl);
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: this.buildHeadersForContext(input.context),
        body: JSON.stringify({
          intentCode: input.intentCode,
          contractVersion: "2026-04-readonly-v1",
          question: input.question,
          responseContractVersion: RESPONSE_SCHEMA_VERSION,
          toolInput: input.toolInput,
          context: {
            appId: input.context.appId,
            tenantId: input.context.tenantId,
            userId: input.context.userId,
            role: input.context.role,
            route: input.context.route,
            currentModule: input.context.currentModule,
            permissions: input.context.permissions,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        this.registerFailure();
        return null;
      }

      const payload = (await response.json()) as unknown;
      const parsed = this.parseGatewayResponse(payload);
      if (!parsed) {
        this.registerFailure();
        return null;
      }

      this.registerSuccess();
      const metadata: Record<string, unknown> = {
        ...(parsed.metadata ?? {}),
        intent: input.intentCode,
        intentCode: input.intentCode,
        answerSource: "live_data",
        toolName: input.toolName,
      };
      if (parsed.responseType) {
        metadata.responseType = parsed.responseType;
      }
      if (parsed.dataScope) {
        metadata.dataScope = parsed.dataScope;
      }
      if (parsed.contractVersion) {
        metadata.contractVersion = parsed.contractVersion;
      }

      return {
        answer: parsed.answer,
        actions: parsed.actions,
        metadata,
      };
    } catch {
      this.registerFailure();
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };

    if (this.apiKey) {
      headers["x-api-key"] = this.apiKey;
    }

    return headers;
  }

  private buildHeadersForContext(
    context: BuildingOSReadOnlyQueryInput["context"]
  ): Record<string, string> {
    const headers = this.buildHeaders();
    if (context.tenantId) {
      headers["x-tenant-id"] = context.tenantId;
    }
    headers["x-user-id"] = context.userId;
    headers["x-user-role"] = context.role;
    headers["x-app-id"] = context.appId;

    return headers;
  }

  private parseGatewayResponse(payload: unknown): ReadOnlyGatewayResponse | null {
    if (!this.isRecord(payload)) {
      return null;
    }

    if (this.isSchemaPayload(payload)) {
      return {
        contractVersion: payload.contractVersion as string,
        answer: payload.answer as string,
        answerSource:
          payload.answerSource === "live_data" ? "live_data" : undefined,
        responseType: payload.responseType as ReadOnlyGatewayResponse["responseType"],
        dataScope: payload.dataScope as ReadOnlyGatewayResponse["dataScope"],
        actions: payload.actions as ActionDefinition[],
        metadata: payload.metadata as Record<string, unknown>,
      };
    }

    const answer = this.asNonEmptyString(payload.answer);
    if (!answer) {
      return null;
    }

    const answerSource = this.asNonEmptyString(payload.answerSource);
    if (answerSource && answerSource !== "live_data") {
      return null;
    }

    const response: ReadOnlyGatewayResponse = { answer };
    const responseType = this.asNonEmptyString(payload.responseType);
    const dataScope = this.asNonEmptyString(payload.dataScope);
    const actions = this.parseActions(payload.actions);
    const metadata = this.parseMetadata(payload.metadata);

    if (responseType) {
      response.responseType = responseType as ReadOnlyGatewayResponse["responseType"];
    }
    if (dataScope) {
      response.dataScope = dataScope as ReadOnlyGatewayResponse["dataScope"];
    }
    response.answerSource = "live_data";
    if (actions.length > 0) {
      response.actions = actions;
    }
    if (metadata) {
      response.metadata = metadata;
    }

    return response;
  }

  private parseActions(value: unknown): ActionDefinition[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const actions: ActionDefinition[] = [];
    for (const rawAction of value) {
      if (!this.isRecord(rawAction)) {
        continue;
      }

      const key = this.asNonEmptyString(rawAction.key);
      const label = this.asNonEmptyString(rawAction.label);
      if (!key || !label) {
        continue;
      }

      const action: ActionDefinition = { key, label };
      const description = this.asNonEmptyString(rawAction.description);
      if (description) {
        action.description = description;
      }
      if (typeof rawAction.requiresConfirmation === "boolean") {
        action.requiresConfirmation = rawAction.requiresConfirmation;
      }
      if (typeof rawAction.destructive === "boolean") {
        action.destructive = rawAction.destructive;
      }
      const requiredPermission = this.asNonEmptyString(
        rawAction.requiredPermission
      );
      if (requiredPermission) {
        action.requiredPermission = requiredPermission;
      }

      actions.push(action);
    }

    return actions;
  }

  private parseMetadata(value: unknown): Record<string, unknown> | null {
    if (!this.isRecord(value)) {
      return null;
    }

    return value;
  }

  private asNonEmptyString(value: unknown): string | null {
    if (typeof value !== "string") {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private isSchemaPayload(value: unknown): value is Record<string, unknown> {
    if (!this.isRecord(value)) {
      return false;
    }

    const answer = this.asNonEmptyString(value.answer);
    const contractVersion = this.asNonEmptyString(value.contractVersion);
    const answerSource = this.asNonEmptyString(value.answerSource);
    const responseType = this.asNonEmptyString(value.responseType);
    const dataScope = this.asNonEmptyString(value.dataScope);

    return Boolean(
      answer &&
        contractVersion &&
        (answerSource === "live_data" || answerSource === "fallback") &&
        responseType &&
        dataScope &&
        Array.isArray(value.actions) &&
        this.isRecord(value.metadata)
    );
  }

  private registerSuccess(): void {
    this.consecutiveFailures = 0;
    this.openUntilTs = 0;
  }

  private registerFailure(): void {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.circuitBreakerFailureThreshold) {
      this.openUntilTs = Date.now() + this.circuitBreakerOpenMs;
      this.consecutiveFailures = 0;
    }
  }
}
