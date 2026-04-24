import { describe, it, expect } from "vitest";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("returns healthy when auth is ready", () => {
    const controller = new HealthController({
      isReady: () => true,
      getPublicStatus: () => ({
        strictMode: true,
        verificationMode: "hs256",
        issuerConfigured: true,
        audienceConfigured: true,
        jwksConfigured: false,
        strictRolloutPercent: 100,
      }),
    } as any);

    const result = controller.check();

    expect(result.status).toBe("healthy");
    expect(result.checks.adapter.status).toBe("ok");
    expect(result.checks.database.status).toBe("ok");
    expect(result.timestamp).toBeDefined();
  });

  it("returns unhealthy when auth is not ready", () => {
    const controller = new HealthController({
      isReady: () => false,
      getPublicStatus: () => ({}),
    } as any);

    const result = controller.check();

    expect(result.status).toBe("unhealthy");
    expect(result.checks.adapter.status).toBe("error");
  });
});