import { AssistantService } from "./assistant.service";
import type { AssistantRuntimeContext, TenantContext } from "@yoryi/ai-types";
declare class ChatRequestDto {
    message: string;
    context: TenantContext | undefined;
    useLlm?: boolean;
    sessionId?: string;
}
declare class ExecuteActionRequestDto {
    actionKey: string;
    context?: Partial<AssistantRuntimeContext>;
    confirmed?: boolean;
    params?: Record<string, unknown>;
}
declare class RagReindexRequestDto {
    apps?: string[];
}
export declare class AssistantController {
    private readonly assistantService;
    constructor(assistantService: AssistantService);
    chat(dto: ChatRequestDto, req: any): Promise<import("@yoryi/ai-core").ChatResponse>;
    getRolloutStatus(dto: {
        context?: Partial<AssistantRuntimeContext>;
    }, req: any): {
        decision: import("./assistant-rollout-policy.service").AssistantRolloutDecision;
        context: AssistantRuntimeContext;
    };
    executeAction(dto: ExecuteActionRequestDto, req: any): Promise<import("@yoryi/ai-types").ActionExecutionResult>;
    reindexRag(dto: RagReindexRequestDto, req: any): Promise<{
        reports: import("@yoryi/ai-rag").RagIndexReport[];
    }>;
    private extractReindexToken;
    private assertReindexToken;
}
export {};
