"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const contextual_actions_1 = require("./contextual-actions");
(0, vitest_1.describe)("contextual-actions", () => {
    (0, vitest_1.describe)("isProactiveQuestion", () => {
        (0, vitest_1.it)("should detect common help phrases in English", () => {
            (0, vitest_1.expect)((0, contextual_actions_1.isProactiveQuestion)("help")).toBe(true);
            (0, vitest_1.expect)((0, contextual_actions_1.isProactiveQuestion)("help me")).toBe(true);
            (0, vitest_1.expect)((0, contextual_actions_1.isProactiveQuestion)("what can i do")).toBe(true);
            (0, vitest_1.expect)((0, contextual_actions_1.isProactiveQuestion)("what can i do here")).toBe(true);
            (0, vitest_1.expect)((0, contextual_actions_1.isProactiveQuestion)("i'm lost")).toBe(true);
            (0, vitest_1.expect)((0, contextual_actions_1.isProactiveQuestion)("what's pending")).toBe(true);
        });
        (0, vitest_1.it)("should detect common help phrases in Spanish", () => {
            (0, vitest_1.expect)((0, contextual_actions_1.isProactiveQuestion)("ayuda")).toBe(true);
            (0, vitest_1.expect)((0, contextual_actions_1.isProactiveQuestion)("que puedo hacer")).toBe(true);
            (0, vitest_1.expect)((0, contextual_actions_1.isProactiveQuestion)("estoy perdido")).toBe(true);
        });
        (0, vitest_1.it)("should return false for normal questions", () => {
            (0, vitest_1.expect)((0, contextual_actions_1.isProactiveQuestion)("where is my balance")).toBe(false);
            (0, vitest_1.expect)((0, contextual_actions_1.isProactiveQuestion)("how do I pay")).toBe(false);
        });
    });
    (0, vitest_1.describe)("detectModuleFromQuestion", () => {
        (0, vitest_1.it)("should detect tickets module", () => {
            (0, vitest_1.expect)((0, contextual_actions_1.detectModuleFromQuestion)("how do I create a ticket")).toBe("tickets");
            (0, vitest_1.expect)((0, contextual_actions_1.detectModuleFromQuestion)("I need support")).toBe("tickets");
            (0, vitest_1.expect)((0, contextual_actions_1.detectModuleFromQuestion)("problema con mi unidad")).toBe("tickets");
        });
        (0, vitest_1.it)("should detect payments module", () => {
            (0, vitest_1.expect)((0, contextual_actions_1.detectModuleFromQuestion)("where is my balance")).toBe("payments");
            (0, vitest_1.expect)((0, contextual_actions_1.detectModuleFromQuestion)("how do I pay")).toBe("payments");
            (0, vitest_1.expect)((0, contextual_actions_1.detectModuleFromQuestion)("mi saldo")).toBe("payments");
        });
        (0, vitest_1.it)("should detect communications module", () => {
            (0, vitest_1.expect)((0, contextual_actions_1.detectModuleFromQuestion)("any announcements")).toBe("communications");
            (0, vitest_1.expect)((0, contextual_actions_1.detectModuleFromQuestion)("comunicados del edificio")).toBe("communications");
        });
        (0, vitest_1.it)("should detect documents module", () => {
            (0, vitest_1.expect)((0, contextual_actions_1.detectModuleFromQuestion)("where are the rules")).toBe("documents");
            (0, vitest_1.expect)((0, contextual_actions_1.detectModuleFromQuestion)("busco el reglamento")).toBe("documents");
        });
        (0, vitest_1.it)("should return null for generic questions", () => {
            (0, vitest_1.expect)((0, contextual_actions_1.detectModuleFromQuestion)("hello")).toBe(null);
            (0, vitest_1.expect)((0, contextual_actions_1.detectModuleFromQuestion)("thanks")).toBe(null);
        });
    });
    (0, vitest_1.describe)("prioritizeActionsByContext", () => {
        const mockActions = [
            { key: "open-buildings", label: "Open Buildings" },
            { key: "view-my-balance", label: "View My Balance" },
            { key: "create-ticket", label: "Create Ticket" },
            { key: "view-my-tickets", label: "View My Tickets" },
        ];
        (0, vitest_1.it)("should prioritize payments actions when question is about payments", () => {
            const hint = { currentModule: "general" };
            const result = (0, contextual_actions_1.prioritizeActionsByContext)(mockActions, hint, "where is my balance");
            (0, vitest_1.expect)(result[0]?.key).toBe("view-my-balance");
        });
        (0, vitest_1.it)("should prioritize tickets actions when question is about tickets", () => {
            const hint = { currentModule: "general" };
            const result = (0, contextual_actions_1.prioritizeActionsByContext)(mockActions, hint, "create a ticket");
            (0, vitest_1.expect)(result[0]?.key).toBe("create-ticket");
        });
        (0, vitest_1.it)("should use context module when question is generic", () => {
            const hint = { currentModule: "tickets" };
            const result = (0, contextual_actions_1.prioritizeActionsByContext)(mockActions, hint, "help me");
            (0, vitest_1.expect)(result[0]?.key).toBe("open-tickets");
        });
    });
    (0, vitest_1.describe)("getProactiveActions", () => {
        const mockActions = [
            { key: "open-buildings", label: "Open Buildings" },
            { key: "view-my-balance", label: "View My Balance" },
            { key: "create-ticket", label: "Create Ticket" },
            { key: "view-my-tickets", label: "View My Tickets" },
            { key: "view-payment-history", label: "View Payment History" },
        ];
        (0, vitest_1.it)("should return contextual actions when in payments context", () => {
            const hint = { currentModule: "payments" };
            const result = (0, contextual_actions_1.getProactiveActions)(mockActions, hint);
            (0, vitest_1.expect)(result[0]?.key).toBe("view-my-balance");
            (0, vitest_1.expect)(result[1]?.key).toBe("view-pending-charges");
        });
        (0, vitest_1.it)("should return general actions when in general context", () => {
            const hint = { currentModule: "general" };
            const result = (0, contextual_actions_1.getProactiveActions)(mockActions, hint);
            (0, vitest_1.expect)(result.length).toBeLessThanOrEqual(5);
        });
    });
    (0, vitest_1.describe)("getContextualFallback", () => {
        (0, vitest_1.it)("should return hint for tickets context", () => {
            const hint = { currentModule: "tickets" };
            const result = (0, contextual_actions_1.getContextualFallback)(hint, "what?");
            (0, vitest_1.expect)(result).toContain("Support");
        });
        (0, vitest_1.it)("should return hint for payments context", () => {
            const hint = { currentModule: "payments" };
            const result = (0, contextual_actions_1.getContextualFallback)(hint, "what?");
            (0, vitest_1.expect)(result).toContain("Finanzas");
        });
        (0, vitest_1.it)("should return null for general context", () => {
            const hint = { currentModule: "general" };
            const result = (0, contextual_actions_1.getContextualFallback)(hint, "what?");
            (0, vitest_1.expect)(result).toBeNull();
        });
    });
    (0, vitest_1.describe)("formatContextualAnswer", () => {
        (0, vitest_1.it)("should prepend module for contextual answer", () => {
            const hint = { currentModule: "payments", role: "RESIDENT" };
            const result = (0, contextual_actions_1.formatContextualAnswer)("Your balance is $100", hint, "what?", true);
            (0, vitest_1.expect)(result).toContain("(Finanzas)");
        });
        (0, vitest_1.it)("should not prepend module for general context", () => {
            const hint = { currentModule: "general" };
            const result = (0, contextual_actions_1.formatContextualAnswer)("Your balance is $100", hint, "what?", true);
            (0, vitest_1.expect)(result).not.toContain("(");
        });
    });
});
