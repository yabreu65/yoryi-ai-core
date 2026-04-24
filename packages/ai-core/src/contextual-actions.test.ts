import { describe, it, expect } from "vitest";
import {
  isProactiveQuestion,
  detectModuleFromQuestion,
  prioritizeActionsByContext,
  getProactiveActions,
  getContextualFallback,
  formatContextualAnswer,
} from "./contextual-actions";

describe("contextual-actions", () => {
  describe("isProactiveQuestion", () => {
    it("should detect common help phrases in English", () => {
      expect(isProactiveQuestion("help")).toBe(true);
      expect(isProactiveQuestion("help me")).toBe(true);
      expect(isProactiveQuestion("what can i do")).toBe(true);
      expect(isProactiveQuestion("what can i do here")).toBe(true);
      expect(isProactiveQuestion("i'm lost")).toBe(true);
      expect(isProactiveQuestion("what's pending")).toBe(true);
    });

    it("should detect common help phrases in Spanish", () => {
      expect(isProactiveQuestion("ayuda")).toBe(true);
      expect(isProactiveQuestion("que puedo hacer")).toBe(true);
      expect(isProactiveQuestion("estoy perdido")).toBe(true);
    });

    it("should return false for normal questions", () => {
      expect(isProactiveQuestion("where is my balance")).toBe(false);
      expect(isProactiveQuestion("how do I pay")).toBe(false);
    });
  });

  describe("detectModuleFromQuestion", () => {
    it("should detect tickets module", () => {
      expect(detectModuleFromQuestion("how do I create a ticket")).toBe("tickets");
      expect(detectModuleFromQuestion("I need support")).toBe("tickets");
      expect(detectModuleFromQuestion("problema con mi unidad")).toBe("tickets");
    });

    it("should detect payments module", () => {
      expect(detectModuleFromQuestion("where is my balance")).toBe("payments");
      expect(detectModuleFromQuestion("how do I pay")).toBe("payments");
      expect(detectModuleFromQuestion("mi saldo")).toBe("payments");
    });

    it("should detect communications module", () => {
      expect(detectModuleFromQuestion("any announcements")).toBe("communications");
      expect(detectModuleFromQuestion("comunicados del edificio")).toBe("communications");
    });

    it("should detect documents module", () => {
      expect(detectModuleFromQuestion("where are the rules")).toBe("documents");
      expect(detectModuleFromQuestion("busco el reglamento")).toBe("documents");
    });

    it("should return null for generic questions", () => {
      expect(detectModuleFromQuestion("hello")).toBe(null);
      expect(detectModuleFromQuestion("thanks")).toBe(null);
    });
  });

  describe("prioritizeActionsByContext", () => {
    const mockActions = [
      { key: "open-buildings", label: "Open Buildings" },
      { key: "view-my-balance", label: "View My Balance" },
      { key: "create-ticket", label: "Create Ticket" },
      { key: "view-my-tickets", label: "View My Tickets" },
    ];

    it("should prioritize payments actions when question is about payments", () => {
      const hint = { currentModule: "general" };
      const result = prioritizeActionsByContext(mockActions, hint, "where is my balance");

      expect(result[0]?.key).toBe("view-my-balance");
    });

    it("should prioritize tickets actions when question is about tickets", () => {
      const hint = { currentModule: "general" };
      const result = prioritizeActionsByContext(mockActions, hint, "create a ticket");

      expect(result[0]?.key).toBe("create-ticket");
    });

    it("should use context module when question is generic", () => {
      const hint = { currentModule: "tickets" };
      const result = prioritizeActionsByContext(mockActions, hint, "help me");

      expect(result[0]?.key).toBe("open-tickets");
    });
  });

  describe("getProactiveActions", () => {
    const mockActions = [
      { key: "open-buildings", label: "Open Buildings" },
      { key: "view-my-balance", label: "View My Balance" },
      { key: "create-ticket", label: "Create Ticket" },
      { key: "view-my-tickets", label: "View My Tickets" },
      { key: "view-payment-history", label: "View Payment History" },
    ];

    it("should return contextual actions when in payments context", () => {
      const hint = { currentModule: "payments" };
      const result = getProactiveActions(mockActions, hint);

      expect(result[0]?.key).toBe("view-my-balance");
      expect(result[1]?.key).toBe("view-pending-charges");
    });

    it("should return general actions when in general context", () => {
      const hint = { currentModule: "general" };
      const result = getProactiveActions(mockActions, hint);

      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe("getContextualFallback", () => {
    it("should return hint for tickets context", () => {
      const hint = { currentModule: "tickets" };
      const result = getContextualFallback(hint, "what?");

      expect(result).toContain("Support");
    });

    it("should return hint for payments context", () => {
      const hint = { currentModule: "payments" };
      const result = getContextualFallback(hint, "what?");

      expect(result).toContain("Finanzas");
    });

    it("should return null for general context", () => {
      const hint = { currentModule: "general" };
      const result = getContextualFallback(hint, "what?");

      expect(result).toBeNull();
    });
  });

  describe("formatContextualAnswer", () => {
    it("should prepend module for contextual answer", () => {
      const hint = { currentModule: "payments", role: "RESIDENT" };
      const result = formatContextualAnswer("Your balance is $100", hint, "what?", true);

      expect(result).toContain("(Finanzas)");
    });

    it("should not prepend module for general context", () => {
      const hint = { currentModule: "general" };
      const result = formatContextualAnswer("Your balance is $100", hint, "what?", true);

      expect(result).not.toContain("(");
    });
  });
});