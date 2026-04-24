import type { EmbeddingProvider } from "./types";
export type RagRuntimeConfig = {
    enabled: boolean;
    dbUrl?: string;
    embeddingModel: string;
    topK: number;
    minScore: number;
};
export declare function getRagRuntimeConfig(): RagRuntimeConfig;
export declare function createDefaultEmbeddingProvider(options?: {
    baseUrl?: string;
    model?: string;
    fallbackToHash?: boolean;
}): EmbeddingProvider;
