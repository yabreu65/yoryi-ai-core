# AI Assistant Governance — Brain/Guard Decree V1

## Purpose

Define a contracts-first governance model for operational assistant decisions without enabling new business logic yet.

This document introduces a safe decision envelope (`BrainDecreeEnvelope`) and a guard verdict contract (`GovernanceGuardVerdict`) to enforce tenant isolation and minimum context requirements before any execution path is considered.

## Scope for this PR

- Documentation for governance rules and invariants
- Versioned contract in `@yoryi/ai-types`
- Contract tests and CI gate

Out of scope:

- Endpoint changes
- Adapter behavior changes
- Any destructive or state-mutating action path

## Brain/Guard model

- Brain: prepares a decree proposal with intent, actor context, target tenant, and strictness policy.
- Guard: validates the decree contract and returns an allow/reject verdict with explicit code.

The guard is the enforcement boundary. If validation fails, the decision is rejected and no runtime action should continue.

## Non-negotiable invariants

1. `contractVersion` must be supported.
2. `actor.role` must be present and non-empty.
3. `actor.tenantId` and `target.tenantId` must exist.
4. `actor.tenantId` must equal `target.tenantId`.

If any invariant fails, guard must reject with one of:

- `REJECT_UNSUPPORTED_CONTRACT`
- `REJECT_MISSING_ROLE`
- `REJECT_MISSING_TENANT`
- `REJECT_CROSS_TENANT`

## Contract versioning

- Current version: `2026-04-governance-v1`
- New versions must be additive/backward-compatible when possible.
- Breaking changes require a new version string and migration plan.

## Operational policy defaults

- `strictOperational = true`
- `allowFallback = false`

These defaults are conservative by design and align with tenant-safety-first operation.

## Traceability

Each verdict must include:

- `decreeId`
- `evaluatedAt`
- `verdict`
- `code`
- `reason`

This enables auditability for denied and allowed decisions.
