"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeService = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const ranking_strategy_registry_1 = require("./ranking-strategy-registry");
class KnowledgeService {
    knowledgeBasePath;
    rankingStrategy;
    semanticRetriever;
    constructor(knowledgeBasePath, rankingStrategy = ranking_strategy_registry_1.defaultRankingStrategyRegistry.getDefaultStrategy(), semanticRetriever) {
        this.knowledgeBasePath = knowledgeBasePath;
        this.rankingStrategy = rankingStrategy;
        this.semanticRetriever = semanticRetriever;
    }
    async getKnowledgeBundle(input) {
        if (!input.appId) {
            return [];
        }
        const semanticBundle = await this.getSemanticBundle(input);
        if (semanticBundle.length > 0) {
            return semanticBundle;
        }
        const documents = [];
        documents.push(...this.getModuleDocuments(input.appId, input.module));
        documents.push(...this.getRoleDocuments(input.appId, input.role));
        documents.push(...this.getPolicyDocuments(input.appId));
        documents.push(...this.getFaqDocuments(input.appId, input.module, input.role, input.question, input.unitOccupantRole));
        documents.push(...this.getFlowDocuments(input.appId, input.module, input.role, input.question, input.unitOccupantRole));
        return documents;
    }
    async getSemanticBundle(input) {
        if (!this.semanticRetriever ||
            process.env.RAG_ENABLED !== "true" ||
            !input.question) {
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
        }
        catch {
            return [];
        }
    }
    mapSemanticResult(item) {
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
    coerceMetadata(metadata) {
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
    asString(value) {
        if (typeof value !== "string") {
            return undefined;
        }
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }
    asStringArray(value) {
        if (!Array.isArray(value)) {
            return undefined;
        }
        const normalized = value
            .filter((entry) => typeof entry === "string")
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0);
        return normalized.length > 0 ? normalized : undefined;
    }
    parseIntSafe(value, fallback) {
        if (!value) {
            return fallback;
        }
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    parseFloatSafe(value, fallback) {
        if (!value) {
            return fallback;
        }
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    parseFrontmatter(content) {
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
        const match = content.match(frontmatterRegex);
        if (!match) {
            return undefined;
        }
        try {
            const frontmatterContent = match[1] ?? "";
            const metadata = {};
            const lines = frontmatterContent.split("\n");
            for (const line of lines) {
                const colonIndex = line.indexOf(":");
                if (colonIndex === -1)
                    continue;
                const key = line.slice(0, colonIndex).trim();
                const value = line.slice(colonIndex + 1).trim();
                if (key === "roleScope" || key === "occupantScope" || key === "tags") {
                    const bracketMatch = value.match(/\[(.*)\]/);
                    if (bracketMatch && bracketMatch[1]) {
                        metadata[key] = bracketMatch[1].split(",").map((v) => v.trim());
                    }
                    else {
                        metadata[key] = [];
                    }
                }
                else {
                    metadata[key] = value;
                }
            }
            return metadata;
        }
        catch {
            return undefined;
        }
    }
    extractContentWithoutFrontmatter(content) {
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
        return content.replace(frontmatterRegex, "").trim();
    }
    getModuleDocuments(appId, module) {
        if (!module)
            return [];
        const filePath = (0, node_path_1.join)(this.knowledgeBasePath, appId, "modules", `${module}.md`);
        if (!(0, node_fs_1.existsSync)(filePath)) {
            return [];
        }
        const rawContent = (0, node_fs_1.readFileSync)(filePath, "utf-8");
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
    getRoleDocuments(appId, role) {
        if (!role)
            return [];
        const normalizedRole = this.slugify(role);
        const filePath = (0, node_path_1.join)(this.knowledgeBasePath, appId, "roles", `${normalizedRole}.md`);
        if (!(0, node_fs_1.existsSync)(filePath)) {
            return [];
        }
        const rawContent = (0, node_fs_1.readFileSync)(filePath, "utf-8");
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
    getPolicyDocuments(appId) {
        const dirPath = (0, node_path_1.join)(this.knowledgeBasePath, appId, "policies");
        if (!(0, node_fs_1.existsSync)(dirPath)) {
            return [];
        }
        const files = (0, node_fs_1.readdirSync)(dirPath).filter((file) => file.endsWith(".md"));
        return files.map((file) => {
            const filePath = (0, node_path_1.join)(dirPath, file);
            const rawContent = (0, node_fs_1.readFileSync)(filePath, "utf-8");
            const metadata = this.parseFrontmatter(rawContent);
            const content = metadata
                ? this.extractContentWithoutFrontmatter(rawContent)
                : rawContent;
            return {
                type: "policy",
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
    getFaqDocuments(appId, module, role, question, unitOccupantRole) {
        const dirPath = (0, node_path_1.join)(this.knowledgeBasePath, appId, "faq");
        if (!(0, node_fs_1.existsSync)(dirPath)) {
            return [];
        }
        const files = (0, node_fs_1.readdirSync)(dirPath).filter((file) => file.endsWith(".md"));
        const keywords = this.extractQuestionKeywords(question);
        const scoredFiles = files
            .map((file) => {
            const filePath = (0, node_path_1.join)(dirPath, file);
            const rawContent = (0, node_fs_1.readFileSync)(filePath, "utf-8");
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
            if (!module && !question)
                return true;
            return item.score > 0;
        })
            .sort((a, b) => b.score - a.score);
        return scoredFiles.map((item) => {
            const content = item.metadata
                ? this.extractContentWithoutFrontmatter(item.rawContent)
                : item.rawContent;
            return {
                type: "faq",
                fileName: item.file,
                filePath: item.filePath,
                content,
                metadata: item.metadata,
                retrievalTrace: item.trace,
            };
        });
    }
    getFlowDocuments(appId, module, role, question, unitOccupantRole) {
        const dirPath = (0, node_path_1.join)(this.knowledgeBasePath, appId, "flows");
        if (!(0, node_fs_1.existsSync)(dirPath)) {
            return [];
        }
        const files = (0, node_fs_1.readdirSync)(dirPath).filter((file) => file.endsWith(".md"));
        const keywords = this.extractQuestionKeywords(question);
        const scoredFiles = files
            .map((file) => {
            const filePath = (0, node_path_1.join)(dirPath, file);
            const rawContent = (0, node_fs_1.readFileSync)(filePath, "utf-8");
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
            if (!module && !question)
                return true;
            return item.score > 0;
        })
            .sort((a, b) => b.score - a.score);
        return scoredFiles.map((item) => {
            const content = item.metadata
                ? this.extractContentWithoutFrontmatter(item.rawContent)
                : item.rawContent;
            return {
                type: "flow",
                fileName: item.file,
                filePath: item.filePath,
                content,
                metadata: item.metadata,
                retrievalTrace: item.trace,
            };
        });
    }
    extractQuestionKeywords(question) {
        if (!question)
            return [];
        const normalized = question
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        const keywords = normalized.split(" ").filter((word) => word.length >= 4);
        const unique = Array.from(new Set(keywords));
        return unique;
    }
    buildScoreTrace(fileName, keywords, module, role, unitOccupantRole, metadata) {
        const normalizedFile = fileName.toLowerCase().replace(/-/g, " ").replace(/.md$/, "");
        let moduleScore = 0;
        let keywordScore = 0;
        let tagScore = 0;
        let occupantScore = 0;
        let roleScopeScore = 0;
        let matchedModule = false;
        let matchedRoleScope = false;
        let matchedOccupantScope = false;
        const matchedTags = [];
        const matchedKeywords = [];
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
        }
        else if (metadata?.roleScope?.length) {
            matchedRoleScope = true;
            roleScopeScore += this.rankingStrategy.weights.roleScope;
        }
        const totalScore = Math.round((moduleScore + keywordScore + tagScore + occupantScore + roleScopeScore) * 10) / 10;
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
    slugify(value) {
        return value.toLowerCase().replace(/_/g, "-");
    }
}
exports.KnowledgeService = KnowledgeService;
