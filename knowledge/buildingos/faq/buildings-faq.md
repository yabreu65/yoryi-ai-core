---
type: faq
appId: buildingos
module: buildings
roleScope: [TENANT_ADMIN, TENANT_OWNER, OPERATOR, RESIDENT]
occupantScope: [OWNER, RESIDENT]
tags: [buildings, properties, faq, questions]
---

# Buildings FAQ

## What data is required to create a building?

Recommended minimum data:

- building name
- internal identifier or code
- address reference
- operational status

Additional metadata can be added later if allowed by policy.

---

## Why can't I see a building in the active list?

Possible reasons:

- the building is inactive
- the building is archived
- filters are hiding the record
- your role lacks visibility permissions

---

## Can I edit a building after creation?

Yes, in most cases.

Typical editable fields include profile and contact metadata. Sensitive changes should remain traceable.

---

## What happens when a building is archived?

Recommended behavior:

- building is excluded from active operational views
- new operational actions may be restricted
- historical data remains traceable for auditability

---

## Should building identifiers be unique?

Recommended rule:

Identifiers should be unique per tenant to reduce confusion and operational errors.

---

## Can a building be moved between tenants?

Recommended rule for multi-tenant safety:

No direct cross-tenant move. Building ownership must remain tenant-scoped to prevent data leakage risks.