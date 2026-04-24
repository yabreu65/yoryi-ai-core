---
type: flow
appId: buildingos
module: charges
roleScope: [TENANT_ADMIN, TENANT_OWNER, OPERATOR]
occupantScope: []
tags: [charges, billing, workflow, generate]
---

# Flow — Generate Monthly Charges

## Purpose

Define the recommended operational flow for generating monthly charges in BuildingOS.

---

## Preconditions

Before generating charges, the system should ensure:

* the user is an authorized tenant administrator
* the tenant context is valid
* a billing period exists or is being created
* units are available and active
* billing rules or amounts are defined

---

## Recommended Flow

### Step 1 — Create or Select Billing Period

The administrator selects an existing period or creates a new one.

Typical data:

* month / label
* due date
* notes
* tenant

---

### Step 2 — Validate Units Included

Before generation, the system should confirm:

* which units are included
* which units are excluded
* whether any unit has incomplete configuration

---

### Step 3 — Generate Charges

The system creates charges for the applicable units using configured rules.

Generation may consider:

* unit category
* square meters
* shared expenses
* custom adjustments
* special billing rules

---

### Step 4 — Review Results

The administrator reviews the generated output.

Recommended review points:

* missing units
* duplicated charges
* incorrect totals
* invalid statuses
* unexpected exclusions

---

### Step 5 — Publish Charges

After review, the administrator publishes the billing period.

Publishing should:

* make charges visible to residents
* freeze the period from casual editing
* mark the cycle as official

---

## Expected Assistant Guidance

The assistant should help the user understand:

* the proper order of the flow
* the difference between generation and publication
* the importance of review before publication
* common causes of missing units or invalid charges

---

## Common Failure Cases

* generating charges without a valid period
* publishing without review
* duplicate periods for the same cycle
* units excluded unintentionally
* inconsistent billing rules

---

## Safe Suggestions

The assistant may suggest:

* create a billing period
* review generated charges
* inspect missing units
* verify billing rules
* publish when review is complete

---
