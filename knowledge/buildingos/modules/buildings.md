---
type: module
appId: buildingos
module: buildings
roleScope: [TENANT_ADMIN, TENANT_OWNER, OPERATOR, RESIDENT]
occupantScope: [OWNER, RESIDENT]
tags: [buildings, properties, management]
---

# Buildings Module

## Purpose

The Buildings module is responsible for managing the lifecycle of buildings inside a tenant.

Its purpose is to allow tenant administrators to:

- create and maintain building records
- organize operational data per building
- keep building configuration consistent
- provide a clear base structure for units and residents
- maintain tenant-scoped administrative control

---

## Main Responsibilities

The module should allow administrators to:

- create a new building
- update building profile and operational settings
- view building-level operational context
- archive or deactivate buildings according to policy
- maintain traceability of key building changes

---

## Core Concepts

### Building

A building is an operational container for units and related management processes.

A building may include:

- name and code
- address and location metadata
- operational status
- contact information
- optional administrative notes

---

### Building Status

Recommended statuses:

- active
- inactive
- archived

Status should influence whether the building can receive new units or operational actions.

---

### Building Profile

The building profile stores core metadata required for day-to-day operations.

Examples:

- official name
- internal identifier
- timezone or locale preferences (if applicable)
- tenant ownership reference

---

## Typical Workflow

### 1. Create Building

Administrator registers a building with required data.

---

### 2. Validate Data

System validates required fields and uniqueness constraints.

---

### 3. Save and Activate

Building is saved and marked active when operationally ready.

---

### 4. Maintain Building

Administrator updates building information as needed.

---

## Business Rules

### Rule 1 — Tenant Isolation

Buildings must always belong to one tenant only.

No tenant can access buildings from another tenant.

---

### Rule 2 — Unique Building Identifier per Tenant

A tenant should not have duplicate building identifiers unless explicitly allowed by policy.

---

### Rule 3 — Controlled Status Changes

Status changes should be traceable and should not silently break related operational flows.

---

### Rule 4 — Role Restriction

Only authorized tenant users should create, edit, archive, or reactivate buildings.

---

### Rule 5 — Data Integrity

Required building fields should be validated before creation or update.

---

## Recommended UI Responsibilities

The Buildings module UI should allow:

- listing buildings by status
- creating a building
- editing building details
- viewing building summary
- archiving or deactivating when permitted

---

## Common Questions the Assistant Should Answer

Examples:

- How do I create a building?
- What data is required to create a building?
- Why can't I see a building in the active list?
- Can I edit a building after creation?
- What happens if I archive a building?

---

## Assistant Guidance Rules

When answering about buildings, the assistant should:

- explain building setup in clear steps
- emphasize tenant-scoped ownership
- clarify active vs inactive behavior
- avoid suggesting destructive actions without confirmation
- keep guidance operational and traceable

---

## Expected Safe Suggestions

The assistant may suggest:

- Open Buildings module
- Create new building
- Review building status
- Edit building profile
- Validate required fields before saving

---

## Non-Goals for V1

The assistant should not:

- create or modify buildings automatically
- infer unavailable building metadata
- bypass role or tenant restrictions
- execute destructive actions directly

---

## Summary

The Buildings module provides the foundational operational structure for tenant-level property management.

Its value depends on:

- clear building lifecycle
- strict tenant isolation
- controlled administrative actions
- reliable data integrity