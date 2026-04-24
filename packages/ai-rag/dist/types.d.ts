import type { SemanticRetrieveInput, SemanticRetrievalResult } from "@yoryi/ai-types";
export type RagDocumentType = "module" | "faq" | "flow" | "role" | "policy";
export type RagKnowledgeDocument = {
    appId: string;
    type: RagDocumentType;
    filePath: string;
    fileName: string;
    content: string;
    module?: string;
    roleScope?: string[];
    metadata?: Record<string, unknown>;
    checksum: string;
};
export type RagChunk = {
    documentId: string;
    chunkIndex: number;
    chunkText: string;
    embedding: number[];
    tokenCount: number;
    metadata: {
        appId: string;
        type: RagDocumentType;
        filePath: string;
        fileName: string;
        module?: string;
        roleScope?: string[];
    };
};
export type RagIndexedDocument = {
    documentId: string;
    appId: string;
    filePath: string;
    checksum: string;
};
export type RagSearchChunk = {
    score: number;
    chunkText: string;
    metadata: RagChunk["metadata"];
};
export type RagSearchInput = SemanticRetrieveInput & {
    queryEmbedding: number[];
};
export interface EmbeddingProvider {
    embed(texts: string[]): Promise<number[][]>;
}
export interface RagStore {
    getIndexedDocuments(appId: string): Promise<RagIndexedDocument[]>;
    upsertDocument(input: {
        appId: string;
        type: RagDocumentType;
        module?: string;
        roleScope?: string[];
        filePath: string;
        fileName: string;
        checksum: string;
        metadata?: Record<string, unknown>;
    }): Promise<{
        documentId: string;
    }>;
    replaceChunks(documentId: string, chunks: Omit<RagChunk, "documentId">[]): Promise<void>;
    search(input: RagSearchInput): Promise<RagSearchChunk[]>;
}
export type RagKnowledgeSource = {
    listDocuments: (appId: string) => Promise<RagKnowledgeDocument[]>;
};
export type RagIndexReport = {
    appId: string;
    totalDocuments: number;
    indexedDocuments: number;
    skippedDocuments: number;
    totalChunks: number;
};
export interface RagRetrieverLike {
    retrieve(input: SemanticRetrieveInput): Promise<SemanticRetrievalResult[]>;
}
