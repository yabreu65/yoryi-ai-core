"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryRagStore = void 0;
const node_crypto_1 = require("node:crypto");
class InMemoryRagStore {
    documents = new Map();
    chunksByDocument = new Map();
    async getIndexedDocuments(appId) {
        return [...this.documents.values()]
            .filter((document) => document.appId === appId)
            .map((document) => ({
            documentId: document.documentId,
            appId: document.appId,
            filePath: document.filePath,
            checksum: document.checksum,
        }));
    }
    async upsertDocument(input) {
        const existing = [...this.documents.values()].find((document) => document.appId === input.appId && document.filePath === input.filePath);
        const documentId = existing?.documentId ?? (0, node_crypto_1.randomUUID)();
        this.documents.set(documentId, {
            documentId,
            appId: input.appId,
            type: input.type,
            module: input.module,
            roleScope: input.roleScope,
            filePath: input.filePath,
            fileName: input.fileName,
            checksum: input.checksum,
            metadata: input.metadata,
        });
        return { documentId };
    }
    async replaceChunks(documentId, chunks) {
        this.chunksByDocument.set(documentId, chunks.map((chunk) => ({
            documentId,
            chunkIndex: chunk.chunkIndex,
            chunkText: chunk.chunkText,
            embedding: chunk.embedding,
            tokenCount: chunk.tokenCount,
        })));
    }
    async search(input) {
        const candidates = [];
        for (const [documentId, chunks] of this.chunksByDocument.entries()) {
            const document = this.documents.get(documentId);
            if (!document) {
                continue;
            }
            if (document.appId !== input.appId) {
                continue;
            }
            if (input.module && document.module && document.module !== input.module) {
                continue;
            }
            if (input.role && document.roleScope && document.roleScope.length > 0) {
                const matchesRole = document.roleScope.includes(input.role);
                if (!matchesRole) {
                    continue;
                }
            }
            for (const chunk of chunks) {
                const score = cosineSimilarity(input.queryEmbedding, chunk.embedding);
                if (score < (input.minScore ?? 0)) {
                    continue;
                }
                candidates.push({
                    score,
                    chunkText: chunk.chunkText,
                    metadata: {
                        appId: document.appId,
                        type: document.type,
                        filePath: document.filePath,
                        fileName: document.fileName,
                        module: document.module,
                        roleScope: document.roleScope,
                    },
                });
            }
        }
        return candidates
            .sort((a, b) => b.score - a.score)
            .slice(0, input.topK ?? 5);
    }
}
exports.InMemoryRagStore = InMemoryRagStore;
function cosineSimilarity(a, b) {
    if (a.length === 0 || b.length === 0 || a.length !== b.length) {
        return 0;
    }
    let dot = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    for (let i = 0; i < a.length; i += 1) {
        const valueA = a[i] ?? 0;
        const valueB = b[i] ?? 0;
        dot += valueA * valueB;
        magnitudeA += valueA * valueA;
        magnitudeB += valueB * valueB;
    }
    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0;
    }
    return dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}
