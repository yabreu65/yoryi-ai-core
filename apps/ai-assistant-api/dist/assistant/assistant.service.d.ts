import type { ChatResponse } from "@yoryi/ai-core";
import type { ActionExecutionResult, AssistantRuntimeContext } from "@yoryi/ai-types";
import { type RagIndexReport } from "@yoryi/ai-rag";
import { AssistantRolloutDecision } from "./assistant-rollout-policy.service";
export declare class AssistantService {
    private readonly adaptersByApp;
    private readonly chatServicesByApp;
    private readonly ragIndexer;
    private readonly ragRuntimeConfig;
    private readonly rateLimiter;
    private readonly rolloutPolicy;
    constructor();
    handleChat(request: {
        message: string;
        context?: Partial<AssistantRuntimeContext>;
        authContext?: Partial<AssistantRuntimeContext>;
        useLlm?: boolean;
        sessionId?: string;
    }): Promise<ChatResponse>;
    executeAction(request: {
        actionKey: string;
        context?: Partial<AssistantRuntimeContext>;
        authContext?: Partial<AssistantRuntimeContext>;
        confirmed?: boolean;
        params?: Record<string, unknown>;
    }): Promise<ActionExecutionResult>;
    reindexRagKnowledge(request: {
        token?: string;
        apps?: string[];
    }): Promise<{
        reports: RagIndexReport[];
    }>;
    getRolloutStatus(request: {
        context?: Partial<AssistantRuntimeContext>;
        authContext?: Partial<AssistantRuntimeContext>;
    }): {
        decision: AssistantRolloutDecision;
        context: AssistantRuntimeContext;
    };
    private buildServerAuthoritativeContext;
    private resolveAdapter;
    private resolveChatService;
    private assertReindexToken;
    private createRagStore;
    private createPostgresQueryExecutor;
    private parsePositiveInt;
    private assertRateLimit;
    private assertRolloutAccess;
}
