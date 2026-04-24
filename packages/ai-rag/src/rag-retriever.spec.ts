import { describe, expect, it } from "vitest";
import { InMemoryRagStore } from "./in-memory-rag.store";
import { RagRetriever } from "./rag-retriever";
import type { EmbeddingProvider } from "./types";

class KeywordEmbeddingProvider implements EmbeddingProvider {
  async embed(texts: string[]): Promise<number[][]> {
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

describe("RagRetriever", () => {
  it("filters by metadata and returns topK ranked chunks", async () => {
    const store = new InMemoryRagStore();
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

    const retriever = new RagRetriever(store, new KeywordEmbeddingProvider(), {
      topK: 5,
      minScore: 0.2,
    });

    const results = await retriever.retrieve({
      appId: "buildingos",
      question: "¿Cómo reviso cargos?",
      module: "charges",
      role: "RESIDENT",
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.fileName).toBe("charges-faq.md");
    expect(results[0]?.sourceType).toBe("faq");
    expect(results[0]?.score).toBeGreaterThan(0.9);
  });
});
