---
type: flow
appId: buildingos
module: units
roleScope: [TENANT_ADMIN, TENANT_OWNER, OPERATOR]
occupantScope: []
tags: [units, residents, workflow, assign]
---

# Flow — Assign Resident to Unit

## Purpose

Define the recommended operational flow for assigning a resident to a unit.

---

## Preconditions

Before assignment, the system should ensure:

- user is authorized to manage assignments
- tenant context is valid
- unit exists and is eligible for assignment
- resident exists in the same tenant scope
- assignment rules are satisfied

---

## Recommended Flow

### Step 1 — Open Unit Details

Administrator opens the target unit and confirms current occupancy state.

---

### Step 2 — Select Resident

Administrator chooses the resident to assign, validating tenant consistency.

---

### Step 3 — Validate Assignment Rules

System validates:

- unit status allows assignment
- resident is eligible
- no conflicting active assignment exists (unless policy allows)

---

### Step 4 — Confirm Assignment

Administrator confirms assignment action.

System updates:

- assignment record
- unit occupancy status
- traceability metadata

---

### Step 5 — Verify Result

Administrator checks assignment appears correctly in unit detail/history.

---

## Expected Assistant Guidance

The assistant should explain:

- required checks before assignment
- occupancy state implications
- tenant consistency requirements
- typical reasons for assignment errors

---

## Common Failure Cases

- assigning resident from another tenant
- assigning to inactive unit
- assignment conflict with existing active record
- missing required resident data
- insufficient permissions

---

## Safe Suggestions

The assistant may suggest:

- open unit details
- validate resident and tenant scope
- review occupancy status
- confirm assignment only after checks
- verify assignment history after update