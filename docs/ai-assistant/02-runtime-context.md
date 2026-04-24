# AI Assistant — Runtime Context

## 🎯 Purpose

Define a **standard, structured runtime context** that is passed to the AI Assistant on every request.

This context enables:

* Accurate responses
* Role-aware behavior
* Module-specific guidance
* Safe multi-tenant execution

Without context, the assistant becomes unreliable.

---

## 🧠 Core Principle

> The assistant must never guess what the user is doing.
> It must always be explicitly informed through context.

---

## 📦 Context Structure

```ts
export type AssistantRuntimeContext = {
  appId: string;
  tenantId?: string;
  userId: string;
  role: string;
  route: string;

  currentModule?: string;
  entityType?: string;
  entityId?: string;
  screenTitle?: string;

  unitOccupantRole?: "OWNER" | "RESIDENT";

  permissions?: string[];
  locale?: string;

  extra?: Record<string, unknown>;
};
```

---

## 🧩 Field Definitions

### Required Fields

#### `appId`

Identifies the SaaS application.

Examples:

* `buildingos`
* `jurismanager`

---

#### `userId`

Unique identifier of the current user.

---

#### `role`

Defines the user's membership role within the SaaS (primary authorization).

Examples:

* `SUPER_ADMIN`
* `TENANT_ADMIN`
* `OPERATOR`
* `RESIDENT`

---

#### `unitOccupantRole`

Optional secondary context indicating the user's relationship to a specific unit.

This field is independent of the primary membership role. Use it for unit-specific context awareness (e.g., when a user views their own unit's charges or payment status).

Examples:

* `OWNER` — user is the owner of the unit they are viewing
* `RESIDENT` — user occupies the unit but does not own it

Note: The core does NOT interpret this field for authorization. It is passed through as metadata for potential use in retrieval ranking or contextual responses.

---

#### `route`

Current frontend route.

Examples:

* `/tenant/charges`
* `/admin/buildings`

---

### Optional Fields

#### `tenantId`

Used in multi-tenant systems.

Must always be respected for data isolation.

---

#### `currentModule`

Logical module derived from the route.

Examples:

* `charges`
* `units`
* `buildings`

---

#### `entityType`

Type of entity currently being viewed.

Examples:

* `building`
* `unit`
* `payment`

---

#### `entityId`

Identifier of the current entity.

---

#### `screenTitle`

Human-readable title of the current screen.

---

#### `permissions`

Resolved permissions for the user.

Examples:

* `read`
* `write`
* `approve_payments`

---

#### `locale`

User language or region.

---

#### `extra`

Flexible extension field for additional context.

---

## 🔄 Context Flow

### Step 1 — Frontend

Frontend sends base context (optionally includes unitOccupantRole):

```json
{
  "appId": "buildingos",
  "tenantId": "t_123",
  "userId": "u_456",
  "role": "RESIDENT",
  "unitOccupantRole": "OWNER",
  "route": "/tenant/units/u_001"
}
```

---

### Step 2 — Adapter Enrichment

Adapter resolves:

* `currentModule`
* `permissions`
* additional metadata

---

### Step 3 — Final Context

```json
{
  "appId": "buildingos",
  "tenantId": "t_123",
  "userId": "u_456",
  "role": "TENANT_ADMIN",
  "route": "/tenant/charges",
  "currentModule": "charges",
  "permissions": ["read", "write", "approve"]
}
```

---

## 🧠 Why Context Matters

### Without Context

* Generic answers
* High hallucination risk
* No awareness of user intent
* Unsafe suggestions

---

### With Context

* Precise answers
* Role-based filtering
* Module-specific guidance
* Safer interactions

---

## 📍 Context Scenarios

### Scenario 1 — Admin in Charges Module

```json
{
  "role": "TENANT_ADMIN",
  "currentModule": "charges"
}
```

→ Assistant explains charge generation, approval, workflows

---

### Scenario 2 — Resident User

```json
{
  "role": "RESIDENT"
}
```

→ Assistant limits scope (no admin actions)

---

### Scenario 3 — Viewing a Specific Entity

```json
{
  "entityType": "payment",
  "entityId": "pay_001"
}
```

→ Assistant can provide contextual help about that payment

---

## 🔐 Context Rules

The system must enforce:

1. Never override permissions
2. Never expose data from another tenant
3. Always filter knowledge by role
4. Always respect module scope
5. Never infer missing critical data

---

## ⚠️ Anti-Patterns (Do NOT do this)

❌ Sending empty or partial context
❌ Hardcoding module logic in the core
❌ Allowing the assistant to guess user intent
❌ Mixing tenant data
❌ Ignoring permissions

---

## 🧱 Design Constraint

> The AI Core must remain completely context-driven.

It must not:

* depend on SaaS code
* assume business rules
* bypass adapters

---

## 🔌 Adapter Responsibility

Adapters are responsible for:

* Mapping routes → modules
* Resolving permissions
* Enriching context
* Ensuring correctness

---

## 📡 Frontend Responsibility

Frontend must always send:

* appId
* userId
* role
* route
* tenantId (if applicable)

---

## 🚀 Evolution (Future)

Future versions may include:

* Behavior tracking
* Session-level preferences
* Context summarization
* User intent classification

---

## 🧠 Final Principle

> Context is the difference between
> a smart assistant and a dangerous one.

---
