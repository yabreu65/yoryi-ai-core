import type { DataBackedAnswerResult } from "@yoryi/ai-types";
import type { BuildingOSReadOnlyQueryGateway, BuildingOSReadOnlyQueryInput } from "@yoryi/ai-adapters";
type HttpReadOnlyQueryGatewayOptions = {
    baseUrl?: string;
    timeoutMs?: number;
    apiKey?: string;
    endpointPath?: string;
    circuitBreakerFailureThreshold?: number;
    circuitBreakerOpenMs?: number;
};
export declare class HttpBuildingOSReadOnlyQueryGateway implements BuildingOSReadOnlyQueryGateway {
    private readonly baseUrl?;
    private readonly timeoutMs;
    private readonly apiKey?;
    private readonly endpointPath;
    private readonly circuitBreakerFailureThreshold;
    private readonly circuitBreakerOpenMs;
    private consecutiveFailures;
    private openUntilTs;
    constructor(options?: HttpReadOnlyQueryGatewayOptions);
    query(input: BuildingOSReadOnlyQueryInput): Promise<DataBackedAnswerResult | null>;
    private buildHeaders;
    private buildHeadersForContext;
    private parseGatewayResponse;
    private parseActions;
    private parseMetadata;
    private asNonEmptyString;
    private isRecord;
    private registerSuccess;
    private registerFailure;
}
export {};
