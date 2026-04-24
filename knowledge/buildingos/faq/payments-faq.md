---
type: faq
appId: buildingos
module: payments
roleScope: [TENANT_ADMIN, TENANT_OWNER, OPERATOR]
occupantScope: [OWNER, RESIDENT]
tags: [payments, transactions, faq, questions]
---

# Payments FAQ

## Why is a payment still under review?

A payment remains under review when it has been reported by the resident but has not yet been validated by an authorized administrator.

Possible reasons include:

* pending proof validation
* amount mismatch
* missing payment reference
* missing or unclear attachment
* admin has not reviewed it yet

---

## What happens when a payment is approved?

When a payment is approved:

* the payment status changes to approved
* related charges may be marked as paid or partially paid
* balances should be updated
* the action should remain traceable in the audit trail

---

## What happens when a payment is rejected?

When a payment is rejected:

* the payment is marked as rejected
* the balance should not be reduced
* the resident may need to resubmit the payment
* the rejection reason should be stored if possible

---

## Can residents see their payment status?

Yes, they should be able to see the status of their own payments.

Recommended visible statuses:

* reported
* under review
* approved
* rejected

Residents must not see payments belonging to other units or tenants.

---

## Should payments be approved automatically?

Recommended rule for V1:

No.

Payments should be reviewed and approved manually unless there is an explicit and reliable automation rule configured later.

---

## How are payments linked to charges?

Payments are linked to one or more charges or to an account balance derived from charges.

The system should ensure:

* payment consistency
* charge traceability
* accurate balance updates
* tenant isolation

---
