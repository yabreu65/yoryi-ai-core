import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { SemanticRetrievalResult, SemanticRetriever } from "@yoryi/ai-types";
import {
  RankingStrategy,
  RankingStrategyV1,
} from "./ranking-strategy";
import {
  RankingStrategyRegistry,
  defaultRankingStrategyRegistry,
} from "./ranking-strategy-registry";

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

export class KnowledgeService {
  constructor(
    private readonly knowledgeBasePath: string,
    private readonly rankingStrategy: RankingStrategy = defaultRankingStrategyRegistry.getDefaultStrategy(),
    private readonly semanticRetriever?: SemanticRetriever
  ) {}

  async getKnowledgeBundle(input: KnowledgeLookupInput): Promise<KnowledgeDocument[]> {
    if (!input.appId) {
      return [];
    }

    const semanticBundle = await this.getSemanticBundle(input);
    if (semanticBundle.length > 0) {
      return semanticBundle;
    }

    const documents: KnowledgeDocument[] = [];

    documents.push(...this.getModuleDocuments(input.appId, input.module));
    documents.push(...this.getRoleDocuments(input.appId, input.role));
    documents.push(...this.getPolicyDocuments(input.appId));
    documents.push(...this.getFaqDocuments(input.appId, input.module, input.role, input.question, input.unitOccupantRole));
    documents.push(...this.getFlowDocuments(input.appId, input.module, input.role, input.question, input.unitOccupantRole));

    return documents;
  }

  private async getSemanticBundle(
    input: KnowledgeLookupInput
  ): Promise<KnowledgeDocument[]> {
    if (
      !this.semanticRetriever ||
      process.env.RAG_ENABLED !== "true" ||
      !input.question
    ) {
      return [];
    }

    const topK = this.parseIntSafe(process.env.RAG_TOP_K, 5);
    const minScore = this.parseFloatSafe(process.env.RAG_MIN_SCORE, 0.35);

    try {
      const results = await this.semanticRetriever.retrieve({
        appId: input.appId,
        module: input.module,
        role: input.role,
        question: input.question,
        topK,
        minScore,
      });

      return results.map((item) => this.mapSemanticResult(item));
    } catch {
      return [];
    }
  }

  private mapSemanticResult(item: SemanticRetrievalResult): KnowledgeDocument {
    const metadata = this.coerceMetadata(item.metadata);

    return {
      type: item.sourceType,
      fileName: item.fileName,
      filePath: item.filePath,
      content: item.content,
      metadata,
      retrievalTrace: {
        rankingVersion: this.rankingStrategy.version,
        strategyId: this.rankingStrategy.strategyId,
        semanticScore: item.score,
        semanticSourceType: item.sourceType,
        moduleScore: 0,
        keywordScore: 0,
        tagScore: 0,
        occupantScore: 0,
        roleScopeScore: 0,
        totalScore: item.score,
        matchedModule: Boolean(metadata?.module),
        matchedRoleScope: Boolean(metadata?.roleScope),
        matchedOccupantScope: false,
        matchedTags: [],
        matchedKeywords: [],
      },
    };
  }

  private coerceMetadata(
    metadata: Record<string, unknown> | undefined
  ): DocumentMetadata | undefined {
    if (!metadata) {
      return undefined;
    }

    return {
      type: this.asString(metadata.type) ?? "semantic",
      appId: this.asString(metadata.appId) ?? "unknown",
      module: this.asString(metadata.module),
      role: this.asString(metadata.role),
      roleScope: this.asStringArray(metadata.roleScope),
      occupantScope: this.asStringArray(metadata.occupantScope),
      tags: this.asStringArray(metadata.tags),
    };
  }

  private asString(value: unknown): string | undefined {
    if (typeof value !== "string") {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private asStringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }
    const normalized = value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    return normalized.length > 0 ? normalized : undefined;
  }

