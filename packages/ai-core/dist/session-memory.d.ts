import type { ActionDefinition, ResolvedAssistantContext } from "@yoryi/ai-types";
export type SessionMemorySnapshot = {
    interactionCount: number;
    repeatedQuestion: boolean;
    recentModule?: string;
    preferredActionKeys: string[];
};
export type SessionMemoryInput = {
    context: ResolvedAssistantContext;
    question: string;
    sessionId?: string;
};
export type SessionMemoryPersistInput = {
    context: ResolvedAssistantContext;
    question: string;
    actions: ActionDefinition[];
    sessionId?: string;
};
export declare class InMemorySessionMemory {
    private readonly sessions;
    private readonly maxInteractionsPerSession;
    getSnapshot(input: SessionMemoryInput): SessionMemorySnapshot;
    remember(input: SessionMemoryPersistInput): void;
    private extractPreferredActionKeys;
    private buildKey;
    private normalizeQuestion;
}
