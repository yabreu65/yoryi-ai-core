import type { EmbeddingProvider, RagIndexReport, RagKnowledgeSource, RagStore } from "./types";
export declare class RagIndexer {
    private readonly source;
    private readonly store;
    private readonly embeddings;
    constructor(source: RagKnowledgeSource, store: RagStore, embeddings: EmbeddingProvider);
    reindexApps(appIds: string[]): Promise<RagIndexReport[]>;
    reindexApp(appId: string): Promise<RagIndexReport>;
}
export declare function chunkDocument(content: string, options?: {
    maxChunkChars?: number;
}): Array<{
    chunkIndex: number;
    chunkText: string;
    tokenCount: number;
}>;
