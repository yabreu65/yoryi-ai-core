import { createHash } from "node:crypto";
import type { EmbeddingProvider } from "./types";

export class HashEmbeddingProvider implements EmbeddingProvider {
  constructor(private readonly dimensions = 16) {}

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => this.encodeText(text));
  }

  private encodeText(text: string): number[] {
    const digest = createHash("sha256").update(text).digest();
    const vector: number[] = [];

    for (let i = 0; i < this.dimensions; i += 1) {
      const byte = digest[i % digest.length] ?? 0;
      vector.push((byte - 127.5) / 127.5);
    }

    return this.normalize(vector);
  }

  private normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((acc, value) => acc + value * value, 0));
    if (magnitude === 0) {
      return vector;
    }
    return vector.map((value) => value / magnitude);
  }
}
