import { describe, expect, it } from "vitest";
import {
  GOVERNANCE_CONTRACT_VERSION,
  isSupportedGovernanceContractVersion,
  validateBrainDecreeEnvelope,
  type BrainDecreeEnvelope,
} from "../../../../packages/ai-types/src/governance-contract";

function buildValidDecree(
  overrides: Partial<BrainDecreeEnvelope> = {}
): BrainDecreeEnvelope {
  const base: BrainDecreeEnvelope = {
    contractVersion: GOVERNANCE_CONTRACT_VERSION,
    decreeId: "dec-001",
    issuedAt: "2026-04-24T12:00:00.000Z",
    intentCode: "GET_OVERDUE_UNITS",
    actor: {
      appId: "buildingos",
      tenantId: "tenant-a",
      userId: "user-a",
      role: "TENANT_ADMIN",
    },
    target: {
      tenantId: "tenant-a",
    },
    policy: {
      strictOperational: true,
      allowFallback: false,
    },
  };

  return {
    ...base,
    ...overrides,
    actor: {
      ...base.actor,
      ...(overrides.actor ?? {}),
    },
    target: {
      ...base.target,
      ...(overrides.target ?? {}),
    },
    policy: {
      ...base.policy,
      ...(overrides.policy ?? {}),
    },
  };
}

describe("governance contract", () => {
  it("accepts supported governance version", () => {
    expect(
      isSupportedGovernanceContractVersion(GOVERNANCE_CONTRACT_VERSION)
    ).toBe(true);
    expect(isSupportedGovernanceContractVersion("2025-01-legacy-v0")).toBe(
      false
    );
  });

  it("accepts valid decree envelope", () => {
    const result = validateBrainDecreeEnvelope(buildValidDecree());
    expect(result.ok).toBe(true);
  });

  it("rejects unsupported contract version", () => {
    const result = validateBrainDecreeEnvelope(
      buildValidDecree({ contractVersion: "invalid-v0" })
    );
    expect(result).toEqual({
      ok: false,
      code: "REJECT_UNSUPPORTED_CONTRACT",
      message: "Unsupported governance contract version.",
    });
  });

  it("rejects missing actor role", () => {
    const result = validateBrainDecreeEnvelope(
      buildValidDecree({ actor: { role: "   " } as BrainDecreeEnvelope["actor"] })
    );
    expect(result).toEqual({
      ok: false,
      code: "REJECT_MISSING_ROLE",
      message: "Actor role is required.",
    });
  });

  it("rejects missing tenant context", () => {
    const result = validateBrainDecreeEnvelope(
      buildValidDecree({
        actor: { tenantId: "" } as BrainDecreeEnvelope["actor"],
      })
    );

    expect(result).toEqual({
      ok: false,
      code: "REJECT_MISSING_TENANT",
      message: "Tenant context is required for governance checks.",
    });
  });

  it("rejects cross-tenant decision", () => {
    const result = validateBrainDecreeEnvelope(
      buildValidDecree({
        actor: { tenantId: "tenant-a" } as BrainDecreeEnvelope["actor"],
        target: { tenantId: "tenant-b" },
      })
    );

    expect(result).toEqual({
      ok: false,
      code: "REJECT_CROSS_TENANT",
      message: "Cross-tenant governance decisions are not allowed.",
    });
  });
});
