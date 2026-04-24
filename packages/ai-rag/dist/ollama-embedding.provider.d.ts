import type { EmbeddingProvider } from "./types";
export declare class OllamaEmbeddingProvider implements EmbeddingProvider {
    private readonly options;
    constructor(options: {
        baseUrl: string;
        model: string;
        timeoutMs?: number;
    });
    embed(texts: string[]): Promise<number[][]>;
}
