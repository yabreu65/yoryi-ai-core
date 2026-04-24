import { randomUUID } from "node:crypto";
import type { RagIndexedDocument, RagSearchChunk, RagSearchInput, RagStore } from "./types";

type StoredDocument = RagIndexedDocument & {
  type: "module" | "faq" | "flow" | "role" | "policy";
  module?: string;
  roleScope?: string[];
  fileName: string;
  metadata?: Record<string, unknown>;
};

type StoredChunk = {
  documentId: string;
  chunkIndex: number;
  chunkText: string;
  embedding: number[];
  tokenCount: number;
};

export class InMemoryRagStore implements RagStore {
  private readonly documents = new Map<string, StoredDocument>();
  private readonly chunksByDocument = new Map<string, StoredChunk[]>();

  async getIndexedDocuments(appId: string): Promise<RagIndexedDocument[]> {
    return [...this.documents.values()]
      .filter((document) => document.appId === appId)
      .map((document) => ({
        documentId: document.documentId,
        appId: document.appId,
        filePath: document.filePath,
        checksum: document.checksum,
      }));
  }

  async upsertDocument(input: {
    appId: string;
    type: "module" | "faq" | "flow" | "role" | "policy";
    module?: string;
    roleScope?: string[];
    filePath: string;
    fileName: string;
    checksum: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ documentId: string }> {
    const existing = [...this.documents.values()].find(
      (document) =>
        document.appId === input.appId && document.filePath === input.filePath
    );

    const documentId = existing?.documentId ?? randomUUID();

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

  async replaceChunks(
    documentId: string,
    chunks: Array<{
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
    }>
  ): Promise<void> {
    this.chunksByDocument.set(
      documentId,
      chunks.map((chunk) => ({
        documentId,
        chunkIndex: chunk.chunkIndex,
        chunkText: chunk.chunkText,
        embedding: chunk.embedding,
        tokenCount: chunk.tokenCount,
      }))
    );
  }

  async search(input: RagSearchInput): Promise<RagSearchChunk[]> {
    const candidates: RagSearchChunk[] = [];

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

function cosineSimilarity(a: number[], b: number[]): number {
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
