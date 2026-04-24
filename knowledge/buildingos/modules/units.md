---
type: module
appId: buildingos
module: units
roleScope: [TENANT_ADMIN, TENANT_OWNER, OPERATOR]
occupantScope: [OWNER, RESIDENT]
tags: [units, properties, residents, occupancy]
---

# Units Module

## Purpose

The Units module is responsible for managing units within buildings and maintaining their operational assignment state.

Its purpose is to allow tenant administrators to:

- create and maintain unit records
- associate units with the correct building
- assign occupants or residents
- track unit occupancy status
- maintain tenant-scoped traceability

---

## Main Responsibilities

The module should allow administrators to:

- create units inside a building
- edit unit attributes
- assign or unassign residents
- view occupancy and assignment status
- keep unit data consistent with building scope

---

## Core Concepts

### Unit

A unit is an individual property space managed under a building.

A unit may include:

- unit number or label
- building reference
- floor or block metadata
- occupancy status
- assignment information

---

### Occupancy Status

Recommended statuses:

- vacant
- assigned
- inactive

Occupancy status should reflect whether a unit currently has an active resident assignment.

---

### Resident Assignment

A resident assignment links a person to a unit in a tenant-scoped context.

An assignment should include:

- resident reference
- assignment state
- assignment timestamps
- optional notes for operations

---

## Typical Workflow

### 1. Create Unit

Administrator creates the unit under a selected building.

---

### 2. Validate Unit Data

System validates required fields and prevents duplicate unit identifiers in the same building scope.

---

### 3. Assign Resident (Optional)

Administrator links a resident to the unit when occupancy starts.

---

### 4. Maintain Unit Lifecycle

Administrator updates occupancy and assignment state over time.

---

## Business Rules

### Rule 1 — Tenant Isolation

Units must always be tenant-scoped and linked to buildings in the same tenant.

---

### Rule 2 — Building Integrity

A unit cannot exist without a valid building reference.

---

### Rule 3 — Unique Unit Identifier per Building Scope

Duplicate unit identifiers in the same building should be prevented unless explicit override policy exists.

---

### Rule 4 — Assignment Consistency

A resident assignment should be coherent with unit status and active occupancy rules.

---

### Rule 5 — Role Restriction

Only authorized tenant roles should create units and manage assignments.

---

## Recommended UI Responsibilities

The Units module UI should allow:

- listing units by building and status
- creating units
- editing unit profile
- assigning and unassigning residents
- viewing occupancy summary

---

## Common Questions the Assistant Should Answer

Examples:

- How do I create a unit?
- Why can't I assign a resident to this unit?
- Can one resident be assigned to multiple units?
- Why does this unit appear as vacant?
- What should I check before assigning a resident?

---

## Assistant Guidance Rules

When answering about units, the assistant should:

- explain unit lifecycle and assignment sequence
- confirm building and tenant consistency
- differentiate vacant vs assigned states
- avoid unsafe assumptions about occupancy
- stay within role and permission boundaries

---

## Expected Safe Suggestions

The assistant may suggest:

- Open Units module
- Create new unit
- Verify building reference
- Assign resident to unit
- Review occupancy status and assignment data

---

## Non-Goals for V1

The assistant should not:

- auto-assign residents
- modify assignment records without user action
- infer hidden occupancy data
- bypass tenant or role restrictions

---

## Summary

The Units module operationalizes the relationship between buildings and residents through controlled unit records and assignment flows.

Its value depends on:

- consistent building linkage
- reliable assignment lifecycle
- strict tenant isolation
- clear occupancy state management