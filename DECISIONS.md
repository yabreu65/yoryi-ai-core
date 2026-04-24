# DECISIONS.md

## Architectural Decisions

### D-001: Core Remains SaaS-Agnostic

**Decision:** The `ai-core` package must never know about specific SaaS products, roles, permissions, or business logic.

**Rationale:** Reusability depends on keeping the core generic. If core contains BuildingOS logic, it cannot be adapted to JurisManager or other products without coupling.

**Alternative Considered:** Adding SaaS-specific handling in core for "convenience."

**Outcome:** Rejected. Convenience now creates debt later.

---

### D-002: Knowledge Lives Outside the Core

**Decision:** All knowledge documents are stored externally in `knowledge/<saas>/` folders, never in core code.

**Rationale:** Knowledge changes frequently (FAQ updates, new flows, policy changes). Hardcoding it in core creates maintenance burden and breaks the reusable model.

**Alternative Considered:** Templates or constants in core.

**Outcome:** Rejected. External knowledge enables non-technical updates and clear separation.

---

### D-003: Roles Are Defined by Adapters

**Decision:** Each SaaS adapter defines its own roles. The core only works with `role: string` and `permissions?: string[]`.

**Rationale:** Different SaaS products have different role models. BuildingOS may have "TENANT_ADMIN", while JurisManager has "ABOGADO". There's no universal role taxonomy.

**Rule:**
```ts
// ✅ Core works with generic types
context: { role: string, permissions?: string[] }

// ❌ Core does NOT define or validate specific role values
if (context.role === "ADMIN") { ... } // forbidden
```

---

### D-004: Role = String, Not Enum

**Decision:** `role` in runtime context is a string, not an enum or constant.

**Rationale:** Adapters provide role values. The core doesn't need to know what valid roles exist — it just passes them through.

**Implementation:** `role: string` in `AssistantRuntimeContext`.

---

### D-005: No Embeddings Yet

**Decision:** Phase 1 uses structured knowledge retrieval, not semantic embeddings.

**Rationale:** Keep it simple first. Structured retrieval with filtering is sufficient for V1 and validates the architecture.

**Future:** Embeddings may be added in Phase 2.

---

### D-006: Tenant Isolation is Mandatory

**Decision:** Every knowledge retrieval and response must be filtered by `tenantId` when provided.

**Rationale:** Multi-tenant SaaS products require strict data isolation. The assistant must never leak data across tenants, even in error messages.

**Enforcement:**
- All retrieval calls include tenantId in filter
- Responses validated against tenant context
- Logging must not expose cross-tenant data

---

### D-007: Adapter Boundary is Enforced

**Decision:** All SaaS-specific logic stays in adapters. Core imports adapters, not the other way around.

**Rationale:** This preserves the reusable model. Adapters can be swapped, added, or removed without touching core.

**Boundary Rule:**
- `ai-core` imports `SaasAssistantAdapter` interface only
- Concrete adapters (BuildingOSAdapter, etc.) implement the interface
- Core never imports specific adapter implementations

---

### D-008: Permissions Resolved by Adapter

**Decision:** The adapter resolves permissions, not the core.

**Rationale:** Permissions are product-specific. BuildingOS has `charges.write`, JurisManager has `expediente.create`. The core doesn't interpret them.

**Implementation:** Adapter returns `permissions: string[]` in `ResolvedAssistantContext`.

---

### D-009: Responses Built from Knowledge, Not Hardcode

**Decision:** ChatService builds responses from retrieved knowledge documents, not from if/else conditions.

**Rationale:** Hardcoding responses in core couples it to specific products and creates maintenance burden.

**Implementation:** KnowledgeService returns documents → ChatService summarizes → response built from content.

---

### D-010: Context Passed by Frontend

**Decision:** Runtime context is provided by the frontend, not inferred by the core.

**Rationale:** The frontend owns the application state. Core receives context and enriches it via adapter.

**Flow:** Frontend → API → ChatService → Adapter.getContext() → Resolved context → Knowledge retrieval → Response.

---

### D-011: Role as Primary Authorization, UnitOccupantRole as Secondary Context

**Decision:** `role` remains the primary membership authorization layer. `unitOccupantRole` is a secondary optional context dimension for unit-specific scenarios.

**Rationale:** BuildingOS has two orthogonal concepts: membership role (admin, operator, resident) and occupant relationship to a specific unit (owner, resident). Using a single field conflates these, causing ambiguity for context-sensitive responses.

**Implementation:** Add optional `unitOccupantRole?: "OWNER" | "RESIDENT"` to `AssistantRuntimeContext`. The adapter can resolve it from unit association data, but the core treats it as opaque metadata.

