"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const in_memory_rag_store_1 = require("./in-memory-rag.store");
const rag_retriever_1 = require("./rag-retriever");
class KeywordEmbeddingProvider {
    async embed(texts) {
        return texts.map((text) => {
            const normalized = text.toLowerCase();
            return [
                normalized.includes("cargo") || normalized.includes("charges") ? 1 : 0,
                normalized.includes("pago") || normalized.includes("payments") ? 1 : 0,
                normalized.includes("ticket") ? 1 : 0,
            ];
        });
    }
}
(0, vitest_1.describe)("RagRetriever", () => {
    (0, vitest_1.it)("filters by metadata and returns topK ranked chunks", async () => {
        const store = new in_memory_rag_store_1.InMemoryRagStore();
        const docA = await store.upsertDocument({
            appId: "buildingos",
            type: "faq",
            module: "charges",
            roleScope: ["RESIDENT"],
            filePath: "/knowledge/buildingos/faq/charges-faq.md",
            fileName: "charges-faq.md",
            checksum: "a1",
        });
        const docB = await store.upsertDocument({
            appId: "buildingos",
            type: "faq",
            module: "payments",
            roleScope: ["TENANT_ADMIN"],
            filePath: "/knowledge/buildingos/faq/payments-faq.md",
            fileName: "payments-faq.md",
            checksum: "b1",
        });
        await store.replaceChunks(docA.documentId, [
            {
                chunkIndex: 0,
                chunkText: "Para ver cargos pendientes ingresá a finanzas.",
                embedding: [1, 0, 0],
                tokenCount: 8,
                metadata: {
                    appId: "buildingos",
                    type: "faq",
                    filePath: "/knowledge/buildingos/faq/charges-faq.md",
                    fileName: "charges-faq.md",
                    module: "charges",
                    roleScope: ["RESIDENT"],
                },
            },
        ]);
        await store.replaceChunks(docB.documentId, [
            {
                chunkIndex: 0,
                chunkText: "Para aprobar pagos usá el panel de administración.",
                embedding: [0, 1, 0],
                tokenCount: 8,
                metadata: {
                    appId: "buildingos",
                    type: "faq",
                    filePath: "/knowledge/buildingos/faq/payments-faq.md",
                    fileName: "payments-faq.md",
                    module: "payments",
                    roleScope: ["TENANT_ADMIN"],
                },
            },
        ]);
        const retriever = new rag_retriever_1.RagRetriever(store, new KeywordEmbeddingProvider(), {
            topK: 5,
            minScore: 0.2,
        });
        const results = await retriever.retrieve({
            appId: "buildingos",
            question: "¿Cómo reviso cargos?",
            module: "charges",
            role: "RESIDENT",
        });
        (0, vitest_1.expect)(results).toHaveLength(1);
        (0, vitest_1.expect)(results[0]?.fileName).toBe("charges-faq.md");
        (0, vitest_1.expect)(results[0]?.sourceType).toBe("faq");
        (0, vitest_1.expect)(results[0]?.score).toBeGreaterThan(0.9);
    });
});
