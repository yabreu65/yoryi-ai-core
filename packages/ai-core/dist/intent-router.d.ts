export type ChatIntentRoute = "live_data_or_knowledge" | "mutation_blocked" | "ambiguous";
export type ChatIntentRouterInput = {
    question: string;
    queryOnly: boolean;
    currentModule?: string;
    hasRecentModuleContext?: boolean;
};
export declare class ChatIntentRouter {
    route(input: ChatIntentRouterInput): ChatIntentRoute;
    isMutationRequest(question: string): boolean;
    private isHowToMutationQuestion;
    private isAmbiguousRequest;
    private hasDomainKeyword;
    private hasConcreteModuleContext;
    private isFollowUpReference;
    private isReferentialQuestion;
    private startsWithInterrogative;
    private normalizeText;
    private tokenize;
}