**Rule:**
```ts
// Primary authorization — always present
context: { role: "TENANT_ADMIN", permissions: [...] }

// Secondary context — optional, for finer context awareness
context: { role: "RESIDENT", unitOccupantRole: "OWNER" }
```

**Behavior:**
- Core does NOT interpret `unitOccupantRole` — only transports/filters it
- Adapters provide it when relevant (e.g., user viewing their own unit details)
- Knowledge retrieval may use it for ranking, never for authorization

---

### D-012: Ranking Strategy is Versioned

**Decision:** The retrieval ranking strategy is explicitly versioned via `rankingVersion` in `KnowledgeRetrievalTrace`.

**Rationale:** To enable safe iteration on ranking improvements, each document retrieved includes the version of the scoring algorithm used. This allows comparison between iterations, debugging of ranking changes, and future A/B testing without ambiguity about which version produced which results.

**Implementation:**
- `KnowledgeRetrievalTrace.rankingVersion: string` added to all traces
- Current stable version: `"v1"`
- Version is attached to all documents (module, role, policy, faq, flow) via `RANKING_VERSION` constant
- Version is exposed in `knowledgeUsed.sources[].trace` for observability

**Rule:**
```ts
// Trace includes ranking version
{
  rankingVersion: "v1",
  moduleScore: 5,
  keywordScore: 1,
  tagScore: 0.5,
  totalScore: 6.5,
  // ...
}
```

**Future:** Future ranking versions (v2, v3, etc.) can be introduced with explicit configuration, enabling controlled rollouts and version-specific tuning.

---

### D-013: Ranking Weights Live in a Versioned Strategy

**Decision:** Ranking weights are extracted to a reusable strategy object (`RankingStrategy`) instead of being hardcoded in `KnowledgeService`.

**Rationale:** This makes tuning safer and explicit. The service can evolve to new versions (`v2`, `v3`) without mixing scoring constants inside retrieval logic.

**Implementation:**
- `RankingStrategy` and `RankingStrategyV1` added under `packages/ai-core/src/ranking-strategy.ts`
- `KnowledgeService` consumes a strategy (default: `RankingStrategyV1`)
- `KnowledgeRetrievalTrace.rankingVersion` is read from the active strategy

**Rule:**
```ts
const knowledgeService = new KnowledgeService(knowledgePath, RankingStrategyV1);
```

**Outcome:** Ranking behavior remains unchanged for V1, but weights are now centralized and version-governed.

---

### D-014: Strategy ID for Fine-Grained Audit

**Decision:** Each trace includes `strategyId` alongside `rankingVersion` to uniquely identify the strategy configuration used.

**Rationale:** `rankingVersion` alone cannot distinguish between different weight configurations within the same version. `strategyId` provides a unique identifier for auditing when weights change without updating the version string.

**Implementation:**
- `RankingStrategy.strategyId: string` added
- Default V1 strategy uses `"default-v1"` as strategyId
- `KnowledgeRetrievalTrace` exposes both `rankingVersion` and `strategyId`
- Both fields are available in `knowledgeUsed.sources[].trace`

**Rule:**
```ts
// Trace includes both version and strategyId
{
  rankingVersion: "v1",
  strategyId: "default-v1",
  totalScore: 6.5,
  // ...
}
```

**Future:** Custom strategies can use custom `strategyId` values for A/B testing and controlled rollouts.

---

### D-015: Ranking Governance via Strategy Registry

**Decision:** Ranking strategies are governed by a centralized `RankingStrategyRegistry` that manages registration, lookup, and default selection.

**Rationale:** Without a registry, strategies are isolated instances. A registry provides a single source of truth for all strategies, enables lookup by `strategyId`, and enforces governance (no duplicates, valid default).

**Implementation:**
- `RankingStrategyRegistry` class added in `packages/ai-core/src/ranking-strategy-registry.ts`
- `defaultRankingStrategyRegistry` provides built-in strategies (V1: `"default-v1"`)
- `KnowledgeService` defaults to `defaultRankingStrategyRegistry.getDefaultStrategy()`
- Registry validates:
  - default strategy must exist
  - no duplicate `strategyId` allowed

**Rule:**
```ts
const registry = new RankingStrategyRegistry([RankingStrategyV1], "default-v1");
const defaultStrategy = registry.getDefaultStrategy();
const custom = registry.getByStrategyId("my-custom-strategy");
```

**Errors:**
- `"Default strategyId 'X' does not exist in registry"` when default not found
- `"Strategy with strategyId 'X' already registered"` on duplicate

**Outcome:** All ranking strategies now live in a governed registry with validation and lookup capabilities.

---

## Related Files

- `AGENTS.md` — operating guidelines
- `PROJECT_CONTEXT.md` — system overview
- `TASKS.md` — task list
- `CURRENT_SPRINT.md` — sprint focus
- `README.md` — quick start
