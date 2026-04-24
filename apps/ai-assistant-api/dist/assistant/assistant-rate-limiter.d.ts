type AssistantRateLimiterOptions = {
    enabled: boolean;
    maxRequests: number;
    windowMs: number;
};
type AssistantRateLimitInput = {
    appId: string;
    tenantId?: string;
    userId: string;
    operation: "chat" | "action";
};
export type AssistantRateLimitResult = {
    allowed: boolean;
    remaining: number;
    resetAt: number;
};
export declare class InMemoryAssistantRateLimiter {
    private readonly options;
    private readonly buckets;
    constructor(options: AssistantRateLimiterOptions);
    consume(input: AssistantRateLimitInput, now?: number): AssistantRateLimitResult;
    private getBucketForWindow;
    private buildKey;
}
export {};
