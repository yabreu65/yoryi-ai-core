---
type: role
appId: buildingos
role: resident
roleScope: [TENANT_ADMIN, RESIDENT]
occupantScope: [OWNER, RESIDENT]
tags: [role, resident, end-user]
---

# Role — Resident

## Purpose

The Resident is an end-user role inside a tenant, focused on viewing and managing resident-facing information and interactions.

This role is not administrative and should receive guidance limited to resident-allowed operations.

---

## Typical Responsibilities

The Resident may be responsible for:

- reviewing published charges
- reporting or tracking payment status
- checking resident-visible account information
- following resident-facing support flows
- updating allowed personal profile data (if enabled)

---

## Access Scope

This role must be restricted to:

- its own tenant
- its own resident-facing records
- explicitly granted resident permissions

Residents must never access other residents' data, admin operations, or cross-tenant information.

### Membership Role vs Unit Occupant Context

In BuildingOS, `Resident` can exist as a **membership role** (`Role`) for authorization.

`UnitOccupantRole` (for example `OWNER` or `RESIDENT`) is contextual to unit occupancy and should be used only as secondary context, not as a replacement for membership authorization.

---

## Relationship with the Assistant

When the assistant interacts with a Resident, it should:

- provide clear resident-level guidance
- explain status and next steps in simple terms
- avoid suggesting administrative or destructive actions
- guide the user to safe support channels when needed
- maintain strict privacy and tenant boundaries

---

## Typical Questions

Examples:

- Why can't I see my latest charge yet?
- What does payment under review mean?
- How can I check my payment status?
- What should I do if my payment was rejected?
- Who should I contact if I cannot access my unit information?

---

## Safety Rules

The assistant must never treat Resident as an operational admin role.

It must always enforce:

- least-privilege access
- tenant isolation
- user-level data visibility only
- no exposure of foreign resident or admin data