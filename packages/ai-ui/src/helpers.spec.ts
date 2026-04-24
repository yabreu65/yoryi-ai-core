import { describe, expect, it } from "vitest";
import { isConfirmationRequired, normalizeAssistantResponse } from "./helpers";

describe("ai-ui helpers", () => {
  it("normalizes response for UI consumption", () => {
    const normalized = normalizeAssistantResponse({
      answer: "ok",
      answerSource: "knowledge",
      responseType: "summary",
      dataScope: "tenant",
      provenance: { strategy: "knowledge", sources: [{ type: "knowledge", name: "payments-faq.md" }] },
      auditId: "audit-1",
      actions: [{ key: "open-payments", label: "Open Payments" }],
      knowledgeUsed: { found: true, sources: [{ type: "faq", fileName: "payments-faq.md" }] },
      sessionInsights: { interactionCount: 2, repeatedQuestion: true, recentModule: "payments" },
    });

    expect(normalized.answerSource).toBe("knowledge");
    expect(normalized.responseType).toBe("summary");
    expect(normalized.dataScope).toBe("tenant");
    expect(normalized.provenanceStrategy).toBe("knowledge");
    expect(normalized.auditId).toBe("audit-1");
    expect(normalized.actionCount).toBe(1);
    expect(normalized.knowledgeFound).toBe(true);
    expect(normalized.repeatedQuestion).toBe(true);
  });

  it("detects confirmation_required states", () => {
    expect(isConfirmationRequired({ status: "confirmation_required" })).toBe(true);
    expect(isConfirmationRequired({ status: "executed", requiresConfirmation: true })).toBe(true);
    expect(isConfirmationRequired({ status: "executed" })).toBe(false);
  });
});
