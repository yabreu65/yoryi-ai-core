"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpBuildingOSReadOnlyQueryGateway = void 0;
class HttpBuildingOSReadOnlyQueryGateway {
    baseUrl;
    timeoutMs;
    apiKey;
    endpointPath;
    circuitBreakerFailureThreshold;
    circuitBreakerOpenMs;
    consecutiveFailures = 0;
    openUntilTs = 0;
    constructor(options = {}) {
        this.baseUrl = options.baseUrl;
        this.timeoutMs = options.timeoutMs ?? 900;
        this.apiKey = options.apiKey;
        this.endpointPath = options.endpointPath ?? "/assistant/read-only-query";
        this.circuitBreakerFailureThreshold =
            options.circuitBreakerFailureThreshold ?? 3;
        this.circuitBreakerOpenMs = options.circuitBreakerOpenMs ?? 30_000;
    }
    async query(input) {
        if (!this.baseUrl || !input.context.tenantId) {
            return null;
        }
        if (Date.now() < this.openUntilTs) {
            return null;
        }
        const url = new URL(this.endpointPath, this.baseUrl);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            const response = await fetch(url.toString(), {
                method: "POST",
                headers: this.buildHeadersForContext(input.context),
                body: JSON.stringify({
                    intentCode: input.intentCode,
                    contractVersion: "2026-04-readonly-v1",
                    question: input.question,
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
            const payload = (await response.json());
            const parsed = this.parseGatewayResponse(payload);
            if (!parsed) {
                this.registerFailure();
                return null;
            }
            this.registerSuccess();
            const metadata = {
                ...(parsed.metadata ?? {}),
                intent: input.intentCode,
                intentCode: input.intentCode,
                answerSource: "live_data",
            };
            if (parsed.responseType) {
                metadata.responseType = parsed.responseType;
            }
            if (parsed.dataScope) {
                metadata.dataScope = parsed.dataScope;
            }
            return {
                answer: parsed.answer,
                actions: parsed.actions,
                metadata,
            };
        }
        catch {
            this.registerFailure();
            return null;
        }
        finally {
            clearTimeout(timeout);
        }
    }
    buildHeaders() {
        const headers = {
            "content-type": "application/json",
        };
        if (this.apiKey) {
            headers["x-api-key"] = this.apiKey;
        }
        return headers;
    }
    buildHeadersForContext(context) {
        const headers = this.buildHeaders();
        if (context.tenantId) {
            headers["x-tenant-id"] = context.tenantId;
        }
        headers["x-user-id"] = context.userId;
        headers["x-user-role"] = context.role;
        headers["x-app-id"] = context.appId;
        return headers;
    }
    parseGatewayResponse(payload) {
        if (!this.isRecord(payload)) {
            return null;
        }
        const answer = this.asNonEmptyString(payload.answer);
        if (!answer) {
            return null;
        }
        const answerSource = this.asNonEmptyString(payload.answerSource);
        if (answerSource && answerSource !== "live_data") {
            return null;
        }
        const response = { answer };
        const responseType = this.asNonEmptyString(payload.responseType);
        const dataScope = this.asNonEmptyString(payload.dataScope);
        const actions = this.parseActions(payload.actions);
        const metadata = this.parseMetadata(payload.metadata);
        if (responseType) {
            response.responseType = responseType;
        }
        if (dataScope) {
            response.dataScope = dataScope;
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
    parseActions(value) {
        if (!Array.isArray(value)) {
            return [];
        }
        const actions = [];
        for (const rawAction of value) {
            if (!this.isRecord(rawAction)) {
                continue;
            }
            const key = this.asNonEmptyString(rawAction.key);
            const label = this.asNonEmptyString(rawAction.label);
            if (!key || !label) {
                continue;
            }
            const action = { key, label };
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
            const requiredPermission = this.asNonEmptyString(rawAction.requiredPermission);
            if (requiredPermission) {
                action.requiredPermission = requiredPermission;
            }
            actions.push(action);
        }
        return actions;
    }
    parseMetadata(value) {
        if (!this.isRecord(value)) {
            return null;
        }
        return value;
    }
    asNonEmptyString(value) {
        if (typeof value !== "string") {
            return null;
        }
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }
    isRecord(value) {
        return typeof value === "object" && value !== null && !Array.isArray(value);
    }
    registerSuccess() {
        this.consecutiveFailures = 0;
        this.openUntilTs = 0;
    }
    registerFailure() {
        this.consecutiveFailures += 1;
        if (this.consecutiveFailures >= this.circuitBreakerFailureThreshold) {
            this.openUntilTs = Date.now() + this.circuitBreakerOpenMs;
            this.consecutiveFailures = 0;
        }
    }
}
exports.HttpBuildingOSReadOnlyQueryGateway = HttpBuildingOSReadOnlyQueryGateway;
