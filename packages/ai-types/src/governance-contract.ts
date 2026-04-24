export const GOVERNANCE_CONTRACT_VERSION = "2026-04-governance-v1";

export type GovernanceGuardRejectCode =
  | "REJECT_UNSUPPORTED_CONTRACT"
  | "REJECT_MISSING_TENANT"
  | "REJECT_MISSING_ROLE"
  | "REJECT_CROSS_TENANT";

export type GovernanceGuardVerdictCode = "ALLOW" | GovernanceGuardRejectCode;

export type BrainDecreeEnvelope = {
  contractVersion: string;
  decreeId: string;
  issuedAt: string;
  intentCode: string;
  actor: {
    appId: string;
    tenantId: string;
    userId: string;
    role: string;
  };
  target: {
    tenantId: string;
  };
  policy: {
    strictOperational: boolean;
    allowFallback: boolean;
  };
  metadata?: Record<string, unknown>;
};

export type GovernanceGuardVerdict = {
  contractVersion: string;
  decreeId: string;
  evaluatedAt: string;
  verdict: "allow" | "reject";
  code: GovernanceGuardVerdictCode;
  reason: string;
};

export type GovernanceValidationResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      code: GovernanceGuardRejectCode;
      message: string;
    };

export function isSupportedGovernanceContractVersion(version: unknown): boolean {
  return version === GOVERNANCE_CONTRACT_VERSION;
}

export function validateBrainDecreeEnvelope(
  input: unknown
): GovernanceValidationResult<BrainDecreeEnvelope> {
  if (!isRecord(input)) {
    return {
      ok: false,
      code: "REJECT_UNSUPPORTED_CONTRACT",
      message: "Invalid decree envelope payload.",
    };
  }

  if (!isSupportedGovernanceContractVersion(input.contractVersion)) {
    return {
      ok: false,
      code: "REJECT_UNSUPPORTED_CONTRACT",
      message: "Unsupported governance contract version.",
    };
  }

  const role = readNonEmptyString(input, "actor", "role");
  if (!role) {
    return {
      ok: false,
      code: "REJECT_MISSING_ROLE",
      message: "Actor role is required.",
    };
  }

  const actorTenantId = readNonEmptyString(input, "actor", "tenantId");
  const targetTenantId = readNonEmptyString(input, "target", "tenantId");
  if (!actorTenantId || !targetTenantId) {
    return {
      ok: false,
      code: "REJECT_MISSING_TENANT",
      message: "Tenant context is required for governance checks.",
    };
  }

  if (actorTenantId !== targetTenantId) {
    return {
      ok: false,
      code: "REJECT_CROSS_TENANT",
      message: "Cross-tenant governance decisions are not allowed.",
    };
  }

  return {
    ok: true,
    value: input as BrainDecreeEnvelope,
  };
}

function readNonEmptyString(
  value: Record<string, unknown>,
  parent: string,
  key: string
): string | null {
  const parentValue = value[parent];
  if (!isRecord(parentValue)) {
    return null;
  }

  const field = parentValue[key];
  if (typeof field !== "string") {
    return null;
  }

  const trimmed = field.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
