import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HashEmbeddingProvider } from "./hash-embedding.provider";
import { InMemoryRagStore } from "./in-memory-rag.store";
import { MarkdownKnowledgeSource } from "./markdown-knowledge-source";
import { chunkDocument, RagIndexer } from "./rag-indexer";

describe("RagIndexer", () => {
  it("chunks markdown content into stable chunk sizes", () => {
    const content = [
      "Primer párrafo de ejemplo para chunking estable.",
      "Segundo párrafo con más texto para validar que se corten chunks correctamente.",
      "Tercer párrafo para completar prueba.",
    ].join("\n\n");

    const chunks = chunkDocument(content, { maxChunkChars: 80 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.chunkText.length).toBeLessThanOrEqual(80);
    expect(chunks[1]?.chunkIndex).toBe(1);
  });

  it("supports incremental indexing by checksum", async () => {
    const baseDir = mkdtempSync(join(tmpdir(), "ai-rag-indexer-"));
    const appDir = join(baseDir, "buildingos");
    const modulesDir = join(appDir, "modules");
    mkdirSync(modulesDir, { recursive: true });

    writeFileSync(
      join(modulesDir, "charges.md"),
      `---
module: charges
---
# Charges
Gestiona cargos mensuales`
    );
    writeFileSync(
      join(modulesDir, "payments.md"),
      `---
module: payments
---
# Payments
Gestiona pagos`
    );

    const source = new MarkdownKnowledgeSource(baseDir);
    const store = new InMemoryRagStore();
    const indexer = new RagIndexer(source, store, new HashEmbeddingProvider());

    const firstReport = await indexer.reindexApp("buildingos");
    expect(firstReport.indexedDocuments).toBe(2);
    expect(firstReport.skippedDocuments).toBe(0);

    const secondReport = await indexer.reindexApp("buildingos");
    expect(secondReport.indexedDocuments).toBe(0);
    expect(secondReport.skippedDocuments).toBe(2);
  });
});
