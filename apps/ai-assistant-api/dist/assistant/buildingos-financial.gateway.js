"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpBuildingOSFinancialGateway = void 0;
class HttpBuildingOSFinancialGateway {
    baseUrl;
    timeoutMs;
    apiKey;
    circuitBreakerFailureThreshold;
    circuitBreakerOpenMs;
    consecutiveFailures = 0;
    openUntilTs = 0;
    constructor(options = {}) {
        this.baseUrl = options.baseUrl;
        this.timeoutMs = options.timeoutMs ?? 800;
        this.apiKey = options.apiKey;
        this.circuitBreakerFailureThreshold =
            options.circuitBreakerFailureThreshold ?? 3;
        this.circuitBreakerOpenMs = options.circuitBreakerOpenMs ?? 30_000;
    }
    async getResidentDebtSummary(input) {
        if (!this.baseUrl) {
            return null;
        }
        if (Date.now() < this.openUntilTs) {
            return null;
        }
        const url = new URL("/resident-debt-summary", this.baseUrl);
        url.searchParams.set("tenantId", input.tenantId);
        url.searchParams.set("userId", input.userId);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            const response = await fetch(url.toString(), {
                method: "GET",
                headers: this.buildHeaders(),
                signal: controller.signal,
            });
            if (!response.ok) {
                this.registerFailure();
                return null;
            }
            const payload = (await response.json());
            if (typeof payload.amount !== "number" ||
                typeof payload.currency !== "string" ||
                typeof payload.asOf !== "string") {
                this.registerFailure();
                return null;
            }
            this.registerSuccess();
            return {
                amount: payload.amount,
                currency: payload.currency,
                asOf: payload.asOf,
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
        if (!this.apiKey) {
            return {};
        }
        return {
            "x-api-key": this.apiKey,
        };
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
exports.HttpBuildingOSFinancialGateway = HttpBuildingOSFinancialGateway;
