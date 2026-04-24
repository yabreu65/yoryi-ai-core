import type { RagStore } from "./types";
export type QueryExecutor = (sql: string, params?: unknown[]) => Promise<{
    rows: Array<Record<string, unknown>>;
}>;
/**
 * Lightweight postgres store adapter.
 * It expects an external query executor so we keep package dependencies minimal.
 */
export declare class PostgresRagStore implements RagStore {
    private readonly query;
    constructor(query: QueryExecutor);
    getIndexedDocuments(appId: string): Promise<{
        documentId: string;
        appId: string;
        filePath: string;
        checksum: string;
    }[]>;
    upsertDocument(input: {
        appId: string;
        type: "module" | "faq" | "flow" | "role" | "policy";
        module?: string;
        roleScope?: string[];
        filePath: string;
        fileName: string;
        checksum: string;
        metadata?: Record<string, unknown>;
    }): Promise<{
        documentId: string;
    }>;
    replaceChunks(documentId: string, chunks: Array<{
        chunkIndex: number;
        chunkText: string;
        embedding: number[];
        tokenCount: number;
        metadata: {
            appId: string;
            type: "module" | "faq" | "flow" | "role" | "policy";
            filePath: string;
            fileName: string;
            module?: string;
            roleScope?: string[];
        };
    }>): Promise<void>;
    search(input: {
        appId: string;
        question: string;
        module?: string;
        role?: string;
        topK?: number;
        minScore?: number;
        queryEmbedding: number[];
    }): Promise<{
        score: number;
        chunkText: string;
        metadata: {
            appId: string;
            type: "module" | "faq" | "flow" | "role" | "policy";
            filePath: string;
            fileName: string;
            module?: string;
            roleScope?: string[];
        };
    }[]>;
}
