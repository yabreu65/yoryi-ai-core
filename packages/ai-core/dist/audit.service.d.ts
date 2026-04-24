import type { AiAuditOutcome } from "@yoryi/ai-types";
export declare class AiAuditService {
    private asyncQueue;
    private flushIntervalMs;
    private isProcessing;
    constructor();
    private startFlushLoop;
    private flushPendingEvents;
    private persistEvent;
    createAuditId(): string;
    logRequest(params: {
        auditId: string;
        tenantId: string;
        appId: string;
        userId: string;
        message: string;
        contextSnapshot?: Record<string, unknown>;
    }): void;
    logToolCall(params: {
        auditId: string;
        toolName: string;
        toolInput?: Record<string, unknown>;
        toolOutput?: Record<string, unknown>;
    }): void;
    logResponse(params: {
        auditId: string;
        outcome: AiAuditOutcome;
        errorMessage?: string;
        durationMs?: number;
        llmUsed?: boolean;
    }): void;
    logError(params: {
        auditId: string;
        tenantId: string;
        appId: string;
        userId: string;
        errorMessage: string;
    }): void;
}
export declare const auditService: AiAuditService;
