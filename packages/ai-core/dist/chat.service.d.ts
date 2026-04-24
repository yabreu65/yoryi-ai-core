import type { ActionDefinition, AssistantRuntimeContext, ResolvedAssistantContext, SaasAssistantAdapter } from "@yoryi/ai-types";
import { KnowledgeService } from "./knowledge.service";
import type { LlmProvider } from "./llm.types";
import { InMemorySessionMemory } from "./session-memory";
export type AssistantResponseType = "metric" | "list" | "summary" | "no_data" | "clarification";
export type AssistantDataScope = "tenant" | "self" | "module" | "unknown";
export type AssistantProvenance = {
    strategy: "live_data" | "knowledge" | "fallback";
    sources: Array<{
        type: "gateway" | "knowledge" | "system";
        name: string;
        score?: number;
        metadata?: Record<string, unknown>;
    }>;
};
export type ChatRequest = {
    message: string;
    context: AssistantRuntimeContext;
    useLlm?: boolean;
    sessionId?: string;
};
export type ChatResponse = {
    message: string;
    answer: string;
    answerSource: "live_data" | "knowledge" | "fallback";
    responseType: AssistantResponseType;
    dataScope: AssistantDataScope;
    provenance: AssistantProvenance;
    auditId: string;
    context: ResolvedAssistantContext;
    actions: ActionDefinition[];
    llmUsed?: boolean;
    knowledgeUsed?: {
        module?: string;
        found: boolean;
        sources: Array<{
            type: string;
            fileName: string;
            trace?: {
                rankingVersion: string;
                strategyId: string;
                semanticScore?: number;
                semanticSourceType?: string;
                moduleScore: number;
                keywordScore: number;
                tagScore: number;
                occupantScore: number;
                totalScore: number;
                matchedModule: boolean;
                matchedOccupantScope: boolean;
                matchedTags: string[];
                matchedKeywords: string[];
            };
        }>;
    };
    sessionInsights?: {
        sessionId?: string;
        interactionCount: number;
        repeatedQuestion: boolean;
        recentModule?: string;
    };
};
export type ChatServiceOptions = {
    queryOnly?: boolean;
};
export declare class ChatService {
    private readonly adapter;
    private readonly knowledgeService?;
    private readonly llmProvider?;
    private readonly sessionMemory;
    private readonly options;
    private readonly intentRouter;
    constructor(adapter: SaasAssistantAdapter, knowledgeService?: KnowledgeService | undefined, llmProvider?: LlmProvider | undefined, sessionMemory?: InMemorySessionMemory, options?: ChatServiceOptions);
    handle(request: ChatRequest): Promise<ChatResponse>;
    private createAuditId;
    private resolveDataScope;
    private resolveLiveDataResponseType;
    private resolveKnowledgeOrFallbackResponseType;
    private buildLiveDataProvenance;
    private buildKnowledgeOrFallbackProvenance;
    private asResponseType;
    private isListLikeAnswer;
    private isMetricLikeAnswer;
    private applyBehavioralActionPrioritization;
    private filterActionsForQueryOnly;
    private isTransactionalAction;
    private buildReadOnlyMutationAnswer;
    private resolveManualModulePath;
    private buildAmbiguousQuestionAnswer;
    private adaptAnswerWithSessionContext;
    private buildLlmAnswer;
    private extractKnowledgeForLlm;
    private buildContextualAnswer;
    private isDebtQuestion;
    private detectIntent;
    private buildShortWorkflowAnswer;
    private prioritizeDocuments;
    private extractRelevantSnippets;
    private toPlainText;
    private buildAnswerFromSnippets;
    private buildFallbackAnswer;
}
