# AGENTS.md — IA Agent Operating Guidelines

> This file defines how AI agents must work within `yoryi-ai-core`.
> It is the source of truth for architectural decisions and constraints.

---

## 🎯 Mission

`yoryi-ai-core` is a **reusable AI intelligence layer** for multi-tenant SaaS products.

It must:

- remain SaaS-agnostic at the core level
- use adapters to connect to specific products (BuildingOS, JurisManager, etc.)
- rely on structured knowledge per SaaS
- enforce tenant isolation and authorization
- evolve toward advanced RAG without breaking architecture

---

## 🏗️ Architecture Principles

### 1. Core Agnosticism

The core (`packages/ai-core`) must NEVER know about:

- specific SaaS business logic
- product-specific roles or permissions
- domain entities beyond generic types

The core works with:

```ts
role: string;
permissions?: string[];
```

### 2. Adapter Boundary

Every SaaS integration lives in its own adapter:

```
packages/ai-adapters/src/buildingos/
packages/ai-adapters/src/jurismanager/
```

The adapter is responsible for:

- resolving roles and permissions for that specific SaaS
- mapping routes to modules
- scoping knowledge retrieval
- providing SaaS-specific context

### 3. Knowledge Externalization

Knowledge is **never hardcoded in the core**.

Structure:

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

Each SaaS owns its knowledge folder. The core only knows how to *read* it.

### 4. Tenant Isolation (Non-Negotiable)

- Every request must include `tenantId` (when applicable)
- The core must never expose data from another tenant
- Knowledge retrieval must be filtered by tenant context
- No cross-tenant queries under any circumstance

---

## 🤖 How AI Agents Should Work in This Repo

### Allowed

- Implement generic interfaces in `ai-types`
- extend adapters for new SaaS products
- improve knowledge retrieval algorithms
- add observability (logging, metrics)
- create reusable UI components
- write unit tests for core logic
- improve documentation

### Forbidden

- Hardcode SaaS-specific roles in the core (`ai-core`)
- Implement business logic in `ai-core` that belongs in an adapter
- Assume a role taxonomy exists globally
- Move domain knowledge into the core
- Create global role enums or constants
- Bypass tenant isolation for "convenience"
- Answer questions without sufficient context

### Role Handling Rule

The core treats `role` as an opaque string:

```ts
// ✅ Correct — role is just a string from the adapter
context: {
  role: "TENANT_ADMIN", // comes from BuildingOS adapter
  permissions: ["charges.read", "charges.write"]
}

// ❌ Wrong — core should not interpret or validate roles
if (context.role === "ADMIN") { ... }
```

The adapter defines what roles exist and what they mean.

---

## 🔐 Security Rules

1. **Never leak tenant data** — even in error messages
2. **Always validate tenantId** — before any knowledge retrieval
3. **Never trust role values** — they come from the adapter, not the user
4. **Reject unsafe queries** — if context is insufficient, say so
5. **Log all access** — for auditability and observability

---

## 🚫 Prohibited Behaviors

- Coupling BuildingOS logic into `ai-core`
- Hardcoding "SUPER_ADMIN" or "USER" in core types
- Using a global role enum across adapters
- Moving domain entities to shared packages
- Creating "generic" permissions that don't come from an adapter
- Assuming knowledge is universal — it must be SaaS-specific

---

## 📦 Package Responsibilities

| Package | Responsibility |
|---------|----------------|
| `ai-types` | Generic interfaces, contracts, DTOs |
| `ai-core` | Orchestration, context resolution, retrieval logic |
| `ai-adapters` | SaaS-specific implementations |
| `apps/ai-assistant-api` | HTTP entry point |
| `knowledge/*` | Structured docs per SaaS |

---

## 🧭 Operational Guidelines for Agents

1. **Before writing code** — verify which package should contain the logic
2. **If logic is SaaS-specific** — it belongs in an adapter, not the core
3. **If data is product knowledge** — put it in `knowledge/<saas>/`
4. **If you need a new type** — add it to `ai-types`, not to individual adapters
5. **If you're unsure** — ask before coupling logic to the core

---

## 🔄 Evolution Path

The system is designed to evolve:

- **Phase 1**: Structured knowledge retrieval (current)
- **Phase 2**: Semantic search / embeddings (future)
- **Phase 3**: Agentic actions with validation
- **Phase 4**: Multi-SaaS orchestration

Each phase must respect the core/adapter separation.

---

## 📖 Related Files

- `PROJECT_CONTEXT.md` — what this project is
- `DECISIONS.md` — architectural decisions
- `docs/ai-assistant/` — detailed architectural docs
- `README.md` — quick start and philosophy