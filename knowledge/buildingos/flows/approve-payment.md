---
type: flow
appId: buildingos
module: payments
roleScope: [TENANT_ADMIN, TENANT_OWNER, OPERATOR]
occupantScope: []
tags: [payments, workflow, approval]
---

# Flow — Approve Payment

## Purpose

Define the recommended process for reviewing and approving a reported payment.

---

## Preconditions

Before approval, the system should ensure:

* the user has permission to review payments
* the payment belongs to the current tenant
* the payment exists and is not already approved
* the related account data is available

---

## Recommended Flow

### Step 1 — Open Payment Details

The administrator opens the payment and reviews:

* amount
* method
* date
* reference
* proof attachment
* related resident or unit

---

### Step 2 — Validate Consistency

The administrator checks whether:

* the amount is reasonable
* the proof is clear
* the payment relates to known charges
* the reference is valid if required

---

### Step 3 — Approve or Reject

If valid:

* approve payment
* update balance
* update related charge status if applicable

If invalid:

* reject payment
* preserve traceability
* store rejection reason if possible

---

### Step 4 — Reflect the Result

After approval or rejection, the system should update:

* payment status
* resident-visible history
* audit trail
* related balances

---

## Expected Assistant Guidance

The assistant should explain:

* that approval is a controlled review process
* that reported is not the same as approved
* that proof validation matters
* that approval affects balances and history

---

## Common Failure Cases

* approving the wrong payment
* approving without checking proof
* rejecting without reason
* inconsistent link between payment and charges
* cross-tenant access risk

---

## Safe Suggestions

The assistant may suggest:

* review payment details
* inspect proof
* verify charge linkage
* approve if validated
* reject if inconsistent

---
