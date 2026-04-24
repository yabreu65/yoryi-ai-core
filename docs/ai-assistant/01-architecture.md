# AI Assistant — Architecture

## 🧱 High-Level Overview

The AI Assistant is designed as a **modular, reusable intelligence layer** that integrates into multiple SaaS applications through a clean and decoupled architecture.

### System Flow

Frontend (SaaS)
→ AI Assistant API (NestJS)
→ Core Engine (Reusable)
→ SaaS Adapter
→ Knowledge Layer (RAG)
→ LLM Provider

---

## 🧩 Core Architectural Layers

### 1. AI Core (Reusable Engine)

The central orchestration layer responsible for:

* Handling user messages
* Resolving context
* Coordinating retrieval (RAG)
* Building prompts
* Calling the LLM
* Formatting responses
* Logging interactions

#### Responsibilities

* Stateless execution per request
* Delegation to adapters and RAG
* Output normalization
* Traceability

---

### 2. Adapters (Per SaaS)

Adapters encapsulate all **SaaS-specific logic**.

Each SaaS must implement its own adapter.

#### Responsibilities

* Resolve runtime context
* Map routes → modules
* Provide roles and permissions
* Define available actions
* Scope knowledge retrieval

#### Key Rule

> The AI Core must NEVER depend directly on SaaS code.

---

### 3. Knowledge Layer (RAG)

Structured knowledge base used for accurate, grounded responses.

#### Components

* Documents (modules, flows, FAQs)
* Chunking system
* Embeddings
* Vector storage
* Retrieval engine
* Re-ranking

#### Capabilities

* Semantic search
* Metadata filtering (by app, module, role)
* Hybrid retrieval (optional future)

---

### 4. Memory Layer

Short-term conversational memory.

#### Responsibilities

* Store recent messages
* Provide conversation continuity
* Summarize context if needed

#### Scope (V1)

* Session-based only
* No long-term personalization

---

### 5. Prompt Layer

Centralized prompt management.

#### Structure

* Base system prompt
* App-specific prompt
* Role-specific prompt
* Task-specific prompt

#### Goal

* Avoid prompt chaos
* Enable controlled evolution

---

### 6. Actions Layer

Defines safe, executable actions suggested by the assistant.

#### Examples

* Navigate to module
* Open specific entity
* Pre-fill forms
* Suggest workflows

#### Constraints

* No destructive actions in V1
* All actions must be validated

---

### 7. Observability Layer

Tracks everything the assistant does.

#### Metrics

* Questions asked
* Response quality
* Retrieval hits
* Latency
* User feedback
* Errors / hallucinations

#### Purpose

* Improve assistant performance
* Detect product friction
* Enable insights generation

---

## 🗂️ Monorepo Structure

Recommended structure:

```bash
apps/
  buildingos-web/
  jurismanager-web/
  ai-assistant-api/

packages/
  ai-core/
  ai-rag/
  ai-memory/
  ai-prompts/
  ai-adapters/
  ai-ui/
  ai-types/
  ai-actions/
  ai-observability/

knowledge/
  buildingos/
  jurismanager/

tools/
  knowledge-indexer/
  embedding-worker/

docs/
  ai-assistant/
```

---

## 🔄 Request Lifecycle

### Step 1 — Request

Frontend sends:

* message
* appId
* tenantId
* userId
* role
* route
* module (optional)

---

### Step 2 — Context Resolution

Adapter enriches:

* current module
* permissions
* entity context

---

### Step 3 — Retrieval (RAG)

System retrieves relevant knowledge:

* filtered by app
* filtered by module
* filtered by role
* filtered by metadata

---

### Step 4 — Prompt Construction

Prompt includes:

* system prompt
* app context
* retrieved knowledge
* conversation memory

---

### Step 5 — LLM Execution

LLM generates response using:

* structured context
* constrained instructions

---

### Step 6 — Response Handling

System:

* formats response
* attaches suggested actions
* logs metadata

---

### Step 7 — Observability

System stores:

* input
* output
* used knowledge chunks
* latency
* feedback

---

## 🧾 Data Model (Core Tables)

### assistant_sessions

* id
* app_id
* tenant_id
* user_id
* status
* timestamps

### assistant_messages

* id
* session_id
* role
* content
* metadata

### knowledge_documents

* id
* app_id
* source
* module
* role_scope

### knowledge_chunks

* id
* document_id
* content
* embedding
* metadata

### assistant_feedback

* id
* message_id
* rating
* comment

### assistant_insights

* id
* app_id
* type
* description
* evidence

---

## 🧠 Vector Storage Strategy

### Recommended (V1)

PostgreSQL + pgvector

#### Advantages

* Simplicity
* No extra infrastructure
* Native integration with existing stack

---

### Future Option

Dedicated vector database (if scaling requires)

---

## 🧩 API Design

### POST /assistant/chat

Handles user interaction.

### POST /assistant/feedback

Stores response evaluation.

### GET /assistant/suggestions

Provides contextual suggestions.

### GET /assistant/insights

Returns system-generated insights.

---

## 🎨 UI Layer (Reusable)

The assistant UI must be:

* Embeddable in any SaaS
* Context-aware
* Stateless (controlled by API)

#### Components

* AssistantWidget
* AssistantPanel
* MessageList
* Composer
* Suggestions
* Feedback UI

---

## 🔐 Security Model

The system enforces:

* Tenant isolation
* Role-based filtering
* Permission validation
* No cross-tenant leakage
* No unauthorized actions

---

## ⚠️ Critical Rules

1. Core must remain SaaS-agnostic
2. Adapters isolate business logic
3. Knowledge is scoped and filtered
4. No blind responses without context
5. Observability is mandatory

---

## 🧱 Design Philosophy

This system is built as:

* A **platform capability**, not a feature
* A **reusable engine**, not a one-off implementation
* A **controlled intelligence layer**, not a free-form AI

---

## 🚀 Outcome

This architecture enables:

* Multi-SaaS reuse
* Scalable AI integration
* Controlled evolution
* Data-driven product improvements

---

## 🧠 Final Principle

> Intelligence without structure becomes chaos.
> Structure without intelligence becomes rigid.

This system is designed to balance both.

---
