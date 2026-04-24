import { describe, it, expect, beforeEach } from "vitest";
import { KnowledgeService } from "./knowledge.service";
import { RankingStrategyV1 } from "./ranking-strategy";

describe("KnowledgeService - extraction and scoring", () => {
  let knowledgeService: KnowledgeService;

  beforeEach(() => {
    knowledgeService = new KnowledgeService("../../knowledge");
  });

  describe("extractQuestionKeywords", () => {
    it("should extract keywords from normal question", () => {
      const service = knowledgeService as any;
      const result = service.extractQuestionKeywords("How do I generate monthly charges?");
      expect(result).toEqual(["generate", "monthly", "charges"]);
    });

    it("should return empty array when question is undefined", () => {
      const service = knowledgeService as any;
      const result = service.extractQuestionKeywords(undefined);
      expect(result).toEqual([]);
    });

    it("should return empty array when keywords are shorter than 4 chars", () => {
      const service = knowledgeService as any;
      const result = service.extractQuestionKeywords("How to do it");
      expect(result).toEqual([]);
    });

    it("should handle special characters and punctuation", () => {
      const service = knowledgeService as any;
      const result = service.extractQuestionKeywords("Can I generate charges? Yes/No!@#$");
      expect(result).toEqual(["generate", "charges"]);
    });
  });

  describe("buildScoreTrace", () => {
    it("should return positive score when module matches filename", () => {
      const service = knowledgeService as any;
      const result = service.buildScoreTrace("payments-faq.md", [], "payments", undefined, undefined, undefined);
      expect(result.totalScore).toBeGreaterThan(0);
    });

    it("should return positive score when keywords match filename", () => {
      const service = knowledgeService as any;
      const result = service.buildScoreTrace("approve-payment.md", ["approve", "payment"], undefined, undefined, undefined);
      expect(result.totalScore).toBeGreaterThan(0);
    });

    it("should return zero when no match", () => {
      const service = knowledgeService as any;
      const result = service.buildScoreTrace("random-file.md", ["foo", "bar"], "xyz", undefined, undefined, undefined);
      expect(result.totalScore).toBe(0);
    });

    it("should handle tie between files when scores equal", () => {
      const service = knowledgeService as any;
      const score1 = service.buildScoreTrace("test.md", ["test"], undefined, undefined, undefined).totalScore;
      const score2 = service.buildScoreTrace("test-file.md", ["test"], undefined, undefined, undefined).totalScore;
      expect(score1).toBe(score2);
    });

    it("should return score based on module only when keywords are empty", () => {
      const service = knowledgeService as any;
      const result = service.buildScoreTrace("charges.md", [], "charges", undefined, undefined, undefined);
      expect(result.totalScore).toBeGreaterThan(0);
    });

    it("should add bonus score when unitOccupantRole matches filename", () => {
      const service = knowledgeService as any;
      const baseScore = service.buildScoreTrace("resident-faq.md", [], "charges", undefined, undefined, undefined).totalScore;
      const withOccupant = service.buildScoreTrace("resident-faq.md", [], "charges", undefined, "RESIDENT", undefined).totalScore;
      expect(withOccupant).toBeGreaterThan(baseScore);
    });

    it("should not affect score when unitOccupantRole does not match filename", () => {
      const service = knowledgeService as any;
      const baseScore = service.buildScoreTrace("charges-faq.md", [], "charges", undefined, undefined, undefined).totalScore;
      const withOccupant = service.buildScoreTrace("charges-faq.md", [], "charges", undefined, "OWNER", undefined).totalScore;
      expect(withOccupant).toBe(baseScore);
    });

    it("should work with undefined unitOccupantRole (backward compatibility)", () => {
      const service = knowledgeService as any;
      const baseScore = service.buildScoreTrace("payments-faq.md", [], "payments", undefined, undefined, undefined).totalScore;
      const withUndefined = service.buildScoreTrace("payments-faq.md", [], "payments", undefined, undefined, undefined).totalScore;
      expect(withUndefined).toBe(baseScore);
    });

    it("should work without metadata (backward compatibility)", () => {
      const service = knowledgeService as any;
      const scoreWithModule = service.buildScoreTrace("charges-faq.md", ["billing"], "charges", undefined, undefined, undefined);
      expect(scoreWithModule.totalScore).toBeGreaterThan(0);
    });

    it("should use metadata tags for scoring when available", () => {
      const service = knowledgeService as any;
      const withMetadata = service.buildScoreTrace(
        "charges-faq.md",
        ["billing"],
        "charges",
        undefined,
        undefined,
        { type: "faq", appId: "buildingos", tags: ["billing", "charges", "payments"] }
      );
      const withoutMetadata = service.buildScoreTrace("charges-faq.md", ["billing"], "charges", undefined, undefined, undefined);
      expect(withMetadata.totalScore).toBeGreaterThan(withoutMetadata.totalScore);
    });
  });

  describe("retrievalTrace structure", () => {
    it("should include all trace fields when metadata provided", () => {
      const service = knowledgeService as any;
      const trace = service.buildScoreTrace(
        "charges-faq.md",
        ["billing"],
        "charges",
        "TENANT_ADMIN",
        "OWNER",
        { type: "faq", appId: "buildingos", module: "charges", tags: ["billing", "charges"], occupantScope: ["OWNER", "RESIDENT"], roleScope: ["TENANT_ADMIN"] }
      );

      expect(trace.totalScore).toBeGreaterThan(0);
      expect(trace.matchedModule).toBe(true);
      expect(trace.matchedOccupantScope).toBe(true);
      expect(trace.matchedTags.length).toBeGreaterThan(0);
    });

    it("should have empty arrays when no metadata", () => {
      const service = knowledgeService as any;
      const trace = service.buildScoreTrace("charges-faq.md", [], "charges", undefined, undefined, undefined);

      expect(trace.matchedModule).toBe(false);
      expect(trace.matchedOccupantScope).toBe(false);
      expect(trace.matchedTags).toEqual([]);
      expect(trace.matchedKeywords).toEqual([]);
    });

    it("should set matchedRoleScope when metadata has roleScope", () => {
      const service = knowledgeService as any;
      const trace = service.buildScoreTrace(
        "charges-faq.md",
        [],
        "charges",
        "TENANT_ADMIN",
        undefined,
        { type: "faq", appId: "buildingos", roleScope: ["TENANT_ADMIN"] }
      );

      expect(trace.matchedRoleScope).toBe(true);
    });

    it("should preserve score backward compatibility", () => {
      const service = knowledgeService as any;
      const result = service.buildScoreTrace("payments-faq.md", [], "payments");
      expect(result.totalScore).toBe(3);
    });

    it("should decompose score into components", () => {
      const service = knowledgeService as any;
      const trace = service.buildScoreTrace(
        "charges-faq.md",
        ["charges"],
        "charges",
        "TENANT_ADMIN",
        "OWNER",
        { type: "faq", appId: "buildingos", module: "charges", tags: ["billing", "charges"], occupantScope: ["OWNER", "RESIDENT"], roleScope: ["TENANT_ADMIN"] }
      );

      expect(trace.moduleScore).toBeGreaterThan(0);
      expect(trace.keywordScore).toBeGreaterThan(0);
      expect(trace.tagScore).toBeGreaterThan(0);
      expect(trace.occupantScore).toBeGreaterThan(0);
      expect(trace.roleScopeScore).toBe(0);
      const expectedTotal = trace.moduleScore + trace.keywordScore + trace.tagScore + trace.occupantScore + trace.roleScopeScore;
      expect(trace.totalScore).toBe(expectedTotal);
    });

    it("should have zero components when no context matches", () => {
      const service = knowledgeService as any;
      const trace = service.buildScoreTrace(
        "random-file.md",
        ["foo"],
        "random-module",
        "USER",
        "GUEST",
        { type: "faq", appId: "buildingos", tags: ["other"] }
      );

      expect(trace.moduleScore).toBe(0);
      expect(trace.keywordScore).toBe(0);
      expect(trace.tagScore).toBe(0);
      expect(trace.occupantScore).toBe(0);
      expect(trace.totalScore).toBe(0);
    });

    it("should include rankingVersion in trace", () => {
      const service = knowledgeService as any;
      const trace = service.buildScoreTrace(
        "charges-faq.md",
        ["charges"],
        "charges",
        "TENANT_ADMIN",
        "OWNER",
        { type: "faq", appId: "buildingos", module: "charges", tags: ["billing", "charges"], occupantScope: ["OWNER", "RESIDENT"], roleScope: ["TENANT_ADMIN"] }
      );

      expect(trace.rankingVersion).toBe("v1");
    });

    it("should preserve ranking order after adding rankingVersion", () => {
      const service = knowledgeService as any;
      const trace1 = service.buildScoreTrace("charges-faq.md", ["charges"], "charges", "TENANT_ADMIN", undefined, { type: "faq", appId: "buildingos" });
      const trace2 = service.buildScoreTrace("payments-faq.md", [], "payments");
      
      expect(trace1.rankingVersion).toBe("v1");
      expect(trace2.rankingVersion).toBe("v1");
      expect(trace1.totalScore).toBeGreaterThan(0);
      expect(trace2.totalScore).toBeGreaterThan(0);
    });

    it("should align rankingVersion with active strategy", () => {
      const custom = new KnowledgeService("../../knowledge", {
        version: "v-custom",
        strategyId: "custom-strategy",
        weights: {
          module: 1,
          keyword: 1,
          tag: 0.5,
          occupant: 1,
          roleScope: 0,
        },
      }) as any;

      const trace = custom.buildScoreTrace("charges-faq.md", ["charges"], "charges");
      expect(trace.rankingVersion).toBe("v-custom");
      expect(trace.strategyId).toBe("custom-strategy");
    });

    it("should apply strategy weights without changing default behavior", () => {
      const serviceDefault = new KnowledgeService("../../knowledge") as any;
      const serviceExplicitV1 = new KnowledgeService("../../knowledge", RankingStrategyV1) as any;

      const traceDefault = serviceDefault.buildScoreTrace("charges-faq.md", ["charges"], "charges");
      const traceV1 = serviceExplicitV1.buildScoreTrace("charges-faq.md", ["charges"], "charges");

      expect(traceDefault.totalScore).toBe(traceV1.totalScore);
      expect(traceDefault.rankingVersion).toBe(traceV1.rankingVersion);
    });
  });

  describe("hybrid semantic retrieval", () => {
    it("uses semantic retriever when RAG is enabled and has hits", async () => {
      process.env.RAG_ENABLED = "true";
      const semanticRetriever = {
        retrieve: async () => [
          {
            sourceType: "faq" as const,
            fileName: "charges-faq.md",
            filePath: "/knowledge/buildingos/faq/charges-faq.md",
            content: "Resultado semántico de cargos.",
            score: 0.91,
            metadata: {
              appId: "buildingos",
              module: "charges",
            },
          },
        ],
      };

      const service = new KnowledgeService(
        "../../knowledge",
        undefined,
        semanticRetriever
      );
      const result = await service.getKnowledgeBundle({
        appId: "buildingos",
        module: "charges",
        role: "RESIDENT",
        question: "¿cómo reviso mis cargos?",
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.content).toContain("Resultado semántico");
      expect(result[0]?.retrievalTrace?.semanticScore).toBe(0.91);
      delete process.env.RAG_ENABLED;
    });

    it("falls back to markdown retrieval when semantic retriever has no hits", async () => {
      process.env.RAG_ENABLED = "true";
      const semanticRetriever = {
        retrieve: async () => [],
      };
      const service = new KnowledgeService(
        "../../knowledge",
        undefined,
        semanticRetriever
      );

      const result = await service.getKnowledgeBundle({
        appId: "buildingos",
        module: "charges",
        role: "RESIDENT",
        question: "consulta sin match semántico",
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result.some((doc) => doc.type === "module")).toBe(true);
      delete process.env.RAG_ENABLED;
    });
  });
});
