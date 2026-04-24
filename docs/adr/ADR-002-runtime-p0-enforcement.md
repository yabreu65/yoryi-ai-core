# ADR-002: Runtime P0 Enforcement for BuildingOS

- Status: Accepted
- Date: 2026-04-24
- Owners: AI Platform + BuildingOS API

## Context

ADR-001 established governance contracts-first. Product now requires runtime P0 enforcement for operational answers.

## Decision

Adopt runtime P0 enforcement with these rules:

1. No knowledge fallback for P0 operational intents.
2. Single versioned response schema is mandatory for yoryi and fallback paths.
3. BuildingOS bridge uses yoryi as primary when enabled.
4. Local fallback is allowed only when yoryi is disabled or unavailable.
5. `answerSource=knowledge` is rejected for P0 bridge responses.

## Rationale

- Enforces deterministic operational behavior.
- Prevents doctrinal/knowledge drift in admin/operator workflows.
- Preserves safe degradation without breaking service continuity.

## Consequences

Positive:

- Stronger tenant-safe and role-safe behavior in production.
- Clear observability of primary vs fallback path.

Negative:

- More strict behavior may increase clarification responses.
- Requires contract tests and adapter/bridge synchronization.

## Rollout

1. Publish response schema contract and P0 manifest.
2. Enforce tools-based runtime path.
3. Add contract tests and CI gate.

## References

- `docs/ai-assistant/05-governance-brain-guard.md`
- `docs/adr/ADR-001-governance-brain-guard.md`
