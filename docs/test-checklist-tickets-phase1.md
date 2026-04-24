/**
 * Manual Test Checklist - Tickets Phase 1
 * 
 * Run this after deploying to verify the Tickets functionality.
 */

## Test #1: Admin sees tickets actions

Send via frontend or API:
- message: "How do I report an issue?"
- context: { role: "TENANT_ADMIN", route: "/support", ... }

Expected in response.actions:
- open-tickets (label: "Open Support")
- create-ticket (label: "Create Ticket")  
- review-open-tickets (label: "Review Open Tickets")

## Test #2: Operator sees tickets actions

Send:
- message: "I need to create a support ticket"
- context: { role: "OPERATOR", route: "/support", ... }

Expected:
- open-tickets
- create-ticket
- review-open-tickets

## Test #3: Resident sees tickets actions

Send:
- message: "Where can I see my tickets?"
- context: { role: "RESIDENT", route: "/resident/tickets", ... }

Expected:
- view-my-tickets (label: "View My Tickets")
- NO open-tickets or create-ticket (admin-only)

## Test #4: Module detection for /support route

Send:
- message: "help with support"
- context: { role: "TENANT_ADMIN", route: "/support" }

Expected:
- context.currentModule === "tickets"

## Test #5: Module detection for /tickets route

Send:
- message: "I have a problem"
- context: { role: "TENANT_ADMIN", route: "/tickets" }

Expected:
- context.currentModule === "tickets"

## Test #6: Fallback message for tickets

Send:
- message: "random question not about tickets"
- context: { role: "TENANT_ADMIN", currentModule: "tickets" }

Expected:
- Should NOT crash, returns fallback answer

## Validation Commands

# Test via curl (replace TENANT_ID with actual tenant):
curl -X POST "http://localhost:4001/api/assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I create a ticket?",
    "context": {
      "userId": "user-123",
      "tenantId": "tenant-001",
      "role": "TENANT_ADMIN",
      "route": "/support"
    }
  }'

# Response should contain:
# - answer: text about creating tickets
# - actions: array with ticket actions