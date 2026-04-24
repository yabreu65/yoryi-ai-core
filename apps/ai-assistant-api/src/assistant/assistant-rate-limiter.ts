type AssistantRateLimiterOptions = {
  enabled: boolean;
  maxRequests: number;
  windowMs: number;
};

type AssistantRateLimitInput = {
  appId: string;
  tenantId?: string;
  userId: string;
  operation: "chat" | "action";
};

type RateBucket = {
  count: number;
  windowStart: number;
};

export type AssistantRateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export class InMemoryAssistantRateLimiter {
  private readonly buckets = new Map<string, RateBucket>();

  constructor(private readonly options: AssistantRateLimiterOptions) {}

  consume(
    input: AssistantRateLimitInput,
    now = Date.now()
  ): AssistantRateLimitResult {
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

  private getBucketForWindow(key: string, now: number): RateBucket {
    const existing = this.buckets.get(key);
    if (!existing) {
      return { count: 0, windowStart: now };
    }

    if (now - existing.windowStart >= this.options.windowMs) {
      return { count: 0, windowStart: now };
    }

    return existing;
  }

  private buildKey(input: AssistantRateLimitInput): string {
    return [
      input.operation,
      input.appId,
      input.tenantId ?? "no-tenant",
      input.userId,
    ].join(":");
  }
}
