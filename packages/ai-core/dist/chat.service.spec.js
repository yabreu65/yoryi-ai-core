"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const chat_service_1 = require("./chat.service");
(0, vitest_1.describe)("ChatService - response building", () => {
    const mockAdapter = {
        appId: "buildingos",
        getModules: vitest_1.vi.fn().mockResolvedValue([]),
        getRoles: vitest_1.vi.fn().mockResolvedValue([]),
        getContext: vitest_1.vi.fn().mockResolvedValue({
            appId: "buildingos",
            userId: "u_123",
            role: "TENANT_ADMIN",
            route: "/tenant/charges",
            currentModule: "charges",
            permissions: ["charges.read", "charges.write"],
        }),
        getKnowledgeScopes: vitest_1.vi.fn().mockResolvedValue([]),
        getAvailableActions: vitest_1.vi.fn().mockResolvedValue([]),
        canAnswer: vitest_1.vi.fn().mockResolvedValue(true),
    };
    const chatService = new chat_service_1.ChatService(mockAdapter);
    const service = chatService;
    (0, vitest_1.describe)("detectIntent", () => {
        (0, vitest_1.it)("should return workflow for 'how' questions", () => {
            (0, vitest_1.expect)(service.detectIntent("How do I generate charges?")).toBe("workflow");
        });
        (0, vitest_1.it)("should return workflow for 'steps' questions", () => {
            (0, vitest_1.expect)(service.detectIntent("What are the steps?")).toBe("workflow");
        });
        (0, vitest_1.it)("should return explanation for 'why' questions", () => {
            (0, vitest_1.expect)(service.detectIntent("Why is this happening?")).toBe("explanation");
        });
        (0, vitest_1.it)("should return explanation for 'difference' questions", () => {
            (0, vitest_1.expect)(service.detectIntent("What is the difference?")).toBe("explanation");
        });
        (0, vitest_1.it)("should return permission for 'can' questions", () => {
            (0, vitest_1.expect)(service.detectIntent("Can I approve this?")).toBe("permission");
        });
        (0, vitest_1.it)("should return permission for 'allowed' questions", () => {
            (0, vitest_1.expect)(service.detectIntent("Is it allowed?")).toBe("permission");
        });
        (0, vitest_1.it)("should return general when no intent keywords", () => {
            (0, vitest_1.expect)(service.detectIntent("Tell me about units")).toBe("general");
        });
    });
    (0, vitest_1.describe)("prioritizeDocuments", () => {
        (0, vitest_1.it)("should order documents as module > flow > faq > role > policy", () => {
            const docs = [
                { type: "policy", fileName: "tenant-isolation.md", filePath: "/policies/tenant-isolation.md", content: "" },
                { type: "faq", fileName: "charges-faq.md", filePath: "/faq/charges-faq.md", content: "" },
                { type: "module", fileName: "charges.md", filePath: "/modules/charges.md", content: "" },
                { type: "role", fileName: "tenant-admin.md", filePath: "/roles/tenant-admin.md", content: "" },
                { type: "flow", fileName: "generate-monthly-charges.md", filePath: "/flows/generate-monthly-charges.md", content: "" },
            ];
            const result = service.prioritizeDocuments(docs);
            const types = result.map((d) => d.type);
            (0, vitest_1.expect)(types).toEqual(["module", "flow", "faq", "role", "policy"]);
        });
    });
    (0, vitest_1.describe)("buildContextualAnswer", () => {
        (0, vitest_1.it)("should return fallback when documents array is empty", () => {
            const result = service.buildContextualAnswer({
                question: "test question",
                module: "charges",
                role: "TENANT_ADMIN",
                documents: [],
            });
            (0, vitest_1.expect)(result).toContain("No tengo información específica");
        });
        (0, vitest_1.it)("should build answer from knowledge bundle", () => {
            const docs = [
                { type: "module", fileName: "charges.md", filePath: "/modules/charges.md", content: "The Charges module allows administrators to manage monthly charges." },
            ];
            const result = service.buildContextualAnswer({
                question: "How do I manage charges?",
                module: "charges",
                role: "TENANT_ADMIN",
                documents: docs,
            });
            (0, vitest_1.expect)(result).toContain("módulo charges");
            (0, vitest_1.expect)(result).toContain("Verificá los pasos específicos");
        });
        (0, vitest_1.it)("should NOT contain hardcoded legacy text", () => {
            const docs = [
                { type: "module", fileName: "units.md", filePath: "/modules/units.md", content: "Units module content here." },
            ];
            const result = service.buildContextualAnswer({
                question: "How do I generate monthly charges?",
                module: "custom-module",
                role: "TENANT_ADMIN",
                documents: docs,
            });
            (0, vitest_1.expect)(result).not.toContain("To manage monthly charges");
            (0, vitest_1.expect)(result).not.toContain("1. Create or select a billing period");
        });
    });
    (0, vitest_1.describe)("buildFallbackAnswer", () => {
        (0, vitest_1.it)("should include module hint when provided", () => {
            const result = service.buildFallbackAnswer("test?", "charges");
            (0, vitest_1.expect)(result).toContain("módulo charges");
        });
        (0, vitest_1.it)("should not include module hint when not provided", () => {
            const result = service.buildFallbackAnswer("test?");
            (0, vitest_1.expect)(result).not.toContain("módulo charges");
            (0, vitest_1.expect)(result).not.toContain("módulo units");
        });
        (0, vitest_1.it)("should include module suggestions for generic fallback", () => {
            const result = service.buildFallbackAnswer("test?");
            (0, vitest_1.expect)(result).toContain("Support");
            (0, vitest_1.expect)(result).toContain("Finanzas");
        });
    });
});
