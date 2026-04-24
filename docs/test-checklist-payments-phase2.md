/**
 * Manual Test Checklist - Payments Phase 2
 * 
 * Run this after deploying to verify the Payments functionality.
 */

## Test #1: Admin sees all payment actions

Send via frontend or API:
- message: "How do I manage payments?"
- context: { role: "TENANT_ADMIN", route: "/finanzas", ... }

Expected in response.actions:
- view-all-payments (label: "View All Payments")
- view-payment-history (label: "Payment History")
- report-payment (label: "Report Payment")
- upload-payment-proof (label: "Upload Proof")

## Test #2: Operator sees payment actions

Send:
- message: "Where can I see pending charges?"
- context: { role: "OPERATOR", route: "/finanzas", ... }

Expected:
- view-all-payments
- view-payment-history
- view-pending-charges
- report-payment
- upload-payment-proof
- view-my-balance

## Test #3: Resident sees limited payment actions

Send:
- message: "How do I pay?"
- context: { role: "RESIDENT", route: "/resident/finanzas", ... }

Expected:
- view-my-balance (label: "View My Balance")
- view-pending-charges (label: "View Pending Charges")
- view-payment-history (label: "My Payment History")
- report-payment (label: "Report Payment")
- upload-payment-proof (label: "Upload Payment Proof")
- NO view-all-payments (admin-only)

## Test #4: Module detection for /finanzas route

Send:
- message: "help with finances"
- context: { role: "TENANT_ADMIN", route: "/finanzas" }

Expected:
- context.currentModule === "payments"

## Test #5: Module detection for /resident/finanzas route

Send:
- message: "I need to pay"
- context: { role: "RESIDENT", route: "/resident/finanzas" }

Expected:
- context.currentModule === "payments"

## Test #6: Fallback message for payments

Send:
- message: "random question not about payments"
- context: { role: "TENANT_ADMIN", currentModule: "payments" }

Expected:
- Should NOT crash, returns fallback answer about payments

## Test #7: Specific payment queries

Send each query and verify answer + actions:
- "Where can I see my balance?" → view-my-balance action
- "How do I pay?" → view-pending-charges action
- "Where do I upload payment proof?" → upload-payment-proof action
- "Can I see my payment history?" → view-payment-history action
- "Do I have pending charges?" → view-pending-charges action
- "Open payments" → view-all-payments (admin) / view-pending-charges (resident)
- "I already paid" → report-payment action
- "How do I report a payment?" → report-payment action

## Validation Commands

# Test via curl (replace TENANT_ID with actual tenant):
curl -X POST "http://localhost:4001/api/assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I pay?",
    "context": {
      "userId": "user-123",
      "tenantId": "tenant-001",
      "role": "RESIDENT",
      "route": "/resident/finanzas"
    }
  }'

# Response should contain:
# - answer: text about pending charges
# - actions: array with payment actions (resident filtered)