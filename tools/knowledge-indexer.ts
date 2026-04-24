import { join } from "node:path";
import {
  createDefaultEmbeddingProvider,
  InMemoryRagStore,
  MarkdownKnowledgeSource,
  POSTGRES_RAG_SCHEMA_SQL,
  PostgresRagStore,
  type QueryExecutor,
  type RagStore,
  RagIndexer,
} from "../packages/ai-rag/src";

async function main() {
  const knowledgeBasePath = join(process.cwd(), "knowledge");
  const embeddings = createDefaultEmbeddingProvider({
    model: process.env.RAG_EMBEDDING_MODEL ?? "nomic-embed-text",
  });
  const store = await createRagStore();
  const source = new MarkdownKnowledgeSource(knowledgeBasePath);
  const indexer = new RagIndexer(source, store, embeddings);

  const apps = ["buildingos", "jurismanager"];
  const report = await indexer.reindexApps(apps);

  console.log(
    JSON.stringify(
      {
        indexedAt: new Date().toISOString(),
        report,
      },
      null,
      2
    )
  );
}

async function createRagStore(): Promise<RagStore> {
  const dbUrl = process.env.RAG_DB_URL?.trim();
  if (!dbUrl) {
    return new InMemoryRagStore();
  }

  const queryExecutor = createPostgresQueryExecutor(dbUrl);
  await queryExecutor(POSTGRES_RAG_SCHEMA_SQL);
  return new PostgresRagStore(queryExecutor);
}

function createPostgresQueryExecutor(dbUrl: string): QueryExecutor {
  let poolPromise:
    | Promise<{
        query: (
          sql: string,
          params?: unknown[]
        ) => Promise<{ rows: Array<Record<string, unknown>> }>;
      }>
    | null = null;

  const getPool = async () => {
    if (!poolPromise) {
      poolPromise = (async () => {
        const pg = await import("pg");
        return new pg.Pool({
          connectionString: dbUrl,
        });
      })();
    }
    return poolPromise;
  };

  return async (sql: string, params?: unknown[]) => {
    const pool = await getPool();
    return pool.query(sql, params ?? []);
  };
}

main().catch((error) => {
  console.error("knowledge-indexer failed:", error);
  process.exitCode = 1;
});
