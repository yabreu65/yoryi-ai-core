# TASKS.md

## Task List

### T-001: Improve Knowledge Retrieval Quality

**Description:** Enhance the KnowledgeService to return more relevant documents based on the user's question, module context, and role scope. Improve filtering and matching logic.

**Priority:** high

**Status:** todo

**Acceptance Criteria:**
- [ ] KnowledgeService filters by appId, module, and roleScope correctly
- [ ] Retrieval matches documents to question keywords when possible
- [ ] Returns empty array gracefully when no relevant knowledge found
- [ ] No hardcoded SaaS-specific logic in KnowledgeService

---

### T-002: Eliminate Hardcoded Logic from ChatService

**Description:** Remove hardcoded response building logic (if/else by module) from ChatService. Responses should be generated from knowledge documents only, not from conditional statements.

**Priority:** high

**Status:** todo

**Acceptance Criteria:**
- [ ] No hardcoded if/else blocks for modules in ChatService
- [ ] Responses built purely from knowledge retrieval
- [ ] Fallback response when no knowledge available
- [ ] Core remains SaaS-agnostic

---

### T-003: Enrich BuildingOS Knowledge Documents

**Description:** Add more comprehensive knowledge documents for BuildingOS modules, flows, and roles. Expand FAQ and flow documentation.

**Priority:** medium

**Status:** todo

**Acceptance Criteria:**
- [ ] Additional FAQ entries for charges, payments, buildings, units
- [ ] Step-by-step flow documentation for common operations
- [ ] Role-specific guidance in knowledge/buildingos/roles/
- [ ] Policies documentation for tenant isolation

---

### T-004: Improve Contextual Responses

**Description:** Refine the response building logic to provide direct, concise answers that address the user's question. Summarize knowledge documents better.

**Priority:** medium

**Status:** todo

**Acceptance Criteria:**
- [ ] Responses directly answer the user's question
- [ ] Knowledge summaries are coherent and concise
- [ ] Context (role, module) reflected in response tone
- [ ] Suggestions available when permissions allow

---

### T-005: Add Unit Tests for Core Services

**Description:** Add unit tests for ChatService and KnowledgeService to ensure retrieval and response logic remain stable.

**Priority:** medium

**Status:** todo

**Acceptance Criteria:**
- [ ] Tests for KnowledgeService.getKnowledgeBundle()
- [ ] Tests for ChatService.handle() with mock adapter
- [ ] Tests for tenant isolation in retrieval
- [ ] Core tests pass in CI

---

## Task Dependencies

- T-001 (retrieval) is a prerequisite for T-004 (responses).
- T-002 (eliminate hardcode) enables T-004.
- T-003 (enrich knowledge) supports T-001 and T-004.

---

## Notes

- All tasks must respect the adapter/core separation
- No hardcoded BuildingOS logic in `ai-core`
- Tenant isolation must be verified in each task
- Tests follow the project's test conventions

---

## Related Files

- `AGENTS.md` — operating guidelines
- `PROJECT_CONTEXT.md` — system overview
- `CURRENT_SPRINT.md` — sprint focus
- `DECISIONS.md` — architectural decisions