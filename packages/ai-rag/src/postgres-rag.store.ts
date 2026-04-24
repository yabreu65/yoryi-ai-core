import type { RagStore } from "./types";

export type QueryExecutor = (
  sql: string,
  params?: unknown[]
) => Promise<{ rows: Array<Record<string, unknown>> }>;

/**
 * Lightweight postgres store adapter.
 * It expects an external query executor so we keep package dependencies minimal.
 */
export class PostgresRagStore implements RagStore {
  constructor(private readonly query: QueryExecutor) {}

  async getIndexedDocuments(appId: string) {
    const result = await this.query(
      `
      SELECT id as "documentId", app_id as "appId", file_path as "filePath", checksum
      FROM rag_documents
      WHERE app_id = $1
      `,
      [appId]
    );

    return result.rows.map((row) => ({
      documentId: String(row.documentId),
      appId: String(row.appId),
      filePath: String(row.filePath),
      checksum: String(row.checksum),
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
  }) {
    const result = await this.query(
      `
      INSERT INTO rag_documents (
        id, app_id, type, module, role_scope, file_path, file_name, checksum, metadata, updated_at
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())
      ON CONFLICT (app_id, file_path)
      DO UPDATE SET
        type = EXCLUDED.type,
        module = EXCLUDED.module,
        role_scope = EXCLUDED.role_scope,
        file_name = EXCLUDED.file_name,
        checksum = EXCLUDED.checksum,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING id as "documentId"
      `,
      [
        input.appId,
        input.type,
        input.module ?? null,
        input.roleScope ?? null,
        input.filePath,
        input.fileName,
        input.checksum,
        JSON.stringify(input.metadata ?? {}),
      ]
    );

    const row = result.rows[0];
    return {
      documentId: String(row?.documentId ?? ""),
    };
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
  ) {
    await this.query(`DELETE FROM rag_chunks WHERE document_id = $1`, [documentId]);

    for (const chunk of chunks) {
      await this.query(
        `
        INSERT INTO rag_chunks (
          id, document_id, chunk_index, chunk_text, embedding, token_count, metadata
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4::vector, $5, $6::jsonb
        )
        `,
        [
          documentId,
          chunk.chunkIndex,
          chunk.chunkText,
          `[${chunk.embedding.join(",")}]`,
          chunk.tokenCount,
          JSON.stringify(chunk.metadata),
        ]
      );
    }
  }

  async search(input: {
    appId: string;
    question: string;
    module?: string;
    role?: string;
    topK?: number;
    minScore?: number;
    queryEmbedding: number[];
  }) {
    const topK = input.topK ?? 5;
    const minScore = input.minScore ?? 0.35;

    const result = await this.query(
      `
      SELECT
        (1 - (c.embedding <=> $1::vector)) as score,
        c.chunk_text as "chunkText",
        c.metadata as metadata
      FROM rag_chunks c
      JOIN rag_documents d ON d.id = c.document_id
      WHERE d.app_id = $2
        AND ($3::text IS NULL OR d.module = $3)
        AND ($4::text IS NULL OR d.role_scope IS NULL OR array_length(d.role_scope, 1) IS NULL OR $4 = ANY(d.role_scope))
        AND (1 - (c.embedding <=> $1::vector)) >= $5
      ORDER BY score DESC
      LIMIT $6
      `,
      [
        `[${input.queryEmbedding.join(",")}]`,
        input.appId,
        input.module ?? null,
        input.role ?? null,
        minScore,
        topK,
      ]
    );

    return result.rows.map((row) => ({
      score: Number(row.score ?? 0),
      chunkText: String(row.chunkText ?? ""),
      metadata: (row.metadata ?? {}) as {
        appId: string;
        type: "module" | "faq" | "flow" | "role" | "policy";
        filePath: string;
        fileName: string;
        module?: string;
        roleScope?: string[];
      },
    }));
  }
}
