---
type: module
appId: buildingos
module: tickets
roleScope: [TENANT_ADMIN, TENANT_OWNER, OPERATOR, RESIDENT]
occupantScope: [RESIDENT]
tags: [tickets, support, issues, maintenance]
---

# Tickets Module

## Purpose

The Tickets module allows tenants to create, track, and resolve support requests related to the building and units.

Its purpose is to provide a clear workflow for:

* reporting issues
* assigning responsibilities
* tracking resolution progress
* maintaining communication between residents and administrators

---

## Main Responsibilities

### For Administrators (TENANT_ADMIN, OPERATOR)

* view all tickets in the tenant
* create tickets on behalf of residents
* assign tickets to themselves or other operators
* update ticket status (open, in_progress, resolved, closed)
* add internal comments
* communicate with the requester

### For Residents (RESIDENT)

* create new tickets for their assigned unit
* view their own tickets
* add comments to their tickets
* see status updates

---

## Core Concepts

### Ticket

A ticket represents a support request or issue report.

Fields:

* title — brief description
* description — detailed explanation
* category — issue type (plumbing, electrical, common area, noise, etc.)
* priority — urgency level (low, medium, high, urgent)
* status — current state
* assignedTo — operator responsible
* unit — the unit affected
* createdBy — who created the ticket

---

### Status Flow

Recommended states:

1. **open** — newly created, awaiting assignment
2. **in_progress** — assigned and being worked on
3. **resolved** — fixed, awaiting resident confirmation
4. **closed** — confirmed resolved or no response after 7 days
5. **cancelled** — invalid or duplicate

---

### Priority Guidelines

* **urgent** — safety hazards, major leaks, no utilities
* **high** — affects multiple units, accessibility issues
* **medium** — inconveniences, non-critical repairs
* **low** — cosmetic, minor improvements

---

## Typical Workflow

### 1. Resident Creates Ticket

Resident reports an issue with:

* clear title
* description of the problem
* category
* priority (system may adjust based on category)

---

### 2. Operator Reviews

Operator sees the ticket in the queue and:

* reviews the details
* assigns to themselves or another operator
* updates status to in_progress if working on it

---

### 3. Resolution

Operator:

* performs the necessary work
* adds a comment explaining what was done
* changes status to resolved

---

### 4. Confirmation

Resident confirms the issue is resolved:

* status changes to closed
* OR resident doesn't respond → auto-close after 7 days

---

## Business Rules

### Rule 1 — Tenant Isolation

Tickets must always belong to a single tenant.

No ticket listing or creation may access data from another tenant.

---

### Rule 2 — Unit Assignment

A resident can only create tickets for units they are assigned to.

Administrators can create tickets for any unit in their tenant.

---

### Rule 3 — Status Visibility

* Residents see their own tickets
* Administrators see all tenant tickets
* Internal comments are visible only to administrators

---

### Rule 4 — Assignment Authority

Only administrators and operators can assign or re-assign tickets.

---

## Common Questions the Assistant Should Answer

Examples:

* How do I report a plumbing issue?
* What information should I include in a ticket?
* How long does it take to resolve a ticket?
* Can I follow up on my ticket?
* Who can see my ticket?
* How do I know if my ticket was resolved?

---

## Assistant Guidance Rules

When answering about tickets:

* ask for specific details (unit, category, description)
* set correct expectations on resolution time
* stay within role permissions
* recommend including photos if relevant

---

## Expected Safe Suggestions

The assistant may safely suggest:

* Open Tickets module
* Create a new ticket
* View my tickets (for resident)
* View all tickets (for admin)
* Check ticket status

---

## Non-Goals for V1

The assistant should not:

* automatically assign tickets
* change ticket status without authorization
* access internal comments for residents
* suggest bypassing the ticket workflow