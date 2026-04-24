# Assistant Rollout Playbook (Phase 9)

This playbook defines safe rollout and rollback controls for production.

## 1) Rollout controls (env)

- `ASSISTANT_GLOBAL_ENABLED=true|false`
  - Global kill switch. `false` disables assistant for all tenants.
- `ASSISTANT_ROLLOUT_MODE=global|allowlist|canary`
  - `global`: all tenants enabled (unless excluded).
  - `allowlist`: only `ASSISTANT_ROLLOUT_TENANTS` enabled.
  - `canary`: deterministic tenant bucketing by percentage.
- `ASSISTANT_ROLLOUT_TENANTS=tenant-a,tenant-b`
  - Used in allowlist mode.
- `ASSISTANT_ROLLOUT_CANARY_PERCENT=0..100`
  - Used in canary mode.
- `ASSISTANT_ROLLOUT_CANARY_SEED=<string>`
  - Optional stable seed for deterministic canary buckets.
- `ASSISTANT_ROLLOUT_EXCLUDED_TENANTS=tenant-x,tenant-y`
  - Tenants explicitly disabled in any mode.

## 2) Traffic protection

- `ASSISTANT_RATE_LIMIT_ENABLED=true|false`
- `ASSISTANT_RATE_LIMIT_MAX_REQUESTS=<number>`
- `ASSISTANT_RATE_LIMIT_WINDOW_MS=<number>`

Limits are applied using authoritative `appId + tenantId + userId`.

## 3) Dependency resilience

- `BUILDINGOS_GATEWAY_CB_FAILURE_THRESHOLD=<number>`
- `BUILDINGOS_GATEWAY_CB_OPEN_MS=<number>`

Both financial and read-only gateways use circuit breaker behavior.

## 4) Rollout status endpoint

- `POST /assistant/rollout/status`
- Requires `AssistantAuthGuard`
- Returns authoritative context + rollout decision.

## 5) Rollback plan

1. Immediate rollback: set `ASSISTANT_GLOBAL_ENABLED=false`
2. Partial rollback:
   - set `ASSISTANT_ROLLOUT_MODE=allowlist`
   - keep only stable tenants in `ASSISTANT_ROLLOUT_TENANTS`
3. Isolate incident tenant:
   - append tenant to `ASSISTANT_ROLLOUT_EXCLUDED_TENANTS`

## 6) Operational checklist

- Canary 5% → 20% → 50% → 100%
- Monitor:
  - response error rate
  - rate-limit rejects
  - gateway circuit-open frequency
  - debt exact-answer rate
- Keep `assistant_query_audit` and analytics exports for incident review.
