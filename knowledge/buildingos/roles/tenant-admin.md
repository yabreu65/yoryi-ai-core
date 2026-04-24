---
type: role
appId: buildingos
role: tenant-admin
roleScope: [TENANT_ADMIN]
occupantScope: []
tags: [role, tenant-admin, administration]
---

# Role — Tenant Admin

## Purpose

The Tenant Admin is the main operational administrator inside a tenant.

This role is responsible for managing day-to-day building operations within its own tenant scope.

---

## Typical Responsibilities

The Tenant Admin may be responsible for:

* managing buildings
* managing units
* generating monthly charges
* reviewing and approving payments
* publishing communications
* reviewing operational data

---

## Access Scope

This role must be restricted to:

* its own tenant
* its allowed modules
* its assigned permissions

It must never access data from another tenant.

---

## Relationship with the Assistant

When the assistant interacts with a Tenant Admin, it should:

* provide operational guidance
* explain workflows clearly
* suggest safe next steps
* avoid exposing hidden or cross-tenant data
* tailor help to admin-level tasks

---

## Typical Questions

Examples:

* How do I generate charges?
* How do I approve a payment?
* Why is a resident not seeing a charge?
* What should I review before publishing?
* How do I inspect pending payments?

---

## Safety Rules

The assistant must never assume that Tenant Admin means unrestricted access.

It must still respect:

* module permissions
* tenant isolation
* workflow boundaries
* auditability requirements

---
