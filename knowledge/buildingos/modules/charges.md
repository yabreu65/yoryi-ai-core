---
type: module
appId: buildingos
module: charges
roleScope: [TENANT_ADMIN, TENANT_OWNER, OPERATOR]
occupantScope: []
tags: [charges, billing, payments, financial]
---

# Charges Module

## Purpose

The Charges module is responsible for managing monthly financial charges assigned to units within a tenant.

Its purpose is to allow tenant administrators to:

* create charge periods
* generate charges for units
* review generated charges
* publish charges for residents
* maintain a clear monthly billing workflow

---

## Main Responsibilities

The module should allow the tenant administrator to:

* define a billing period
* generate charges for all applicable units
* validate generated amounts before publishing
* publish charges so they become visible to residents
* maintain traceability of each charge period

---

## Core Concepts

### Charge Period

A charge period represents a billing cycle, usually monthly.

Examples:

* January 2026
* February 2026
* March 2026

A charge period should act as the parent container for all charges generated in that cycle.

---

### Charge

A charge is a financial amount assigned to a specific unit for a given period.

A charge may include:

* base condominium fee
* extraordinary expenses
* penalties
* adjustments
* other tenant-defined billing concepts

---

### Publish State

Charges should not become visible immediately after creation.

Recommended states:

* draft
* generated
* published

This allows the administrator to review the data before exposing it to residents.

---

## Typical Workflow

### 1. Create Charge Period

The administrator creates a new charge period for a given month.

Expected data:

* period label
* due date
* optional notes
* status

---

### 2. Generate Charges

The system generates charges for all relevant units within that tenant.

Generation may depend on:

* unit category
* square meters
* custom rules
* manually entered expenses
* shared building costs

---

### 3. Review Charges

Before publishing, the administrator should be able to:

* inspect generated charges
* verify amounts
* detect missing units
* confirm no duplicated charges exist

---

### 4. Publish Charges

Once reviewed, charges are published.

After publishing:

* residents can see their charges
* the billing period becomes official
* the generated charges should no longer be considered editable without controlled actions

---

## Business Rules

### Rule 1 — Tenant Isolation

Charges must always belong to a single tenant.

No charge generation, listing, or publishing process may access data from another tenant.

---

### Rule 2 — One Logical Billing Period per Cycle

A tenant should not accidentally generate duplicate billing periods for the same cycle without an explicit override rule.

---

### Rule 3 — Review Before Publish

Publishing should happen only after review.

The system should separate:

* generation
* review
* publication

---

### Rule 4 — Traceability

Each charge must remain linked to:

* tenant
* period
* unit
* generation source
* timestamps

---

### Rule 5 — Role Restriction

Only authorized tenant administrators should be able to:

* create periods
* generate charges
* publish charges

Residents should only see published charges relevant to their assigned unit.

---

## Recommended UI Responsibilities

The Charges module UI should help administrators:

* view existing billing periods
* create a new period
* generate charges
* preview results
* publish the period
* inspect charge details by unit

---

## Common Questions the Assistant Should Answer

Examples of questions this module should support:

* How do I create a monthly charge period?
* How do I generate charges for all units?
* What is the difference between generated and published?
* Why can residents not see a charge yet?
* Can I review charges before publishing?
* What happens if a unit is missing from the generated list?

---

## Assistant Guidance Rules

When answering about the Charges module, the assistant should:

* explain the workflow in order
* distinguish clearly between draft, generated, and published states
* avoid inventing financial calculations if no rules are provided
* stay tenant-scoped
* avoid suggesting destructive actions without confirmation

---

## Expected Safe Suggestions

The assistant may safely suggest actions such as:

* Open Charges module
* Create a new billing period
* Review generated charges
* Check pending publication
* Inspect charges by unit

---

## Non-Goals for V1

The assistant should not:

* execute charge generation automatically
* publish charges automatically
* modify financial values directly
* approve payments from this module
* infer accounting rules without configured knowledge

---

## Summary

The Charges module is the operational center of the monthly billing workflow.

Its value depends on:

* clarity of periods
* correctness of generated charges
* safe review before publication
* tenant isolation
* visibility control for residents

---
