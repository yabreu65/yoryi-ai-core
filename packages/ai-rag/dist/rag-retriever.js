"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RagRetriever = void 0;
class RagRetriever {
    store;
    embeddings;
    defaults;
    constructor(store, embeddings, defaults) {
        this.store = store;
        this.embeddings = embeddings;
        this.defaults = defaults;
    }
    async retrieve(input) {
        const [queryEmbedding] = await this.embeddings.embed([input.question]);
        if (!queryEmbedding || queryEmbedding.length === 0) {
            return [];
        }
        const topK = input.topK ?? this.defaults?.topK ?? 5;
        const minScore = input.minScore ?? this.defaults?.minScore ?? 0.35;
        const chunks = await this.store.search({
            ...input,
            queryEmbedding,
            topK,
            minScore,
        });
        return chunks.map((chunk) => ({
            sourceType: chunk.metadata.type,
            fileName: chunk.metadata.fileName,
            filePath: chunk.metadata.filePath,
            content: chunk.chunkText,
            score: chunk.score,
            metadata: {
                appId: chunk.metadata.appId,
                module: chunk.metadata.module,
                roleScope: chunk.metadata.roleScope,
            },
        }));
    }
}
exports.RagRetriever = RagRetriever;
