import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AnswerCache } from "./answer-cache";
import type { DataBackedAnswerResult } from "@yoryi/ai-types";

// Mock ioredis
vi.mock('ioredis', () => {
  return {
    default: class {
      private data: Map<string, string> = new Map();
      status = "wait";
      constructor(private url: string) {}
      on() {
        return this;
      }
      async connect(): Promise<void> {
        this.status = "ready";
      }
      async get(key: string): Promise<string | null> {
        return this.data.get(key) ?? null;
      }
      async setex(key: string, ttl: number, value: string): Promise<string> {
        this.data.set(key, value);
        // Simulate expiration (in real test we'd use mock timers)
        setTimeout(() => this.data.delete(key), ttl * 1000);
        return 'OK';
      }
      async quit(): Promise<'OK'> {
        return 'OK';
      }
    }
  };
});

describe("AnswerCache", () => {
  let cache: AnswerCache;

  beforeEach(() => {
    cache = new AnswerCache('redis://localhost:6379');
  });

  afterEach(() => {
    cache.close();
  });

  describe("buildCacheKey", () => {
    it("should build a consistent cache key", () => {
      const key1 = cache.buildCacheKey({
        tenantId: "tenant-1",
        role: "TENANT_ADMIN",
        intentCode: "get_unit_balance",
        entities: { unitId: "unit-1", buildingId: "building-1" },
      });

      const key2 = cache.buildCacheKey({
        tenantId: "tenant-1",
        role: "TENANT_ADMIN",
        intentCode: "get_unit_balance",
        entities: { buildingId: "building-1", unitId: "unit-1" }, // Different order
      });

      expect(key1).toBe(key2);
      expect(key1).toContain("tenant-1");
      expect(key1).toContain("TENANT_ADMIN");
      expect(key1).toContain("get_unit_balance");
      expect(key1).toContain("unitId:unit-1");
      expect(key1).toContain("buildingId:building-1");
    });

    it("should include additional params in cache key", () => {
      const key1 = cache.buildCacheKey({
        tenantId: "tenant-1",
        role: "TENANT_ADMIN",
        intentCode: "get_unit_balance",
        entities: { unitId: "unit-1" },
        additionalParams: { period: "2024-01" },
      });

      const key2 = cache.buildCacheKey({
        tenantId: "tenant-1",
        role: "TENANT_ADMIN",
        intentCode: "get_unit_balance",
        entities: { unitId: "unit-1" },
        additionalParams: { period: "2024-02" },
      });

      expect(key1).not.toBe(key2);
      expect(key1).toContain('period:"2024-01"');
      expect(key2).toContain('period:"2024-02"');
    });
  });

  describe("get/set", () => {
    it("should return null for non-existent key", async () => {
      const result = await cache.get("non-existent-key");
      expect(result).toBeNull();
    });

    it("should store and retrieve a value", async () => {
      const cacheKey = "test-key";
      const value: DataBackedAnswerResult = {
        answer: "test answer",
        actions: [],
        metadata: { test: "value" }
      };

      await cache.set(cacheKey, value, 60);
      const result = await cache.get(cacheKey);

      expect(result).not.toBeNull();
      expect(result?.answer).toBe("test answer");
      expect(result?.metadata?.test).toBe("value");
    });

    it("should return null for expired key", async () => {
      const cacheKey = "test-key-expiry";
      const value: DataBackedAnswerResult = {
        answer: "test answer",
        actions: [],
        metadata: {}
      };

      // Set with 1 second TTL
      await cache.set(cacheKey, value, 1);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const result = await cache.get(cacheKey);
      expect(result).toBeNull();
    });
  });
});