  private parseIntSafe(value: string | undefined, fallback: number): number {
    if (!value) {
      return fallback;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private parseFloatSafe(value: string | undefined, fallback: number): number {
    if (!value) {
      return fallback;
    }
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private parseFrontmatter(content: string): DocumentMetadata | undefined {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return undefined;
    }

    try {
      const frontmatterContent = match[1] ?? "";
      const metadata: Record<string, unknown> = {};
      const lines = frontmatterContent.split("\n");

      for (const line of lines) {
        const colonIndex = line.indexOf(":");
        if (colonIndex === -1) continue;

        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();

        if (key === "roleScope" || key === "occupantScope" || key === "tags") {
          const bracketMatch = value.match(/\[(.*)\]/);
          if (bracketMatch && bracketMatch[1]) {
            metadata[key] = bracketMatch[1].split(",").map((v) => v.trim());
          } else {
            metadata[key] = [];
          }
        } else {
          metadata[key] = value;
        }
      }

      return metadata as DocumentMetadata;
    } catch {
      return undefined;
    }
  }

  private extractContentWithoutFrontmatter(content: string): string {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
    return content.replace(frontmatterRegex, "").trim();
  }

  private getModuleDocuments(appId: string, module?: string): KnowledgeDocument[] {
    if (!module) return [];

    const filePath = join(
      this.knowledgeBasePath,
      appId,
      "modules",
      `${module}.md`
    );

    if (!existsSync(filePath)) {
      return [];
    }

    const rawContent = readFileSync(filePath, "utf-8");
    const metadata = this.parseFrontmatter(rawContent);
    const content = metadata
      ? this.extractContentWithoutFrontmatter(rawContent)
      : rawContent;

    return [
      {
        type: "module",
        fileName: `${module}.md`,
        filePath,
        content,
        metadata,
        retrievalTrace: {
          rankingVersion: this.rankingStrategy.version,
          strategyId: this.rankingStrategy.strategyId,
          moduleScore: 0,
          keywordScore: 0,
          tagScore: 0,
          occupantScore: 0,
          roleScopeScore: 0,
          totalScore: 0,
          matchedModule: true,
          matchedRoleScope: false,
          matchedOccupantScope: false,
          matchedTags: [],
          matchedKeywords: [],
        },
      },
    ];
  }

  private getRoleDocuments(appId: string, role?: string): KnowledgeDocument[] {
    if (!role) return [];

    const normalizedRole = this.slugify(role);
    const filePath = join(
      this.knowledgeBasePath,
      appId,
      "roles",
      `${normalizedRole}.md`
    );

    if (!existsSync(filePath)) {
      return [];
    }

    const rawContent = readFileSync(filePath, "utf-8");
    const metadata = this.parseFrontmatter(rawContent);
    const content = metadata
      ? this.extractContentWithoutFrontmatter(rawContent)
      : rawContent;

    return [
      {
        type: "role",
        fileName: `${normalizedRole}.md`,
        filePath,
        content,
        metadata,
        retrievalTrace: {
          rankingVersion: this.rankingStrategy.version,
          strategyId: this.rankingStrategy.strategyId,
          moduleScore: 0,
          keywordScore: 0,
          tagScore: 0,
          occupantScore: 0,
          roleScopeScore: 0,
          totalScore: 0,
          matchedModule: false,
          matchedRoleScope: true,
          matchedOccupantScope: false,
          matchedTags: [],
          matchedKeywords: [],
        },
      },
    ];
  }

  private getPolicyDocuments(appId: string): KnowledgeDocument[] {
    const dirPath = join(this.knowledgeBasePath, appId, "policies");

    if (!existsSync(dirPath)) {
      return [];
    }

    const files = readdirSync(dirPath).filter((file) => file.endsWith(".md"));

    return files.map((file) => {
      const filePath = join(dirPath, file);
      const rawContent = readFileSync(filePath, "utf-8");
      const metadata = this.parseFrontmatter(rawContent);
      const content = metadata
        ? this.extractContentWithoutFrontmatter(rawContent)
        : rawContent;

      return {
        type: "policy" as const,
        fileName: file,
        filePath,
        content,
        metadata,
        retrievalTrace: {
          rankingVersion: this.rankingStrategy.version,
          strategyId: this.rankingStrategy.strategyId,
          moduleScore: 0,
          keywordScore: 0,
          tagScore: 0,
          occupantScore: 0,
          roleScopeScore: 0,
          totalScore: 0,
          matchedModule: false,
          matchedRoleScope: false,
          matchedOccupantScope: false,
          matchedTags: [],
          matchedKeywords: [],
        },
      };
    });
  }

  private getFaqDocuments(
    appId: string,
    module?: string,
    role?: string,
    question?: string,
    unitOccupantRole?: "OWNER" | "RESIDENT" | undefined
  ): KnowledgeDocument[] {
    const dirPath = join(this.knowledgeBasePath, appId, "faq");

    if (!existsSync(dirPath)) {
      return [];
    }

    const files = readdirSync(dirPath).filter((file) => file.endsWith(".md"));
    const keywords = this.extractQuestionKeywords(question);

    const scoredFiles = files
      .map((file) => {
        const filePath = join(dirPath, file);
        const rawContent = readFileSync(filePath, "utf-8");
        const metadata = this.parseFrontmatter(rawContent);
        const trace = this.buildScoreTrace(file, keywords, module, role, unitOccupantRole, metadata);

        return {
          file,
          filePath,
          rawContent,
          metadata,
          score: trace.totalScore,
          trace,
        };
      })
      .filter((item) => {
        if (!module && !question) return true;
        return item.score > 0;
      })
      .sort((a, b) => b.score - a.score);

    return scoredFiles.map((item) => {
      const content = item.metadata
        ? this.extractContentWithoutFrontmatter(item.rawContent)
        : item.rawContent;

      return {
        type: "faq" as const,
        fileName: item.file,
        filePath: item.filePath,
        content,
        metadata: item.metadata,
        retrievalTrace: item.trace,
      };
    });
  }

  private getFlowDocuments(
    appId: string,
    module?: string,
    role?: string,
    question?: string,
    unitOccupantRole?: "OWNER" | "RESIDENT" | undefined
  ): KnowledgeDocument[] {
    const dirPath = join(this.knowledgeBasePath, appId, "flows");

    if (!existsSync(dirPath)) {
      return [];
    }

    const files = readdirSync(dirPath).filter((file) => file.endsWith(".md"));
    const keywords = this.extractQuestionKeywords(question);

    const scoredFiles = files
      .map((file) => {
        const filePath = join(dirPath, file);
        const rawContent = readFileSync(filePath, "utf-8");
        const metadata = this.parseFrontmatter(rawContent);
        const trace = this.buildScoreTrace(file, keywords, module, role, unitOccupantRole, metadata);

        return {
          file,
          filePath,
          rawContent,
          metadata,
          score: trace.totalScore,
          trace,
        };
      })
      .filter((item) => {
        if (!module && !question) return true;
        return item.score > 0;
      })
      .sort((a, b) => b.score - a.score);

    return scoredFiles.map((item) => {
      const content = item.metadata
        ? this.extractContentWithoutFrontmatter(item.rawContent)
        : item.rawContent;

      return {
        type: "flow" as const,
        fileName: item.file,
        filePath: item.filePath,
        content,
        metadata: item.metadata,
        retrievalTrace: item.trace,
      };
    });
  }

  private extractQuestionKeywords(question?: string): string[] {
    if (!question) return [];

    const normalized = question
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const keywords = normalized.split(" ").filter((word) => word.length >= 4);

    const unique = Array.from(new Set(keywords));
    return unique;
  }

  private buildScoreTrace(
    fileName: string,
    keywords: string[],
    module?: string,
    role?: string,
    unitOccupantRole?: "OWNER" | "RESIDENT" | undefined,
    metadata?: DocumentMetadata
  ): KnowledgeRetrievalTrace {
    const normalizedFile = fileName.toLowerCase().replace(/-/g, " ").replace(/.md$/, "");

    let moduleScore = 0;
    let keywordScore = 0;
    let tagScore = 0;
    let occupantScore = 0;
    let roleScopeScore = 0;

    let matchedModule = false;
    let matchedRoleScope = false;
    let matchedOccupantScope = false;
    const matchedTags: string[] = [];
    const matchedKeywords: string[] = [];

    if (module) {
      const normalizedModule = module.toLowerCase();
      if (normalizedFile.includes(normalizedModule)) {
        moduleScore += 3 * this.rankingStrategy.weights.module;
      }
      if (normalizedModule.includes(normalizedFile) && normalizedModule.length > 4) {
        moduleScore += 1 * this.rankingStrategy.weights.module;
      }

      if (metadata?.module && metadata.module.toLowerCase() === normalizedModule) {
        moduleScore += 2 * this.rankingStrategy.weights.module;
        matchedModule = true;
      }
    }

    if (keywords.length > 0) {
      let keywordMatches = 0;
      const primaryKeyword = keywords[0];

      for (const keyword of keywords) {
        if (normalizedFile.includes(keyword)) {
          keywordMatches++;
          matchedKeywords.push(keyword);
        }
      }
      keywordScore += Math.min(keywordMatches, 4) * this.rankingStrategy.weights.keyword;

      if (primaryKeyword && normalizedFile.includes(primaryKeyword)) {
        keywordScore += 2 * this.rankingStrategy.weights.keyword;
      }

      if (metadata?.tags) {
        for (const keyword of keywords) {
          for (const tag of metadata.tags) {
            if (tag.toLowerCase().includes(keyword)) {
              tagScore += this.rankingStrategy.weights.tag;
              if (!matchedTags.includes(tag)) {
                matchedTags.push(tag);
              }
            }
          }
        }
      }
    }

    if (unitOccupantRole) {
      const normalizedRole = unitOccupantRole.toLowerCase();
      if (normalizedFile.includes(normalizedRole)) {
        occupantScore += 1 * this.rankingStrategy.weights.occupant;
      }

      if (metadata?.occupantScope?.length && metadata.occupantScope.includes(unitOccupantRole)) {
        occupantScore += 3 * this.rankingStrategy.weights.occupant;
        matchedOccupantScope = true;
      }
    }

    if (role && metadata?.roleScope?.length) {
      const normalizedRole = role.toUpperCase();
      if (metadata.roleScope.some((rs) => rs.toUpperCase() === normalizedRole)) {
        matchedRoleScope = true;
        roleScopeScore += this.rankingStrategy.weights.roleScope;
      }
    } else if (metadata?.roleScope?.length) {
      matchedRoleScope = true;
      roleScopeScore += this.rankingStrategy.weights.roleScope;
    }

    const totalScore = Math.round(
      (moduleScore + keywordScore + tagScore + occupantScore + roleScopeScore) * 10
    ) / 10;

    return {
      rankingVersion: this.rankingStrategy.version,
      strategyId: this.rankingStrategy.strategyId,
      moduleScore,
      keywordScore,
      tagScore,
      occupantScore,
      roleScopeScore,
      totalScore,
      matchedModule,
      matchedRoleScope,
      matchedOccupantScope,
      matchedTags,
      matchedKeywords,
    };
  }

  private slugify(value: string): string {
    return value.toLowerCase().replace(/_/g, "-");
  }
}
