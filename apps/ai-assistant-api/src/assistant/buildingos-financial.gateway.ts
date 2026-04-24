import type {
  BuildingOSFinancialGateway,
  ResidentDebtSummary,
  ResidentDebtSummaryInput,
} from "@yoryi/ai-adapters";

type HttpFinancialGatewayOptions = {
  baseUrl?: string;
  timeoutMs?: number;
  apiKey?: string;
  circuitBreakerFailureThreshold?: number;
  circuitBreakerOpenMs?: number;
};

export class HttpBuildingOSFinancialGateway implements BuildingOSFinancialGateway {
  private readonly baseUrl?: string;
  private readonly timeoutMs: number;
  private readonly apiKey?: string;
  private readonly circuitBreakerFailureThreshold: number;
  private readonly circuitBreakerOpenMs: number;
  private consecutiveFailures = 0;
  private openUntilTs = 0;

  constructor(options: HttpFinancialGatewayOptions = {}) {
    this.baseUrl = options.baseUrl;
    this.timeoutMs = options.timeoutMs ?? 800;
    this.apiKey = options.apiKey;
    this.circuitBreakerFailureThreshold =
      options.circuitBreakerFailureThreshold ?? 3;
    this.circuitBreakerOpenMs = options.circuitBreakerOpenMs ?? 30_000;
  }

  async getResidentDebtSummary(
    input: ResidentDebtSummaryInput
  ): Promise<ResidentDebtSummary | null> {
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

      const payload = (await response.json()) as Partial<ResidentDebtSummary>;
      if (
        typeof payload.amount !== "number" ||
        typeof payload.currency !== "string" ||
        typeof payload.asOf !== "string"
      ) {
        this.registerFailure();
        return null;
      }

      this.registerSuccess();
      return {
        amount: payload.amount,
        currency: payload.currency,
        asOf: payload.asOf,
      };
    } catch {
      this.registerFailure();
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildHeaders(): Record<string, string> {
    if (!this.apiKey) {
      return {};
    }

    return {
      "x-api-key": this.apiKey,
    };
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
