---
type: faq
appId: buildingos
module: units
roleScope: [TENANT_ADMIN, TENANT_OWNER, OPERATOR]
occupantScope: [OWNER, RESIDENT]
tags: [units, residents, occupancy, faq, questions]
---

# Units FAQ

## What data is required to create a unit?

Recommended minimum data:

- unit label or number
- building reference
- initial occupancy status

Optional metadata may include floor, block, or notes.

---

## Why can't I assign a resident to a unit?

Possible reasons:

- the unit is inactive
- resident data is incomplete
- assignment rules are not satisfied
- role permissions do not allow assignment actions
- tenant mismatch between resident and unit

---

## Can one resident be assigned to multiple units?

It depends on tenant policy.

If allowed, assignments must remain explicit and traceable to avoid billing or communication errors.

---

## Why does a unit show as vacant?

Possible reasons:

- no active assignment exists
- assignment ended and was not replaced
- unit status was reset or updated
- occupancy data is pending validation

---

## What should be validated before assigning a resident?

Recommended checks:

- unit belongs to current tenant
- building reference is valid
- resident belongs to the same tenant
- assignment state is consistent with occupancy rules