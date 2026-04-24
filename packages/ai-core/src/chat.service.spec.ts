import { describe, it, expect, vi } from "vitest";
import { ChatService } from "./chat.service";
import type { SaasAssistantAdapter, ResolvedAssistantContext } from "@yoryi/ai-types";
import type { KnowledgeDocument } from "./knowledge.service";

describe("ChatService - response building", () => {
  const mockAdapter: SaasAssistantAdapter = {
    appId: "buildingos",
    getModules: vi.fn().mockResolvedValue([]),
    getRoles: vi.fn().mockResolvedValue([]),
    getContext: vi.fn().mockResolvedValue({
      appId: "buildingos",
      userId: "u_123",
      role: "TENANT_ADMIN",
      route: "/tenant/charges",
      currentModule: "charges",
      permissions: ["charges.read", "charges.write"],
    } as ResolvedAssistantContext),
    getKnowledgeScopes: vi.fn().mockResolvedValue([]),
    getAvailableActions: vi.fn().mockResolvedValue([]),
    canAnswer: vi.fn().mockResolvedValue(true),
  };

  const chatService = new ChatService(mockAdapter as any);
  const service = chatService as any;

  describe("detectIntent", () => {
    it("should return workflow for 'how' questions", () => {
      expect(service.detectIntent("How do I generate charges?")).toBe("workflow");
    });

    it("should return workflow for 'steps' questions", () => {
      expect(service.detectIntent("What are the steps?")).toBe("workflow");
    });

    it("should return explanation for 'why' questions", () => {
      expect(service.detectIntent("Why is this happening?")).toBe("explanation");
    });

    it("should return explanation for 'difference' questions", () => {
      expect(service.detectIntent("What is the difference?")).toBe("explanation");
    });

    it("should return permission for 'can' questions", () => {
      expect(service.detectIntent("Can I approve this?")).toBe("permission");
    });

    it("should return permission for 'allowed' questions", () => {
      expect(service.detectIntent("Is it allowed?")).toBe("permission");
    });

    it("should return general when no intent keywords", () => {
      expect(service.detectIntent("Tell me about units")).toBe("general");
    });
  });

  describe("prioritizeDocuments", () => {
    it("should order documents as module > flow > faq > role > policy", () => {
      const docs: KnowledgeDocument[] = [
        { type: "policy", fileName: "tenant-isolation.md", filePath: "/policies/tenant-isolation.md", content: "" },
        { type: "faq", fileName: "charges-faq.md", filePath: "/faq/charges-faq.md", content: "" },
        { type: "module", fileName: "charges.md", filePath: "/modules/charges.md", content: "" },
        { type: "role", fileName: "tenant-admin.md", filePath: "/roles/tenant-admin.md", content: "" },
        { type: "flow", fileName: "generate-monthly-charges.md", filePath: "/flows/generate-monthly-charges.md", content: "" },
      ];

      const result = service.prioritizeDocuments(docs);
      const types = result.map((d: KnowledgeDocument) => d.type);

      expect(types).toEqual(["module", "flow", "faq", "role", "policy"]);
    });
  });

  describe("buildContextualAnswer", () => {
    it("should return fallback when documents array is empty", () => {
      const result = service.buildContextualAnswer({
        question: "test question",
        module: "charges",
        role: "TENANT_ADMIN",
        documents: [],
      });
      expect(result).toContain("No tengo información específica");
    });

    it("should build answer from knowledge bundle", () => {
      const docs: KnowledgeDocument[] = [
        { type: "module", fileName: "charges.md", filePath: "/modules/charges.md", content: "The Charges module allows administrators to manage monthly charges." },
      ];

      const result = service.buildContextualAnswer({
        question: "How do I manage charges?",
        module: "charges",
        role: "TENANT_ADMIN",
        documents: docs,
      });

      expect(result).toContain("módulo charges");
      expect(result).toContain("Verificá los pasos específicos");
    });

    it("should NOT contain hardcoded legacy text", () => {
      const docs: KnowledgeDocument[] = [
        { type: "module", fileName: "units.md", filePath: "/modules/units.md", content: "Units module content here." },
      ];

      const result = service.buildContextualAnswer({
        question: "How do I generate monthly charges?",
        module: "custom-module",
        role: "TENANT_ADMIN",
        documents: docs,
      });

      expect(result).not.toContain("To manage monthly charges");
      expect(result).not.toContain("1. Create or select a billing period");
    });
  });

  describe("buildFallbackAnswer", () => {
    it("should include module hint when provided", () => {
      const result = service.buildFallbackAnswer("test?", "charges");
      expect(result).toContain("módulo charges");
    });

    it("should not include module hint when not provided", () => {
      const result = service.buildFallbackAnswer("test?");
      expect(result).not.toContain("módulo charges");
      expect(result).not.toContain("módulo units");
    });

    it("should include module suggestions for generic fallback", () => {
      const result = service.buildFallbackAnswer("test?");
      expect(result).toContain("Support");
      expect(result).toContain("Finanzas");
    });
  });
});