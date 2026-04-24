# Yoryi AI Core

Reusable intelligence layer for multi-tenant SaaS products.

---

## 🎯 Purpose

`yoryi-ai-core` is a reusable AI assistant engine designed to integrate into multiple SaaS applications through **adapters**.

Its purpose is to provide:

- context-aware assistance
- role-aware guidance
- structured knowledge retrieval
- reusable UI integration
- safe operation in multi-tenant systems

This project is not tied to a single SaaS. It is a shared intelligence layer that can be connected to products such as:

- BuildingOS
- JurisManager
- future SaaS platforms

---

## 🧠 Core Philosophy

The assistant is built as **infrastructure**, not as product-specific glue code.

The core must always remain:

- **SaaS-agnostic** — never knows about specific products
- **Role-agnostic** — treats `role` as an opaque string
- **Tenant-isolated** — never leaks data across tenants
- **Knowledge-external** — retrieves from external documents, not hardcoded responses

---

## 🏗️ Project Structure

```
yoryi-ai-core/
├── apps/
│   └── ai-assistant-api/      # HTTP entry point
├── packages/
│   ├── ai-types/            # Generic interfaces and DTOs
│   ├── ai-core/            # Reusable orchestration engine
│   └── ai-adapters/        # SaaS-specific implementations
├── knowledge/
│   ├── buildingos/         # BuildingOS knowledge base
│   └── jurismanager/       # Future adapters
├── docs/
│   └── ai-assistant/       # Detailed architectural docs
├── AGENTS.md               # Operating guidelines for AI agents
├── PROJECT_CONTEXT.md       # System overview
├── CURRENT_SPRINT.md      # Sprint focus
├── TASKS.md               # Task breakdown
├── DECISIONS.md           # Architectural decisions
└── README.md             # This file
```

---

## 📦 Packages

### ai-types

Generic interfaces and DTOs shared across all packages.

```ts
export type AssistantRuntimeContext = {
  appId: string;
  tenantId?: string;
  userId: string;
  role: string;
  route: string;
  currentModule?: string;
  permissions?: string[];
  // ...generic fields only
};
```

### ai-core

Reusable orchestration engine.

- Handles chat requests
- Resolves context via adapters
- Retrieves knowledge
- Builds responses

The core does **NOT** hardcode SaaS-specific logic.

### ai-adapters

SaaS-specific connector implementations.

Each adapter implements `SaasAssistantAdapter`:

- Defines product-specific roles and permissions
- Maps routes to modules
- Enriches runtime context
- Scopes knowledge retrieval

---

## 🚀 Quick Start

### Install dependencies

```bash
npm install
```

### Run the API

```bash
npm run dev
```

The API runs on `http://localhost:4001`.

### Test the assistant

```bash
curl -X POST http://localhost:4001/assistant/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I generate monthly charges?",
    "context": {
      "appId": "buildingos",
      "tenantId": "t_123",
      "userId": "u_456",
      "role": "TENANT_ADMIN",
      "route": "/tenant/charges"
    }
  }'
```

---

## 🔐 Core Rules

The system must always respect these rules:

1. The core must remain SaaS-agnostic
2. SaaS-specific logic must live in adapters
3. The assistant UI must be reusable
4. Knowledge must be scoped by app, module, and role
5. No unsafe actions without validation
6. No cross-tenant leakage under any circumstance

---

## 🚦 Rollout & Hardening Controls

For production rollout, the assistant supports:

- tenant rollout policy (`global`, `allowlist`, `canary`)
- global kill switch
- per-tenant exclusions
- per-user/tenant rate limiting
- gateway circuit breaker protection

Reference: `docs/assistant-rollout-playbook.md`

---

## 🧠 Role Model

The core treats `role` as an **opaque string**:

```ts
// ✅ Correct — role comes from adapter, core just passes it
context: {
  role: "TENANT_ADMIN",
  permissions: ["charges.read", "charges.write"]
}

// ❌ Wrong — core should not interpret specific roles
if (context.role === "ADMIN") { ... }
```

**Each SaaS defines its own roles.** BuildingOS has "TENANT_ADMIN". JurisManager has "ABOGADO". There's no universal role taxonomy.

---

## 📚 Knowledge System

Knowledge is organized by SaaS:

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

Knowledge is **never hardcoded in the core**. It's external and SaaS-specific.

---

## 🛠️ Adding a New SaaS

To integrate a new SaaS product:

### Step 1: Create the adapter

Create `packages/ai-adapters/src/<saas-name>/<saas-name>.adapter.ts`:

```ts
export class SaasNameAdapter implements SaasAssistantAdapter {
  appId = "saasname";
  // Implement interface methods
}
```

### Step 2: Add knowledge

Create knowledge folders in `knowledge/<saas-name>/`:

- modules/
- faq/
- flows/
- roles/
- policies/

### Step 3: Register adapter

Update the API to use the new adapter.

---

## 📖 Documentation

Main architectural documents:

- `AGENTS.md` — operating guidelines for AI agents
- `PROJECT_CONTEXT.md` — system overview
- `DECISIONS.md` — architectural decisions
- `docs/ai-assistant/` — detailed architectural docs

---

## 🧭 Evolution Path

The system is designed to evolve:

- **Phase 1**: Structured knowledge retrieval (current)
- **Phase 2**: Semantic search / embeddings
- **Phase 3**: Agentic actions with validation
- **Phase 4**: Multi-SaaS orchestration

Each phase respects the core/adapter separation.

---

## 🧠 Final Principle

> Build the assistant as reusable infrastructure,
> not as product-specific glue code.

---

## Related Files

- `AGENTS.md` — operating guidelines
- `PROJECT_CONTEXT.md` — system overview
- `CURRENT_SPRINT.md` — sprint focus
- `TASKS.md` — task breakdown
- `DECISIONS.md` — architectural decisions
