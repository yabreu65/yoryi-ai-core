"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HashEmbeddingProvider = void 0;
const node_crypto_1 = require("node:crypto");
class HashEmbeddingProvider {
    dimensions;
    constructor(dimensions = 16) {
        this.dimensions = dimensions;
    }
    async embed(texts) {
        return texts.map((text) => this.encodeText(text));
    }
    encodeText(text) {
        const digest = (0, node_crypto_1.createHash)("sha256").update(text).digest();
        const vector = [];
        for (let i = 0; i < this.dimensions; i += 1) {
            const byte = digest[i % digest.length] ?? 0;
            vector.push((byte - 127.5) / 127.5);
        }
        return this.normalize(vector);
    }
    normalize(vector) {
        const magnitude = Math.sqrt(vector.reduce((acc, value) => acc + value * value, 0));
        if (magnitude === 0) {
            return vector;
        }
        return vector.map((value) => value / magnitude);
    }
}
exports.HashEmbeddingProvider = HashEmbeddingProvider;
