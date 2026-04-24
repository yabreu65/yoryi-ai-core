# BuildingOS Adapter — V1

## 🎯 Purpose

Define the first SaaS-specific adapter that connects the reusable AI Assistant Core with the BuildingOS domain.

This adapter is responsible for translating BuildingOS runtime information into a normalized format that the AI Core can understand and use safely.

---

## 🧠 Core Responsibility

The BuildingOS Adapter acts as the **boundary layer** between:

* the reusable AI Assistant Core
* the BuildingOS business domain

It ensures that the AI Core remains generic while BuildingOS-specific logic stays isolated.

---

## 🧱 Scope (V1)

Version 1 is intentionally limited.

### Supported audience

* `TENANT_ADMIN`

### Supported modules

* `buildings`
* `units`
* `charges`
* `payments`

### Supported capabilities

* Context resolution
* Route-to-module mapping
* Permission resolution
* Knowledge scoping
* Basic action suggestions

### Not included in V1

* Resident support
* Super admin advanced flows
* Destructive actions
* Database mutations
* Autonomous execution

---

## 🧩 Adapter Responsibilities

The adapter must:

1. Resolve the current module from the route
2. Resolve the current user permissions
3. Provide normalized runtime context
4. Scope knowledge retrieval to BuildingOS domain
5. Restrict available actions according to role and permissions
6. Prevent cross-tenant leakage

---

## 🏢 BuildingOS Domain Model (Relevant to Assistant)

For V1, the assistant will understand the following logical domains:

### Modules

* `buildings`
* `units`
* `charges`
* `payments`

### Typical entities

* `building`
* `unit`
* `charge_period`
* `payment`

### Typical flows

* create building
* edit building
* create unit
* assign resident
* generate charges
* publish charges
* report payment
* approve payment

---

## 👥 Supported Roles

### `TENANT_ADMIN`

Primary role for V1.

Expected capabilities:

* manage buildings
* manage units
* generate charges
* review and approve payments
* access tenant-scoped operational flows

---

## 🔄 Route Resolution

The adapter must map frontend routes into logical modules.

### Examples

| Route                   | Resolved Module |
| ----------------------- | --------------- |
| `/tenant/buildings`     | `buildings`     |
| `/tenant/buildings/:id` | `buildings`     |
| `/tenant/units`         | `units`         |
| `/tenant/charges`       | `charges`       |
| `/tenant/payments`      | `payments`      |

If no route match is found, the adapter should return:

```ts id="l8y6q4"
"general"
```

---

## 🧠 Runtime Context Enrichment

The adapter receives a base runtime context from the frontend and enriches it with BuildingOS-specific information.

### Input Example

```json id="mgsbw8"
{
  "appId": "buildingos",
  "tenantId": "t_001",
  "userId": "u_001",
  "role": "TENANT_ADMIN",
  "route": "/tenant/charges"
}
```

### Output Example

```json id="o0rw9u"
{
  "appId": "buildingos",
  "tenantId": "t_001",
  "userId": "u_001",
  "role": "TENANT_ADMIN",
  "route": "/tenant/charges",
  "currentModule": "charges",
  "permissions": [
    "charges.read",
    "charges.write",
    "charges.publish",
    "payments.approve"
  ]
}
```

---

## 🔐 Permission Resolution

The adapter must resolve permissions from the BuildingOS authorization model.

### Rules

* permissions must be tenant-scoped
* permissions must never be guessed
* permissions must be resolved from the authenticated user state
* permissions must be passed to the AI Core as normalized strings

### Example permission names

* `buildings.read`
* `buildings.write`
* `units.read`
* `units.write`
* `charges.read`
* `charges.write`
* `charges.publish`
* `payments.read`
* `payments.approve`

---

## 📚 Knowledge Scope

The adapter must scope knowledge retrieval using metadata filters.

### Required filters

* `appId = buildingos`
* `module = currentModule`
* `roleScope includes current role`

