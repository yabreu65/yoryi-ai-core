import type { SemanticRetrieveInput, SemanticRetrievalResult, SemanticRetriever } from "@yoryi/ai-types";
import type { EmbeddingProvider, RagStore } from "./types";
export declare class RagRetriever implements SemanticRetriever {
    private readonly store;
    private readonly embeddings;
    private readonly defaults?;
    constructor(store: RagStore, embeddings: EmbeddingProvider, defaults?: {
        topK?: number;
        minScore?: number;
    } | undefined);
    retrieve(input: SemanticRetrieveInput): Promise<SemanticRetrievalResult[]>;
}
