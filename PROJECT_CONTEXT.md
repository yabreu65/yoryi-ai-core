# PROJECT_CONTEXT.md

## What is yoryi-ai-core?

`yoryi-ai-core` is a **reusable AI intelligence layer** designed to integrate into multiple SaaS products through adapters.

It provides:

- Context-aware AI assistant for end users
- Role-aware guidance and responses
- Structured knowledge retrieval
- Safe multi-tenant operation
- Reusable integration points

---

## Purpose

The goal is to turn AI assistance into **shared infrastructure**, not product-specific glue code.

Each SaaS product (BuildingOS, JurisManager, etc.) gets its own adapter that:

- translates product-specific context into normalized format
- resolves roles and permissions
- scopes knowledge retrieval
- provides safe action suggestions

The core remains agnostic — it doesn't know about any specific product.

---

## System Layers

### 1. ai-types

Generic interfaces, contracts, and DTOs shared across all packages.

```ts
// Example: shared type in ai-types
export type AssistantRuntimeContext = {
  appId: string;
  tenantId?: string;
  userId: string;
  role: string;
  route: string;
  // ...generic fields only
};
```

### 2. ai-core

Reusable orchestration engine.

Responsibilities:

- Handle chat requests
- Resolve context via adapters
- Retrieve knowledge
- Build responses
- Validate tenant isolation

The core does NOT:

- know specific SaaS roles
- access product databases
- hardcode business logic
- assume universal permissions

### 3. ai-adapters

SaaS-specific implementations.

Each adapter is responsible for:

- Defining roles and permissions for its SaaS
- Mapping routes to modules
- Enriching runtime context
- Scoping knowledge retrieval by product scope
- Providing safe action suggestions

```ts
// Each adapter implements SaasAssistantAdapter
interface SaasAssistantAdapter {
  appId: string;
  getModules(): Promise<AppModuleDefinition[]>;
  getRoles(): Promise<RoleDefinition[]>;
  getContext(input: RuntimeContextInput): Promise<ResolvedAssistantContext>;
  getKnowledgeScopes(): Promise<KnowledgeScope[]>;
  getAvailableActions(context: ResolvedAssistantContext): Promise<ActionDefinition[]>;
  canAnswer(question: string, context: ResolvedAssistantContext): Promise<boolean>;
}
```

### 4. apps/ai-assistant-api

HTTP entry point.

- Exposes `/assistant/chat` endpoint
- Receives user message + runtime context
- Delegates to ChatService
- Returns structured response

### 5. knowledge/

Structured documents organized by SaaS.

```
knowledge/
├── buildingos/
│   ├── modules/
│   ├── faq/
│   ├── flows/
│   ├── roles/
│   └── policies/
├── jurismanager/
│   └── ...
```

Knowledge is **never in the core** — it's external and SaaS-specific.

---

## How Integration Works

### Step 1: Frontend sends context

```json
{
  "appId": "buildingos",
  "tenantId": "t_123",
  "userId": "u_456",
  "role": "TENANT_ADMIN",
  "unitOccupantRole": "OWNER",
  "route": "/tenant/charges"
}
```

### Step 2: Adapter resolves

The adapter for `buildingos` resolves:

- `currentModule`: "charges"
- `permissions`: ["charges.read", "charges.write", "charges.publish", "payments.approve"]

### Step 3: Core retrieves knowledge

Knowledge is retrieved filtering by:

- `appId = buildingos`
- `module = charges`
- `roleScope` from adapter

### Step 4: Response built

Assistant returns contextual answer + suggested actions.

---

## Current State

### Implemented

- Monorepo structure with workspaces
- `ai-types` with generic runtime context interfaces
- `ai-core` with ChatService and KnowledgeService
- `ai-adapters` with BuildingOSAdapter
- Basic HTTP API in `apps/ai-assistant-api`
- Knowledge base for BuildingOS:
  - modules (buildings, units, charges, payments)
  - FAQ documents
  - Flows (charge generation, payment approval)
  - Role documentation
  - Policies (tenant isolation)

### In Progress

- Improving knowledge retrieval quality
- Enhancing contextual responses
- Refining adapter context resolution
- Adding richer knowledge documents

### Not Started

- Semantic search / embeddings (Phase 2)
- Safe action execution (Phase 3)
- Multi-SaaS orchestration (Phase 4)

---

## Key Principles

1. **Core stays SaaS-agnostic** — no product-specific logic in `ai-core`
2. **Roles are defined by adapters** — not globally in core
3. **Knowledge is per-SaaS** — organized in `knowledge/<saas>/` folders
4. **Tenant isolation is mandatory** — never leak data across tenants
5. **Respect the adapter boundary** — keep separation clear

---

## Related Files

- `AGENTS.md` — operating guidelines for AI agents
- `DECISIONS.md` — architectural decisions
- `TASKS.md` — current task list
- `CURRENT_SPRINT.md` — sprint focus
- `README.md` — quick start and philosophy
- `docs/ai-assistant/` — detailed architectural documentation