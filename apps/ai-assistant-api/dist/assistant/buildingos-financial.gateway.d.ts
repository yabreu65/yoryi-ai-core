import type { BuildingOSFinancialGateway, ResidentDebtSummary, ResidentDebtSummaryInput } from "@yoryi/ai-adapters";
type HttpFinancialGatewayOptions = {
    baseUrl?: string;
    timeoutMs?: number;
    apiKey?: string;
    circuitBreakerFailureThreshold?: number;
    circuitBreakerOpenMs?: number;
};
export declare class HttpBuildingOSFinancialGateway implements BuildingOSFinancialGateway {
    private readonly baseUrl?;
    private readonly timeoutMs;
    private readonly apiKey?;
    private readonly circuitBreakerFailureThreshold;
    private readonly circuitBreakerOpenMs;
    private consecutiveFailures;
    private openUntilTs;
    constructor(options?: HttpFinancialGatewayOptions);
    getResidentDebtSummary(input: ResidentDebtSummaryInput): Promise<ResidentDebtSummary | null>;
    private buildHeaders;
    private registerSuccess;
    private registerFailure;
}
export {};
