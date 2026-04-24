import type { SemanticRetriever } from "@yoryi/ai-types";
import { RankingStrategy } from "./ranking-strategy";
export type KnowledgeLookupInput = {
    appId: string;
    tenantId?: string;
    module?: string;
    role?: string;
    question?: string;
    unitOccupantRole?: "OWNER" | "RESIDENT" | undefined;
};
export type KnowledgeDocument = {
    type: "module" | "faq" | "flow" | "role" | "policy";
    fileName: string;
    filePath: string;
    content: string;
    metadata?: DocumentMetadata | undefined;
    retrievalTrace?: KnowledgeRetrievalTrace | undefined;
};
export type KnowledgeRetrievalTrace = {
    rankingVersion: string;
    strategyId: string;
    semanticScore?: number;
    semanticSourceType?: string;
    moduleScore: number;
    keywordScore: number;
    tagScore: number;
    occupantScore: number;
    roleScopeScore: number;
    totalScore: number;
    matchedModule: boolean;
    matchedRoleScope: boolean;
    matchedOccupantScope: boolean;
    matchedTags: string[];
    matchedKeywords: string[];
};
export type DocumentMetadata = {
    type: string;
    appId: string;
    module?: string;
    role?: string;
    roleScope?: string[];
    occupantScope?: string[];
    tags?: string[];
};
export declare class KnowledgeService {
    private readonly knowledgeBasePath;
    private readonly rankingStrategy;
    private readonly semanticRetriever?;
    constructor(knowledgeBasePath: string, rankingStrategy?: RankingStrategy, semanticRetriever?: SemanticRetriever | undefined);
    getKnowledgeBundle(input: KnowledgeLookupInput): Promise<KnowledgeDocument[]>;
    private getSemanticBundle;
    private mapSemanticResult;
    private coerceMetadata;
    private asString;
    private asStringArray;
    private parseIntSafe;
    private parseFloatSafe;
    private parseFrontmatter;
    private extractContentWithoutFrontmatter;
    private getModuleDocuments;
    private getRoleDocuments;
    private getPolicyDocuments;
    private getFaqDocuments;
    private getFlowDocuments;
    private extractQuestionKeywords;
    private buildScoreTrace;
    private slugify;
}
