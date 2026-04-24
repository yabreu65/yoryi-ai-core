import type { EmbeddingProvider } from "./types";
export declare class HashEmbeddingProvider implements EmbeddingProvider {
    private readonly dimensions;
    constructor(dimensions?: number);
    embed(texts: string[]): Promise<number[][]>;
    private encodeText;
    private normalize;
}
