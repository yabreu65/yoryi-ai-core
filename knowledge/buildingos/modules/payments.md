---
type: module
appId: buildingos
module: payments
roleScope: [TENANT_ADMIN, TENANT_OWNER, OPERATOR]
occupantScope: [OWNER, RESIDENT]
tags: [payments, charges, financial, transactions]
---

# Payments Module

## Purpose

The Payments module is responsible for managing the lifecycle of payments made by residents for previously generated charges.

Its purpose is to allow tenant administrators to:

* receive payment reports from residents
* review submitted payment proofs
* approve or reject payments
* maintain a clear and auditable payment history
* update account balances accurately

---

## Main Responsibilities

The module should allow the system to:

* accept payment reports from residents
* store proof of payment (image, transfer reference, etc.)
* validate payments before approval
* update payment status
* reflect payment impact on charges

---

## Core Concepts

### Payment

A payment represents a financial transaction reported by a resident to cover one or more charges.

A payment may include:

* total amount paid
* payment method
* payment reference
* date of payment
* attached proof (optional but recommended)

---

### Payment Status

Payments must go through a controlled lifecycle.

Recommended statuses:

* reported
* under_review
* approved
* rejected

---

### Payment Proof

A payment proof is any evidence provided by the resident.

Examples:

* bank transfer screenshot
* transaction receipt
* payment reference number

---

## Typical Workflow

### 1. Resident Reports Payment

The resident submits a payment report.

Expected data:

* amount
* date
* method
* reference
* optional proof (image/file)

At this stage, the payment is not yet validated.

---

### 2. Payment Under Review

The administrator reviews the reported payment.

The system should allow:

* viewing payment details
* viewing attached proof
* comparing amount vs expected charges
* verifying consistency

---

### 3. Approve or Reject Payment

#### If approved:

* payment is marked as approved
* related charges are updated (paid or partially paid)
* account balance is adjusted

#### If rejected:

* payment is marked as rejected
* optional reason is stored
* resident may be required to resubmit

---

### 4. Payment Reflected in Account

After approval:

* the resident sees updated balance
* payment history is updated
* system maintains audit trail

---

## Business Rules

### Rule 1 — No Automatic Approval

Payments must not be auto-approved unless explicitly configured.

---

### Rule 2 — Tenant Isolation

Payments must always belong to a single tenant.

No cross-tenant access is allowed.

---

### Rule 3 — Traceability

Each payment must store:

* user (resident)
* tenant
* related charges
* timestamps
* status changes
* reviewer (admin)

---

### Rule 4 — Role Restriction

Only authorized users should:

* approve payments
* reject payments
* view full payment data

Residents should only see their own payments.

---

### Rule 5 — Consistency with Charges

Payments must be consistent with:

* generated charges
* published billing periods
* outstanding balances

---

## Recommended UI Responsibilities

The Payments module UI should allow:

* listing all reported payments
* filtering by status
* viewing payment details
* viewing attached proof
* approving or rejecting payments
* tracking payment history

---

## Common Questions the Assistant Should Answer

Examples:

* How do I approve a payment?
* Why is a payment still under review?
* What happens when I reject a payment?
* How do I verify a payment proof?
* Can a resident see their payment status?
* How are payments linked to charges?

---

## Assistant Guidance Rules

When answering about payments, the assistant should:

* explain the payment lifecycle clearly
* distinguish between reported and approved
* avoid approving payments automatically
* emphasize validation before approval
* stay within tenant scope

---

## Expected Safe Suggestions

The assistant may suggest:

* Open Payments module
* Review pending payments
* Inspect payment details
* Verify payment proof
* Approve or reject payment (as suggestion, not execution)

---

## Non-Goals for V1

The assistant should not:

* approve payments automatically
* modify financial records directly
* bypass validation steps
* infer fraud detection rules without configuration

---

## Relationship with Charges

Payments are directly linked to the Charges module.

* Charges define what is owed
* Payments reflect what has been paid

A complete system must ensure:

* consistency between both modules
* accurate balance calculation
* clear visibility for both admins and residents

---

## Summary

The Payments module ensures that financial transactions are:

* properly validated
* correctly recorded
* safely approved
* fully traceable

Its value depends on:

* controlled approval flow
* accurate linkage with charges
* transparency for users
* strict role and tenant isolation

---
