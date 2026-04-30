import Redis from "ioredis";
import type { DataBackedAnswerResult } from "@yoryi/ai-types";

/**
 * Cache service for caching P0/P1 tool-binding responses.
 * Uses Redis as the backend.
 */
export class AnswerCache {
  private readonly redis: Redis;
  private readonly fallback = new Map<string, { value: DataBackedAnswerResult; expiresAt: number }>();

  constructor(redisUrl: string = process.env.REDIS_URL || "redis://localhost:6379") {
    this.redis = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      connectTimeout: 300,
      retryStrategy: () => null,
    });
    this.redis.on("error", () => {
      // ignore: in-memory fallback handles unavailable redis
    });
  }

  /**
   * Build a cache key based on the context and intent.
   * Includes tenantId, role, intentCode, entities, and any additional params.
   */
  buildCacheKey(params: {
    tenantId: string;
    role: string;
    intentCode: string;
    entities: Record<string, string>;
    additionalParams?: Record<string, unknown>;
  }): string {
    const { tenantId, role, intentCode, entities, additionalParams } = params;
    
    // Sort entity keys to ensure consistent key regardless of order
    const entityKeys = Object.keys(entities).sort();
    const entityString = entityKeys.map((key) => `${key}:${entities[key]}`).join("&");
    
    // Sort additional params keys if present
    const paramString = additionalParams ?
      Object.keys(additionalParams).sort()
        .map((key) => `${key}:${JSON.stringify(additionalParams[key])}`).join("&")
      : "";
    
    return `answer-cache:${tenantId}:${role}:${intentCode}:${entityString}${paramString ? ":" + paramString : ""}`;
  }

  /**
   * Get a value from the cache.
   * @returns The cached value or null if not found or error.
   */
  async get(cacheKey: string): Promise<DataBackedAnswerResult | null> {
    const fallbackEntry = this.fallback.get(cacheKey);
    if (fallbackEntry) {
      if (Date.now() < fallbackEntry.expiresAt) {
        return fallbackEntry.value;
      }
      this.fallback.delete(cacheKey);
    }

    try {
      if (this.redis.status === "wait") {
        await this.redis.connect();
      }
      const cached = await this.redis.get(cacheKey);
      if (cached === null) {
        return null;
      }
      return JSON.parse(cached) as DataBackedAnswerResult;
    } catch (error) {
      // Redis unavailable: use in-memory fallback
      return null;
    }
  }

  /**
   * Set a value in the cache with a TTL.
   * @param cacheKey The key to store the value under
   * @param value The value to cache
   * @param ttlSeconds Time to live in seconds
   */
  async set(cacheKey: string, value: DataBackedAnswerResult, ttlSeconds: number): Promise<void> {
    this.fallback.set(cacheKey, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });

    try {
      if (this.redis.status === "wait") {
        await this.redis.connect();
      }
      await this.redis.setex(cacheKey, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      // Redis unavailable: in-memory fallback already set
    }
  }

  /**
   * Close the Redis connection.
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}
