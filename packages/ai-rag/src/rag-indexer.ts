import type { EmbeddingProvider, RagIndexReport, RagKnowledgeSource, RagStore } from "./types";

export class RagIndexer {
  constructor(
    private readonly source: RagKnowledgeSource,
    private readonly store: RagStore,
    private readonly embeddings: EmbeddingProvider
  ) {}

  async reindexApps(appIds: string[]): Promise<RagIndexReport[]> {
    const reports: RagIndexReport[] = [];

    for (const appId of appIds) {
      const report = await this.reindexApp(appId);
      reports.push(report);
    }

    return reports;
  }

  async reindexApp(appId: string): Promise<RagIndexReport> {
    const sourceDocuments = await this.source.listDocuments(appId);
    const indexedDocuments = await this.store.getIndexedDocuments(appId);
    const checksumMap = new Map(
      indexedDocuments.map((item) => [item.filePath, item.checksum])
    );

    let indexedCount = 0;
    let skippedCount = 0;
    let totalChunks = 0;

    for (const document of sourceDocuments) {
      const previousChecksum = checksumMap.get(document.filePath);
      if (previousChecksum && previousChecksum === document.checksum) {
        skippedCount += 1;
        continue;
      }

      const upserted = await this.store.upsertDocument({
        appId: document.appId,
        type: document.type,
        module: document.module,
        roleScope: document.roleScope,
        filePath: document.filePath,
        fileName: document.fileName,
        checksum: document.checksum,
        metadata: document.metadata,
      });

      const chunks = chunkDocument(document.content);
      const vectors = await this.embeddings.embed(chunks.map((item) => item.chunkText));

      await this.store.replaceChunks(
        upserted.documentId,
        chunks.map((chunk, index) => ({
          chunkIndex: chunk.chunkIndex,
          chunkText: chunk.chunkText,
          tokenCount: chunk.tokenCount,
          embedding: vectors[index] ?? [],
          metadata: {
            appId: document.appId,
            type: document.type,
            filePath: document.filePath,
            fileName: document.fileName,
            module: document.module,
            roleScope: document.roleScope,
          },
        }))
      );

      indexedCount += 1;
      totalChunks += chunks.length;
    }

    return {
      appId,
      totalDocuments: sourceDocuments.length,
      indexedDocuments: indexedCount,
      skippedDocuments: skippedCount,
      totalChunks,
    };
  }
}

export function chunkDocument(
  content: string,
  options?: { maxChunkChars?: number }
): Array<{ chunkIndex: number; chunkText: string; tokenCount: number }> {
  const maxChunkChars = options?.maxChunkChars ?? 500;
  const clean = content.replace(/\r\n/g, "\n").trim();
  if (clean.length === 0) {
    return [];
  }

  const paragraphs = clean
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter((paragraph) => paragraph.length > 0);

  const chunks: Array<{ chunkIndex: number; chunkText: string; tokenCount: number }> = [];
  let current = "";
  let index = 0;

  const flush = () => {
    if (current.trim().length === 0) {
      return;
    }
    const chunkText = current.trim();
    chunks.push({
      chunkIndex: index,
      chunkText,
      tokenCount: estimateTokens(chunkText),
    });
    index += 1;
    current = "";
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChunkChars) {
      flush();
      let start = 0;
      while (start < paragraph.length) {
        const slice = paragraph.slice(start, start + maxChunkChars);
        chunks.push({
          chunkIndex: index,
          chunkText: slice,
          tokenCount: estimateTokens(slice),
        });
        index += 1;
        start += maxChunkChars;
      }
      continue;
    }

    const candidate = current.length === 0 ? paragraph : `${current} ${paragraph}`;
    if (candidate.length > maxChunkChars) {
      flush();
      current = paragraph;
    } else {
      current = candidate;
    }
  }

  flush();
  return chunks;
}

function estimateTokens(value: string): number {
  return value.split(/\s+/).filter((token) => token.length > 0).length;
}
