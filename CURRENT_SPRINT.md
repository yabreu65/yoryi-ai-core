# CURRENT_SPRINT.md

## Sprint Focus

**Improve knowledge retrieval and contextual assistant responses for BuildingOS.**

---

## Scope

This sprint focuses on BuildingOS as the concrete SaaS case, but the rules learned here apply to future SaaS integrations without making them global.

### In Scope

- Improving knowledge retrieval quality (relevance, filtering, summarization)
- Enhancing contextual responses based on runtime context
- Refining BuildingOS adapter context resolution
- Enriching knowledge documents (modules, FAQ, flows)
- Improving tenant isolation enforcement in responses

### Out of Scope

- Semantic search / embeddings (Phase 2)
- Safe action execution (Phase 3)
- Multi-SaaS orchestration (Phase 4)
- Building features outside the assistant

---

## Goals

1. **Better retrieval** — knowledge documents matched more accurately to user questions and context
2. **Better answers** — responses that directly address the user's question with relevant context
3. **Clearer suggestions** — actionable next steps based on role and permissions
4. **Safer operation** — tenant isolation always enforced, no cross-tenant leakage

---

## Definition of Done

- [ ] Knowledge retrieval returns more relevant documents for module-scoped questions
- [ ] Responses include direct answers with knowledge-backed summaries when available
- [ ] Adapter resolves `currentModule` and `permissions` correctly for BuildingOS routes
- [ ] Tenant isolation is verified in all code paths
- [ ] No hardcoded BuildingOS logic in `ai-core`
- [ ] BuildingOS-specific knowledge remains in `knowledge/buildingos/`
- [ ] Unit tests pass for core services

---

## Notes

This sprint works with BuildingOS as the concrete case, but the patterns established here:

- Are designed to be reusable across adapters
- Do NOT create global rules for other SaaS products
- Stay within the adapter/core separation defined in `AGENTS.md`

Future adapters (JurisManager, etc.) will define their own roles, permissions, modules, and knowledge.

---

## Related Files

- `AGENTS.md` — architecture principles
- `PROJECT_CONTEXT.md` — system overview
- `TASKS.md` — task breakdown
- `DECISIONS.md` — key decisions