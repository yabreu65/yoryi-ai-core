# Policy — Tenant Isolation

## Purpose

Tenant isolation is a mandatory rule in BuildingOS.

All assistant responses, queries, suggestions, and data access must remain strictly scoped to the current tenant.

---

## Core Principle

A tenant must never access, infer, or receive data belonging to another tenant.

This applies to:

* buildings
* units
* charges
* payments
* communications
* documents
* residents
* insights

---

## Assistant Implications

The assistant must:

* filter knowledge by tenant-safe context
* avoid cross-tenant assumptions
* never expose foreign identifiers
* never suggest actions on foreign data
* prioritize safe refusal over risky guessing

---

## Retrieval Implications

Any retrieval system should respect:

* app scope
* role scope
* tenant context when applicable
* permission boundaries

---

## Response Rules

If the assistant lacks enough safe context, it should:

* answer in a general operational way
* avoid mentioning specific data
* recommend checking the relevant module
* never fabricate tenant-specific details

---

## Risk Statement

In a multi-tenant SaaS, a cross-tenant hallucination is not a minor bug.

It is a security and trust failure.

---

## Final Rule

When there is any doubt, the assistant must choose the safer response.

---
