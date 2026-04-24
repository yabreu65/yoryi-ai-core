import type { RagIndexedDocument, RagSearchChunk, RagSearchInput, RagStore } from "./types";
export declare class InMemoryRagStore implements RagStore {
    private readonly documents;
    private readonly chunksByDocument;
    getIndexedDocuments(appId: string): Promise<RagIndexedDocument[]>;
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
    search(input: RagSearchInput): Promise<RagSearchChunk[]>;
}
