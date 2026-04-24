"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaEmbeddingProvider = void 0;
class OllamaEmbeddingProvider {
    options;
    constructor(options) {
        this.options = options;
    }
    async embed(texts) {
        const embeddings = [];
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
                const payload = (await response.json());
                if (!Array.isArray(payload.embedding)) {
                    throw new Error("Ollama embeddings response missing embedding array");
                }
                embeddings.push(payload.embedding);
            }
            finally {
                clearTimeout(timeout);
            }
        }
        return embeddings;
    }
}
exports.OllamaEmbeddingProvider = OllamaEmbeddingProvider;
