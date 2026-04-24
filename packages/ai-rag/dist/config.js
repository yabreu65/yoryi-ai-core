"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRagRuntimeConfig = getRagRuntimeConfig;
exports.createDefaultEmbeddingProvider = createDefaultEmbeddingProvider;
const hash_embedding_provider_1 = require("./hash-embedding.provider");
const ollama_embedding_provider_1 = require("./ollama-embedding.provider");
function getRagRuntimeConfig() {
    const enabled = process.env.RAG_ENABLED === "true";
    const dbUrl = process.env.RAG_DB_URL;
    const embeddingModel = process.env.RAG_EMBEDDING_MODEL ?? "nomic-embed-text";
    const topK = parseInt(process.env.RAG_TOP_K ?? "5", 10);
    const minScore = parseFloat(process.env.RAG_MIN_SCORE ?? "0.35");
    return {
        enabled,
        dbUrl: dbUrl && dbUrl.trim().length > 0 ? dbUrl : undefined,
        embeddingModel,
        topK: Number.isFinite(topK) ? topK : 5,
        minScore: Number.isFinite(minScore) ? minScore : 0.35,
    };
}
function createDefaultEmbeddingProvider(options) {
    const useHash = process.env.RAG_EMBEDDINGS_PROVIDER === "hash" ||
        options?.fallbackToHash === true;
    if (useHash) {
        return new hash_embedding_provider_1.HashEmbeddingProvider();
    }
    return new ollama_embedding_provider_1.OllamaEmbeddingProvider({
        baseUrl: options?.baseUrl ?? process.env.LLM_BASE_URL ?? "http://localhost:11434",
        model: options?.model ?? process.env.RAG_EMBEDDING_MODEL ?? "nomic-embed-text",
    });
}
