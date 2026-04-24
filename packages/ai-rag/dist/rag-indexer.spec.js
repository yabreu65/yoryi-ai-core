"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const vitest_1 = require("vitest");
const hash_embedding_provider_1 = require("./hash-embedding.provider");
const in_memory_rag_store_1 = require("./in-memory-rag.store");
const markdown_knowledge_source_1 = require("./markdown-knowledge-source");
const rag_indexer_1 = require("./rag-indexer");
(0, vitest_1.describe)("RagIndexer", () => {
    (0, vitest_1.it)("chunks markdown content into stable chunk sizes", () => {
        const content = [
            "Primer párrafo de ejemplo para chunking estable.",
            "Segundo párrafo con más texto para validar que se corten chunks correctamente.",
            "Tercer párrafo para completar prueba.",
        ].join("\n\n");
        const chunks = (0, rag_indexer_1.chunkDocument)(content, { maxChunkChars: 80 });
        (0, vitest_1.expect)(chunks.length).toBeGreaterThan(1);
        (0, vitest_1.expect)(chunks[0]?.chunkText.length).toBeLessThanOrEqual(80);
        (0, vitest_1.expect)(chunks[1]?.chunkIndex).toBe(1);
    });
    (0, vitest_1.it)("supports incremental indexing by checksum", async () => {
        const baseDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "ai-rag-indexer-"));
        const appDir = (0, node_path_1.join)(baseDir, "buildingos");
        const modulesDir = (0, node_path_1.join)(appDir, "modules");
        (0, node_fs_1.mkdirSync)(modulesDir, { recursive: true });
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(modulesDir, "charges.md"), `---
module: charges
---
# Charges
Gestiona cargos mensuales`);
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(modulesDir, "payments.md"), `---
module: payments
---
# Payments
Gestiona pagos`);
        const source = new markdown_knowledge_source_1.MarkdownKnowledgeSource(baseDir);
        const store = new in_memory_rag_store_1.InMemoryRagStore();
        const indexer = new rag_indexer_1.RagIndexer(source, store, new hash_embedding_provider_1.HashEmbeddingProvider());
        const firstReport = await indexer.reindexApp("buildingos");
        (0, vitest_1.expect)(firstReport.indexedDocuments).toBe(2);
        (0, vitest_1.expect)(firstReport.skippedDocuments).toBe(0);
        const secondReport = await indexer.reindexApp("buildingos");
        (0, vitest_1.expect)(secondReport.indexedDocuments).toBe(0);
        (0, vitest_1.expect)(secondReport.skippedDocuments).toBe(2);
    });
});