### Optional filters

* flow
* locale
* entityType

This prevents irrelevant or unsafe answers.

---

## 🧭 Suggested Actions (V1)

The adapter may expose safe suggestions such as:

* open module
* navigate to related screen
* suggest next step in a flow
* prefill a known workflow action

### Examples

* “Go to Charges”
* “Open Building Details”
* “Review Pending Payments”
* “Continue Charge Generation Flow”

### Constraints

* suggestions must be non-destructive
* suggestions must respect permissions
* suggestions must be traceable

---

## 🚫 Forbidden Behavior

The BuildingOS Adapter must NEVER:

* expose data from another tenant
* bypass permission checks
* perform destructive actions
* mutate data directly from assistant output
* assume routes or permissions without validation

---

## 🧪 Example Adapter Interface

```ts id="tqg626"
export interface SaasAssistantAdapter {
  appId: string;
  getModules(): Promise<AppModuleDefinition[]>;
  getRoles(): Promise<RoleDefinition[]>;
  getContext(input: RuntimeContextInput): Promise<ResolvedAssistantContext>;
  getKnowledgeScopes(): Promise<KnowledgeScope[]>;
  getAvailableActions(context: ResolvedAssistantContext): Promise<ActionDefinition[]>;
  canAnswer(question: string, context: ResolvedAssistantContext): Promise<boolean>;
}
```

---

## 🧠 Example BuildingOS Adapter Skeleton

```ts id="m88zj6"
export class BuildingOSAdapter implements SaasAssistantAdapter {
  appId = "buildingos";

  async getModules() {
    return [
      { key: "buildings", label: "Buildings" },
      { key: "units", label: "Units" },
      { key: "charges", label: "Charges" },
      { key: "payments", label: "Payments" }
    ];
  }

  async getRoles() {
    return [
      { key: "TENANT_ADMIN", label: "Tenant Admin" }
    ];
  }

  resolveModuleFromRoute(route: string): string {
    if (route.includes("/charges")) return "charges";
    if (route.includes("/payments")) return "payments";
    if (route.includes("/units")) return "units";
    if (route.includes("/buildings")) return "buildings";
    return "general";
  }

  async getContext(input: RuntimeContextInput): Promise<ResolvedAssistantContext> {
    return {
      ...input,
      currentModule: this.resolveModuleFromRoute(input.route),
      permissions: await this.resolvePermissions(input.userId, input.tenantId)
    };
  }

  async getKnowledgeScopes() {
    return [
      { appId: "buildingos", module: "buildings" },
      { appId: "buildingos", module: "units" },
      { appId: "buildingos", module: "charges" },
      { appId: "buildingos", module: "payments" }
    ];
  }

  async getAvailableActions(context: ResolvedAssistantContext) {
    return [];
  }

  async canAnswer(question: string, context: ResolvedAssistantContext) {
    return true;
  }

  private async resolvePermissions(userId: string, tenantId?: string): Promise<string[]> {
    return [];
  }
}
```

---

## 🧱 Design Decisions for V1

### Decision 1

The adapter only supports `TENANT_ADMIN` initially.

Reason:
This reduces complexity and validates the architecture with the highest operational-value user first.

---

### Decision 2

The adapter supports only 4 operational modules.

Reason:
These modules provide immediate usefulness and are sufficient to validate contextual assistance.

---

### Decision 3

All responses are read-only.

Reason:
Safety and trust come before automation.

---

## 📈 Future Evolution

Future versions of the BuildingOS Adapter may include:

* `RESIDENT` role support
* `SUPER_ADMIN` support
* deeper entity-aware context
* safe action execution
* insight generation from repeated user friction
* module-specific assistant personalities or prompts

---

## 🧠 Final Principle

> BuildingOS-specific intelligence must live in the adapter,
> never inside the reusable core.

That rule preserves reusability, safety, and long-term scalability.

---
