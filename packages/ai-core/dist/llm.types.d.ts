export type LlmMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};
export type LlmRequest = {
    model: string;
    messages: LlmMessage[];
    temperature?: number;
    maxTokens?: number;
};
export type LlmResponse = {
    model: string;
    message: {
        role: "assistant";
        content: string;
    };
    done: boolean;
};
export interface LlmProvider {
    readonly providerName: string;
    isAvailable(): Promise<boolean>;
    generate(request: LlmRequest): Promise<string>;
    buildPrompt(params: {
        question: string;
        module?: string;
        role: string;
        knowledgeContent: string;
    }): LlmMessage[];
}
export type LlmConfig = {
    baseUrl: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
};
export declare const DEFAULT_LLM_CONFIG: Required<LlmConfig>;
