import { describe, expect, it } from "vitest";
import { InMemoryAssistantRateLimiter } from "./assistant-rate-limiter";

describe("InMemoryAssistantRateLimiter", () => {
  it("blocks requests when max requests are reached within the window", () => {
    const limiter = new InMemoryAssistantRateLimiter({
      enabled: true,
      maxRequests: 2,
      windowMs: 1000,
    });

    const first = limiter.consume(
      {
        appId: "buildingos",
        tenantId: "tenant-1",
        userId: "user-1",
        operation: "chat",
      },
      100
    );
    const second = limiter.consume(
      {
        appId: "buildingos",
        tenantId: "tenant-1",
        userId: "user-1",
        operation: "chat",
      },
      200
    );
    const third = limiter.consume(
      {
        appId: "buildingos",
        tenantId: "tenant-1",
        userId: "user-1",
        operation: "chat",
      },
      300
    );

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
  });

  it("resets quota after the rate window elapses", () => {
    const limiter = new InMemoryAssistantRateLimiter({
      enabled: true,
      maxRequests: 1,
      windowMs: 1000,
    });

    limiter.consume(
      {
        appId: "buildingos",
        tenantId: "tenant-1",
        userId: "user-1",
        operation: "chat",
      },
      100
    );
    const blocked = limiter.consume(
      {
        appId: "buildingos",
        tenantId: "tenant-1",
        userId: "user-1",
        operation: "chat",
      },
      500
    );
    const afterWindow = limiter.consume(
      {
        appId: "buildingos",
        tenantId: "tenant-1",
        userId: "user-1",
        operation: "chat",
      },
      1101
    );

    expect(blocked.allowed).toBe(false);
    expect(afterWindow.allowed).toBe(true);
  });
});
