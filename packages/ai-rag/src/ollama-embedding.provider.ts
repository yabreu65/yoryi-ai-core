import type { EmbeddingProvider } from "./types";

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  constructor(
    private readonly options: {
      baseUrl: string;
      model: string;
      timeoutMs?: number;
    }
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    const timeoutMs = this.options.timeoutMs ?? 1500;

    for (const text of texts) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(`${this.options.baseUrl}/api/embeddings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.options.model,
            prompt: text,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Ollama embeddings failed with status ${response.status}`);
        }

        const payload = (await response.json()) as { embedding?: number[] };
        if (!Array.isArray(payload.embedding)) {
          throw new Error("Ollama embeddings response missing embedding array");
        }

        embeddings.push(payload.embedding);
      } finally {
        clearTimeout(timeout);
      }
    }

    return embeddings;
  }
}
