import { describe, expect, it } from "vitest";
import type {
  AssistantTurnCompletedMetadata,
  AssistantTurnDebugMetadata,
} from "../contracts/assistant-turn-metadata";

describe("assistant turn metadata contract", () => {
  it("keeps resolvedPath out of the stable metadata contract until ADR", () => {
    const metadata: AssistantTurnCompletedMetadata = {
      traceId: "trace-1",
      timestamp: "2026-04-30T00:00:00.000Z",
      tenantId: "tenant-1",
      role: "TENANT_ADMIN",
      resolvedLevel: "P0",
      fallbackPath: "cache_miss",
      gatewayOutcome: "cache_miss",
      latencyMsTotal: 1,
      latencyMsRouting: 1,
      p0EnforcementEnabled: true,
      p3Enabled: false,
      familyChosen: "TOTAL",
      missingEntities: [],
      defaultsApplied: ["period"],
    };

    expect(metadata).not.toHaveProperty("resolvedPath");
    expect(metadata).not.toHaveProperty("matchedUtterance");
    expect(metadata).not.toHaveProperty("topCandidates");
  });

  it("keeps matcher internals in the debug-only type", () => {
    const debug: AssistantTurnDebugMetadata = {
      matchedUtterance: "deuda total del edificio",
      topCandidates: [
        { intentCode: "GET_BUILDING_DEBT_TOTAL", level: "P0", confidence: 0.97, family: "TOTAL" },
      ],
    };

    expect(debug.matchedUtterance).toBe("deuda total del edificio");
    expect(debug.topCandidates?.[0]?.family).toBe("TOTAL");
  });
});
