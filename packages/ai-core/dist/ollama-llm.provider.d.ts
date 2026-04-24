import { LlmProvider, LlmConfig, LlmRequest, LlmMessage } from "./llm.types";
export declare class OllamaLlmProvider implements LlmProvider {
    readonly providerName = "ollama";
    readonly model: string;
    private readonly config;
    constructor(config?: Partial<LlmConfig>);
    isAvailable(): Promise<boolean>;
    generate(request: LlmRequest): Promise<string>;
    buildPrompt(params: {
        question: string;
        module?: string;
        role: string;
        knowledgeContent: string;
    }): LlmMessage[];
    private buildUserPrompt;
}
