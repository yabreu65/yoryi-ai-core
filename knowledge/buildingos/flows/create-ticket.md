---
type: flow
appId: buildingos
module: tickets
roleScope: [TENANT_ADMIN, TENANT_OWNER, OPERATOR]
tags: [tickets, workflow, support, issue-reporting]
---

# Create Ticket Flow

## Context

A resident or administrator needs to report an issue or support request.

## Steps

### Step 1: Access Tickets Module

For **administrators/operators**:

- Navigate to Support (tickets) module
- Access: `/${tenantId}/support`

For **residents**:

- Navigate to My Tickets
- Access: `/${tenantId}/resident/tickets`

---

### Step 2: Create New Ticket

Click "New Ticket" or equivalent button.

Fill in the form:

- **Title**: Clear, brief description of the issue
- **Description**: Detailed explanation (what, when, where)
- **Category**: Select appropriate category
  - plumbing
  - electrical
  - common areas
  - noise
  - cleaning
  - security
  - elevators
  - other
- **Priority**: Select urgency level
  - low: cosmetic issues
  - medium: inconveniences
  - high: affecting multiple units
  - urgent: safety hazards

---

### Step 3: Submit

Submit the ticket.

System assigns a ticket ID and confirms creation.

---

## Expected Suggestions

The assistant should suggest these actions:

- `open-tickets` → open Support module
- `create-ticket` → navigate to create form
- `view-my-tickets` → for residents to see their tickets
- `review-open-tickets` → for admins to see pending tickets

---

## Role-Based Suggestions

### Resident (RESIDENT)

Can only create tickets for their assigned unit.

Safe suggestions:

- Open Tickets module → resident tickets page
- Create ticket → new ticket form

### Admin/Operator (TENANT_ADMIN, OPERATOR)

Can see and manage all tickets.

Safe suggestions:

- Open all tickets → Support module
- Review open tickets → Support with open filter
- Create ticket on behalf of resident → new ticket form