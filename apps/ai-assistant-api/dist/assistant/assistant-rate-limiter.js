"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryAssistantRateLimiter = void 0;
class InMemoryAssistantRateLimiter {
    options;
    buckets = new Map();
    constructor(options) {
        this.options = options;
    }
    consume(input, now = Date.now()) {
        if (!this.options.enabled) {
            return {
                allowed: true,
                remaining: Number.MAX_SAFE_INTEGER,
                resetAt: now + this.options.windowMs,
            };
        }
        const key = this.buildKey(input);
        const bucket = this.getBucketForWindow(key, now);
        if (bucket.count >= this.options.maxRequests) {
            return {
                allowed: false,
                remaining: 0,
                resetAt: bucket.windowStart + this.options.windowMs,
            };
        }
        bucket.count += 1;
        this.buckets.set(key, bucket);
        return {
            allowed: true,
            remaining: Math.max(0, this.options.maxRequests - bucket.count),
            resetAt: bucket.windowStart + this.options.windowMs,
        };
    }
    getBucketForWindow(key, now) {
        const existing = this.buckets.get(key);
        if (!existing) {
            return { count: 0, windowStart: now };
        }
        if (now - existing.windowStart >= this.options.windowMs) {
            return { count: 0, windowStart: now };
        }
        return existing;
    }
    buildKey(input) {
        return [
            input.operation,
            input.appId,
            input.tenantId ?? "no-tenant",
            input.userId,
        ].join(":");
    }
}
exports.InMemoryAssistantRateLimiter = InMemoryAssistantRateLimiter;
