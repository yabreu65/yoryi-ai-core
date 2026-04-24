---
type: faq
appId: buildingos
module: charges
roleScope: [TENANT_ADMIN, TENANT_OWNER, OPERATOR]
occupantScope: []
tags: [charges, billing, faq, questions]
---

# Charges FAQ

## What is the difference between generated and published charges?

Generated charges are charges that already exist in the system for a billing period, but they are still under administrator review.

Published charges are charges that have been officially released and are now visible to residents.

Recommended rule:

* generated = internal review stage
* published = visible and official stage

---

## Why can residents not see a charge yet?

Residents should only see charges that belong to a published billing period.

If a resident cannot see a charge yet, possible reasons include:

* the billing period is still in draft
* charges were generated but not published
* the resident is not assigned correctly to the unit
* the charge is not linked correctly to the resident-visible account

---

## Can I review charges before publishing?

Yes.

The recommended workflow is:

1. create the billing period
2. generate charges
3. review charges
4. publish the period

Publishing should not happen immediately after generation without review.

---

## What happens if a unit is missing during charge generation?

If a unit is missing, the administrator should verify:

* whether the unit belongs to the current tenant
* whether the unit is active
* whether the generation rule includes that unit
* whether the unit category or billing rule excludes it
* whether there was an assignment or data consistency issue

The assistant should recommend checking unit status and generation rules before publishing.

---

## Can charges be edited after publication?

Recommended business rule:

Published charges should not be freely editable.

If a correction is needed, it should happen through a controlled adjustment process, not by silently editing published financial data.

This preserves auditability and trust.

---

## Should duplicate charge periods be allowed?

Recommended rule:

The system should prevent accidental duplicate charge periods for the same cycle unless the user explicitly overrides with a controlled action.

This reduces billing mistakes and confusion.

---

## What if a charge amount looks wrong?

If a resident or admin sees an unexpected charge:

1. Verify the charge period rules
2. Check the unit's square meters or category
3. Review any extraordinary expenses included
4. Contact administrator for corrections

Published charges should only be corrected through a formal adjustment process.

---

## How do I handle complaints about charges?

For resident complaints about charge amounts:

1. Acknowledge the concern
2. Explain how the charge was calculated
3. Offer to review the unit's details
4. Suggest the formal adjustment process if needed

The assistant should NOT modify charges directly.

---

## Can residents see all charges in their building?

No.

Residents only see charges for their assigned unit.

Administrators see all tenant charges.

---

## What's the due date flow?

1. Charges are published for a period
2. Due date is set in the period settings
3. Residents see the due date in their account
4. Payment tracking happens in the Payments module

---
