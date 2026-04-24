/**
 * Manual Test Checklist - Communications + Documents Phase 3
 * 
 * Run this after deploying to verify the Communications and Documents functionality.
 */

## Test #1: Admin sees all Communications actions

Send via frontend or API:
- message: "How do I send a communication?"
- context: { role: "TENANT_ADMIN", route: "/communications", ... }

Expected in response.actions:
- open-communications
- create-communication
- view-all-communications
- view-my-inbox
- view-notices

## Test #2: Operator sees Communications actions

Send:
- message: "Any updates from administration?"
- context: { role: "OPERATOR", route: "/communications", ... }

Expected:
- open-communications
- create-communication
- view-all-communications
- view-my-inbox
- view-notices

## Test #3: Resident sees limited Communications actions

Send:
- message: "Where can I see announcements?"
- context: { role: "RESIDENT", route: "/resident/inbox", ... }

Expected:
- open-communications
- view-my-inbox
- view-notices
- NO create-communication or view-all-communications (admin-only)

## Test #4: Admin sees all Documents actions

Send:
- message: "Where are the building documents?"
- context: { role: "TENANT_ADMIN", route: "/documents", ... }

Expected in response.actions:
- open-documents
- upload-document
- view-building-documents
- view-rules

## Test #5: Operator sees Documents actions

Send:
- message: "Show me files"
- context: { role: "OPERATOR", route: "/documents", ... }

Expected:
- open-documents
- upload-document
- view-building-documents
- view-rules

## Test #6: Resident sees limited Documents actions

Send:
- message: "Where is the regulation?"
- context: { role: "RESIDENT", route: "/resident/documents", ... }

Expected:
- open-documents
- view-building-documents
- view-rules
- NO upload-document (admin-only)

## Test #7: Module detection for /communications route

Send:
- message: "help with communications"
- context: { role: "TENANT_ADMIN", route: "/communications" }

Expected:
- context.currentModule === "communications"

## Test #8: Module detection for /avisos route

Send:
- message: "any notices?"
- context: { role: "RESIDENT", route: "/avisos" }

Expected:
- context.currentModule === "communications"

## Test #9: Module detection for /documents route

Send:
- message: "show me the rules"
- context: { role: "TENANT_ADMIN", route: "/documents" }

Expected:
- context.currentModule === "documents"

## Test #10: Module detection for /documentos route

Send:
- message: "donde esta el reglamento?"
- context: { role: "RESIDENT", route: "/documentos" }

Expected:
- context.currentModule === "documents"

## Test #11: Specific Communications queries

Send each query and verify answer + actions:
- "Where can I see announcements?" → open-communications action
- "Any updates from administration?" → view-notices action
- "Where are the building notices?" → view-notices action
- "Show me recent communications" → view-all-communications action
- "Open communications" → open-communications action
- "Do I have any messages from management?" → view-my-inbox action

## Test #12: Specific Documents queries

Send each query and verify answer + actions:
- "Where can I see building documents?" → view-building-documents action
- "Where is the regulation?" → view-rules action
- "Show me files" → view-building-documents action
- "Where are the PDFs?" → view-building-documents action
- "Open documents" → open-documents action
- "Can I see the building rules?" → view-rules action

## Validation Commands

# Test Communications via curl:
curl -X POST "http://localhost:4001/api/assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Where can I see announcements?",
    "context": {
      "userId": "user-123",
      "tenantId": "tenant-001",
      "role": "RESIDENT",
      "route": "/resident/inbox"
    }
  }'

# Test Documents via curl:
curl -X POST "http://localhost:4001/api/assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Where is the regulation?",
    "context": {
      "userId": "user-123",
      "tenantId": "tenant-001",
      "role": "RESIDENT",
      "route": "/resident/documents"
    }
  }'

# Response should contain:
# - answer: helpful text about communications or documents
# - actions: array with appropriate actions (role-filtered)