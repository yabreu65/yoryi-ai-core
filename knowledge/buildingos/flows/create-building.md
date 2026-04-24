---
type: flow
appId: buildingos
module: buildings
roleScope: [TENANT_ADMIN, TENANT_OWNER]
occupantScope: []
tags: [buildings, workflow, create]
---

# Flow — Create Building

## Purpose

Define the recommended operational flow for creating a building in BuildingOS.

---

## Preconditions

Before creating a building, the system should ensure:

- user is authorized to create buildings
- tenant context is valid
- required building fields are available
- identifier uniqueness checks are ready

---

## Recommended Flow

### Step 1 — Open Buildings Module

Administrator navigates to the Buildings module and starts creation.

---

### Step 2 — Enter Required Data

Administrator provides:

- building name
- identifier or code
- address/reference
- initial status

---

### Step 3 — Validate Input

System validates:

- required fields
- format constraints
- uniqueness within tenant scope

---

### Step 4 — Save Building

If validation passes, system persists the building record in tenant scope.

---

### Step 5 — Confirm and Review

Administrator verifies the created building appears correctly in list/detail views.

---

## Expected Assistant Guidance

The assistant should explain:

- required data before saving
- uniqueness and tenant-scope checks
- difference between active and inactive status
- why validation errors may appear

---

## Common Failure Cases

- missing required fields
- duplicate identifier in tenant scope
- invalid status transition
- insufficient role permissions
- attempted cross-tenant action

---

## Safe Suggestions

The assistant may suggest:

- open Buildings module
- verify required fields
- validate identifier uniqueness
- save and review building profile
- check role permissions if action is blocked