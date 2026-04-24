"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const knowledge_service_1 = require("./knowledge.service");
const ranking_strategy_1 = require("./ranking-strategy");
(0, vitest_1.describe)("KnowledgeService - extraction and scoring", () => {
    let knowledgeService;
    (0, vitest_1.beforeEach)(() => {
        knowledgeService = new knowledge_service_1.KnowledgeService("../../knowledge");
    });
    (0, vitest_1.describe)("extractQuestionKeywords", () => {
        (0, vitest_1.it)("should extract keywords from normal question", () => {
            const service = knowledgeService;
            const result = service.extractQuestionKeywords("How do I generate monthly charges?");
            (0, vitest_1.expect)(result).toEqual(["generate", "monthly", "charges"]);
        });
        (0, vitest_1.it)("should return empty array when question is undefined", () => {
            const service = knowledgeService;
            const result = service.extractQuestionKeywords(undefined);
            (0, vitest_1.expect)(result).toEqual([]);
        });
        (0, vitest_1.it)("should return empty array when keywords are shorter than 4 chars", () => {
            const service = knowledgeService;
            const result = service.extractQuestionKeywords("How to do it");
            (0, vitest_1.expect)(result).toEqual([]);
        });
        (0, vitest_1.it)("should handle special characters and punctuation", () => {
            const service = knowledgeService;
            const result = service.extractQuestionKeywords("Can I generate charges? Yes/No!@#$");
            (0, vitest_1.expect)(result).toEqual(["generate", "charges"]);
        });
    });
    (0, vitest_1.describe)("buildScoreTrace", () => {
        (0, vitest_1.it)("should return positive score when module matches filename", () => {
            const service = knowledgeService;
            const result = service.buildScoreTrace("payments-faq.md", [], "payments", undefined, undefined, undefined);
            (0, vitest_1.expect)(result.totalScore).toBeGreaterThan(0);
        });
        (0, vitest_1.it)("should return positive score when keywords match filename", () => {
            const service = knowledgeService;
            const result = service.buildScoreTrace("approve-payment.md", ["approve", "payment"], undefined, undefined, undefined);
            (0, vitest_1.expect)(result.totalScore).toBeGreaterThan(0);
        });
        (0, vitest_1.it)("should return zero when no match", () => {
            const service = knowledgeService;
            const result = service.buildScoreTrace("random-file.md", ["foo", "bar"], "xyz", undefined, undefined, undefined);
            (0, vitest_1.expect)(result.totalScore).toBe(0);
        });
        (0, vitest_1.it)("should handle tie between files when scores equal", () => {
            const service = knowledgeService;
            const score1 = service.buildScoreTrace("test.md", ["test"], undefined, undefined, undefined).totalScore;
            const score2 = service.buildScoreTrace("test-file.md", ["test"], undefined, undefined, undefined).totalScore;
            (0, vitest_1.expect)(score1).toBe(score2);
        });
        (0, vitest_1.it)("should return score based on module only when keywords are empty", () => {
            const service = knowledgeService;
            const result = service.buildScoreTrace("charges.md", [], "charges", undefined, undefined, undefined);
            (0, vitest_1.expect)(result.totalScore).toBeGreaterThan(0);
        });
        (0, vitest_1.it)("should add bonus score when unitOccupantRole matches filename", () => {
            const service = knowledgeService;
            const baseScore = service.buildScoreTrace("resident-faq.md", [], "charges", undefined, undefined, undefined).totalScore;
            const withOccupant = service.buildScoreTrace("resident-faq.md", [], "charges", undefined, "RESIDENT", undefined).totalScore;
            (0, vitest_1.expect)(withOccupant).toBeGreaterThan(baseScore);
        });
        (0, vitest_1.it)("should not affect score when unitOccupantRole does not match filename", () => {
            const service = knowledgeService;
            const baseScore = service.buildScoreTrace("charges-faq.md", [], "charges", undefined, undefined, undefined).totalScore;
            const withOccupant = service.buildScoreTrace("charges-faq.md", [], "charges", undefined, "OWNER", undefined).totalScore;
            (0, vitest_1.expect)(withOccupant).toBe(baseScore);
        });
        (0, vitest_1.it)("should work with undefined unitOccupantRole (backward compatibility)", () => {
            const service = knowledgeService;
            const baseScore = service.buildScoreTrace("payments-faq.md", [], "payments", undefined, undefined, undefined).totalScore;
            const withUndefined = service.buildScoreTrace("payments-faq.md", [], "payments", undefined, undefined, undefined).totalScore;
            (0, vitest_1.expect)(withUndefined).toBe(baseScore);
        });
        (0, vitest_1.it)("should work without metadata (backward compatibility)", () => {
            const service = knowledgeService;
            const scoreWithModule = service.buildScoreTrace("charges-faq.md", ["billing"], "charges", undefined, undefined, undefined);
            (0, vitest_1.expect)(scoreWithModule.totalScore).toBeGreaterThan(0);
        });
        (0, vitest_1.it)("should use metadata tags for scoring when available", () => {
            const service = knowledgeService;
            const withMetadata = service.buildScoreTrace("charges-faq.md", ["billing"], "charges", undefined, undefined, { type: "faq", appId: "buildingos", tags: ["billing", "charges", "payments"] });
            const withoutMetadata = service.buildScoreTrace("charges-faq.md", ["billing"], "charges", undefined, undefined, undefined);
            (0, vitest_1.expect)(withMetadata.totalScore).toBeGreaterThan(withoutMetadata.totalScore);
        });
    });
    (0, vitest_1.describe)("retrievalTrace structure", () => {
        (0, vitest_1.it)("should include all trace fields when metadata provided", () => {
            const service = knowledgeService;
            const trace = service.buildScoreTrace("charges-faq.md", ["billing"], "charges", "TENANT_ADMIN", "OWNER", { type: "faq", appId: "buildingos", module: "charges", tags: ["billing", "charges"], occupantScope: ["OWNER", "RESIDENT"], roleScope: ["TENANT_ADMIN"] });
            (0, vitest_1.expect)(trace.totalScore).toBeGreaterThan(0);
            (0, vitest_1.expect)(trace.matchedModule).toBe(true);
            (0, vitest_1.expect)(trace.matchedOccupantScope).toBe(true);
            (0, vitest_1.expect)(trace.matchedTags.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)("should have empty arrays when no metadata", () => {
            const service = knowledgeService;
            const trace = service.buildScoreTrace("charges-faq.md", [], "charges", undefined, undefined, undefined);
            (0, vitest_1.expect)(trace.matchedModule).toBe(false);
            (0, vitest_1.expect)(trace.matchedOccupantScope).toBe(false);
            (0, vitest_1.expect)(trace.matchedTags).toEqual([]);
            (0, vitest_1.expect)(trace.matchedKeywords).toEqual([]);
        });
        (0, vitest_1.it)("should set matchedRoleScope when metadata has roleScope", () => {
            const service = knowledgeService;
            const trace = service.buildScoreTrace("charges-faq.md", [], "charges", "TENANT_ADMIN", undefined, { type: "faq", appId: "buildingos", roleScope: ["TENANT_ADMIN"] });
            (0, vitest_1.expect)(trace.matchedRoleScope).toBe(true);
        });
        (0, vitest_1.it)("should preserve score backward compatibility", () => {
            const service = knowledgeService;
            const result = service.buildScoreTrace("payments-faq.md", [], "payments");
            (0, vitest_1.expect)(result.totalScore).toBe(3);
        });
        (0, vitest_1.it)("should decompose score into components", () => {
            const service = knowledgeService;
            const trace = service.buildScoreTrace("charges-faq.md", ["charges"], "charges", "TENANT_ADMIN", "OWNER", { type: "faq", appId: "buildingos", module: "charges", tags: ["billing", "charges"], occupantScope: ["OWNER", "RESIDENT"], roleScope: ["TENANT_ADMIN"] });
            (0, vitest_1.expect)(trace.moduleScore).toBeGreaterThan(0);
            (0, vitest_1.expect)(trace.keywordScore).toBeGreaterThan(0);
            (0, vitest_1.expect)(trace.tagScore).toBeGreaterThan(0);
            (0, vitest_1.expect)(trace.occupantScore).toBeGreaterThan(0);
            (0, vitest_1.expect)(trace.roleScopeScore).toBe(0);
            const expectedTotal = trace.moduleScore + trace.keywordScore + trace.tagScore + trace.occupantScore + trace.roleScopeScore;
            (0, vitest_1.expect)(trace.totalScore).toBe(expectedTotal);
        });
        (0, vitest_1.it)("should have zero components when no context matches", () => {
            const service = knowledgeService;
            const trace = service.buildScoreTrace("random-file.md", ["foo"], "random-module", "USER", "GUEST", { type: "faq", appId: "buildingos", tags: ["other"] });
            (0, vitest_1.expect)(trace.moduleScore).toBe(0);
            (0, vitest_1.expect)(trace.keywordScore).toBe(0);
            (0, vitest_1.expect)(trace.tagScore).toBe(0);
            (0, vitest_1.expect)(trace.occupantScore).toBe(0);
            (0, vitest_1.expect)(trace.totalScore).toBe(0);
        });
        (0, vitest_1.it)("should include rankingVersion in trace", () => {
            const service = knowledgeService;
            const trace = service.buildScoreTrace("charges-faq.md", ["charges"], "charges", "TENANT_ADMIN", "OWNER", { type: "faq", appId: "buildingos", module: "charges", tags: ["billing", "charges"], occupantScope: ["OWNER", "RESIDENT"], roleScope: ["TENANT_ADMIN"] });
            (0, vitest_1.expect)(trace.rankingVersion).toBe("v1");
        });
        (0, vitest_1.it)("should preserve ranking order after adding rankingVersion", () => {
            const service = knowledgeService;
            const trace1 = service.buildScoreTrace("charges-faq.md", ["charges"], "charges", "TENANT_ADMIN", undefined, { type: "faq", appId: "buildingos" });
            const trace2 = service.buildScoreTrace("payments-faq.md", [], "payments");
            (0, vitest_1.expect)(trace1.rankingVersion).toBe("v1");
            (0, vitest_1.expect)(trace2.rankingVersion).toBe("v1");
            (0, vitest_1.expect)(trace1.totalScore).toBeGreaterThan(0);
            (0, vitest_1.expect)(trace2.totalScore).toBeGreaterThan(0);
        });
        (0, vitest_1.it)("should align rankingVersion with active strategy", () => {
            const custom = new knowledge_service_1.KnowledgeService("../../knowledge", {
                version: "v-custom",
                strategyId: "custom-strategy",
                weights: {
                    module: 1,
                    keyword: 1,
                    tag: 0.5,
                    occupant: 1,
                    roleScope: 0,
                },
            });
            const trace = custom.buildScoreTrace("charges-faq.md", ["charges"], "charges");
            (0, vitest_1.expect)(trace.rankingVersion).toBe("v-custom");
            (0, vitest_1.expect)(trace.strategyId).toBe("custom-strategy");
        });
        (0, vitest_1.it)("should apply strategy weights without changing default behavior", () => {
            const serviceDefault = new knowledge_service_1.KnowledgeService("../../knowledge");
            const serviceExplicitV1 = new knowledge_service_1.KnowledgeService("../../knowledge", ranking_strategy_1.RankingStrategyV1);
            const traceDefault = serviceDefault.buildScoreTrace("charges-faq.md", ["charges"], "charges");
            const traceV1 = serviceExplicitV1.buildScoreTrace("charges-faq.md", ["charges"], "charges");
            (0, vitest_1.expect)(traceDefault.totalScore).toBe(traceV1.totalScore);
            (0, vitest_1.expect)(traceDefault.rankingVersion).toBe(traceV1.rankingVersion);
        });
    });
    (0, vitest_1.describe)("hybrid semantic retrieval", () => {
        (0, vitest_1.it)("uses semantic retriever when RAG is enabled and has hits", async () => {
            process.env.RAG_ENABLED = "true";
            const semanticRetriever = {
                retrieve: async () => [
                    {
                        sourceType: "faq",
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
            const service = new knowledge_service_1.KnowledgeService("../../knowledge", undefined, semanticRetriever);
            const result = await service.getKnowledgeBundle({
                appId: "buildingos",
                module: "charges",
                role: "RESIDENT",
                question: "¿cómo reviso mis cargos?",
            });
            (0, vitest_1.expect)(result).toHaveLength(1);
            (0, vitest_1.expect)(result[0]?.content).toContain("Resultado semántico");
            (0, vitest_1.expect)(result[0]?.retrievalTrace?.semanticScore).toBe(0.91);
            delete process.env.RAG_ENABLED;
        });
        (0, vitest_1.it)("falls back to markdown retrieval when semantic retriever has no hits", async () => {
            process.env.RAG_ENABLED = "true";
            const semanticRetriever = {
                retrieve: async () => [],
            };
            const service = new knowledge_service_1.KnowledgeService("../../knowledge", undefined, semanticRetriever);
            const result = await service.getKnowledgeBundle({
                appId: "buildingos",
                module: "charges",
                role: "RESIDENT",
                question: "consulta sin match semántico",
            });
            (0, vitest_1.expect)(result.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.some((doc) => doc.type === "module")).toBe(true);
            delete process.env.RAG_ENABLED;
        });
    });
});
