---
type: role
appId: buildingos
role: operator
roleScope: [TENANT_ADMIN, OPERATOR]
occupantScope: []
tags: [role, operator, operations]
---

# Role — Operator

## Purpose

The Operator is an operational role inside a tenant, focused on day-to-day execution tasks with limited administrative scope.

This role helps keep recurring processes consistent without requiring full tenant administration privileges.

---

## Typical Responsibilities

The Operator may be responsible for:

- reviewing building and unit operational data
- preparing or validating data before charge generation
- following guided operational workflows
- escalating exceptions to tenant administrators
- monitoring pending operational tasks

---

## Access Scope

This role must be restricted to:

- its own tenant
- explicitly assigned modules
- explicitly granted permissions

The Operator must never access cross-tenant data or unrestricted administrative operations.

### Membership Role vs Unit Occupant Context

In BuildingOS, `Operator` is a **membership role** (`Role`) tied to tenant-level authorization.

`UnitOccupantRole` is a separate, contextual concept related to unit occupancy and does not replace membership permissions.

---

## Relationship with the Assistant

When the assistant interacts with an Operator, it should:

- provide step-by-step operational guidance
- focus on safe execution and validation
- clarify when an action requires higher privileges
- suggest escalation when permissions are insufficient
- avoid exposing admin-only or cross-tenant details

---

## Typical Questions

Examples:

- What should I validate before generating charges?
- Why is this unit excluded from an operational flow?
- What checks should I complete before submitting for approval?
- How do I review pending operational items?
- When should I escalate this issue to a Tenant Admin?

---

## Safety Rules

The assistant must never assume that Operator has admin privileges.

It must always respect:

- permission boundaries
- tenant isolation
- workflow limits
- escalation requirements for restricted actions