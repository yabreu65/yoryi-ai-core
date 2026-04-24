"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssistantService = void 0;
const common_1 = require("@nestjs/common");
const node_path_1 = require("node:path");
const ai_adapters_1 = require("@yoryi/ai-adapters");
const ai_core_1 = require("@yoryi/ai-core");
const ai_rag_1 = require("@yoryi/ai-rag");
const buildingos_financial_gateway_1 = require("./buildingos-financial.gateway");
const buildingos_readonly_query_gateway_1 = require("./buildingos-readonly-query.gateway");
const assistant_mode_1 = require("./assistant-mode");
const assistant_rate_limiter_1 = require("./assistant-rate-limiter");
const assistant_rollout_policy_service_1 = require("./assistant-rollout-policy.service");
const LLM_ENABLED = process.env.LLM_ENABLED === "true";
const LLM_BASE_URL = process.env.LLM_BASE_URL || "http://localhost:11434";
const LLM_MODEL = process.env.LLM_MODEL || "llama3";
let AssistantService = class AssistantService {
    adaptersByApp = new Map();
    chatServicesByApp = new Map();
    ragIndexer;
    ragRuntimeConfig = (0, ai_rag_1.getRagRuntimeConfig)();
    rateLimiter;
    rolloutPolicy = new assistant_rollout_policy_service_1.AssistantRolloutPolicyService();
    constructor() {
        this.rateLimiter = new assistant_rate_limiter_1.InMemoryAssistantRateLimiter({
            enabled: process.env.ASSISTANT_RATE_LIMIT_ENABLED !== "false",
            maxRequests: this.parsePositiveInt(process.env.ASSISTANT_RATE_LIMIT_MAX_REQUESTS, 60),
            windowMs: this.parsePositiveInt(process.env.ASSISTANT_RATE_LIMIT_WINDOW_MS, 60_000),
        });
        const financialGateway = new buildingos_financial_gateway_1.HttpBuildingOSFinancialGateway({
            baseUrl: process.env.BUILDINGOS_FINANCIAL_API_BASE_URL,
            timeoutMs: 800,
            apiKey: process.env.BUILDINGOS_FINANCIAL_API_KEY,
            circuitBreakerFailureThreshold: this.parsePositiveInt(process.env.BUILDINGOS_GATEWAY_CB_FAILURE_THRESHOLD, 3),
            circuitBreakerOpenMs: this.parsePositiveInt(process.env.BUILDINGOS_GATEWAY_CB_OPEN_MS, 30_000),
        });
        const readOnlyQueryGateway = new buildingos_readonly_query_gateway_1.HttpBuildingOSReadOnlyQueryGateway({
            baseUrl: process.env.BUILDINGOS_READONLY_QUERY_API_BASE_URL,
            timeoutMs: this.parsePositiveInt(process.env.BUILDINGOS_READONLY_QUERY_TIMEOUT_MS, 900),
            apiKey: process.env.BUILDINGOS_READONLY_QUERY_API_KEY,
            circuitBreakerFailureThreshold: this.parsePositiveInt(process.env.BUILDINGOS_GATEWAY_CB_FAILURE_THRESHOLD, 3),
            circuitBreakerOpenMs: this.parsePositiveInt(process.env.BUILDINGOS_GATEWAY_CB_OPEN_MS, 30_000),
        });
        const buildingosAdapter = new ai_adapters_1.BuildingOSAdapter({
            financialGateway,
            readOnlyQueryGateway,
        });
        const jurismanagerAdapter = new ai_adapters_1.JurisManagerAdapter();
        this.adaptersByApp.set(buildingosAdapter.appId, buildingosAdapter);
        this.adaptersByApp.set(jurismanagerAdapter.appId, jurismanagerAdapter);
        const knowledgeBasePath = (0, node_path_1.join)(__dirname, "..", "..", "..", "..", "knowledge");
        const llmProvider = LLM_ENABLED
            ? new ai_core_1.OllamaLlmProvider({ baseUrl: LLM_BASE_URL, model: LLM_MODEL })
            : undefined;
        const embeddings = (0, ai_rag_1.createDefaultEmbeddingProvider)({
            model: this.ragRuntimeConfig.embeddingModel,
            fallbackToHash: process.env.NODE_ENV === "test",
        });
        const ragStore = this.createRagStore();
        this.ragIndexer = new ai_rag_1.RagIndexer(new ai_rag_1.MarkdownKnowledgeSource(knowledgeBasePath), ragStore, embeddings);
        const semanticRetriever = this.ragRuntimeConfig.enabled
            ? new ai_rag_1.RagRetriever(ragStore, embeddings, {
                topK: this.ragRuntimeConfig.topK,
                minScore: this.ragRuntimeConfig.minScore,
            })
            : undefined;
        for (const adapter of this.adaptersByApp.values()) {
            const knowledgeService = new ai_core_1.KnowledgeService(knowledgeBasePath, undefined, semanticRetriever);
            const chatService = new ai_core_1.ChatService(adapter, knowledgeService, llmProvider, undefined, {
                queryOnly: (0, assistant_mode_1.isQueryOnlyModeForApp)(adapter.appId),
            });
            this.chatServicesByApp.set(adapter.appId, chatService);
        }
    }
    async handleChat(request) {
        const context = this.buildServerAuthoritativeContext(request.context, request.authContext);
        this.assertRolloutAccess(context);
        this.assertRateLimit(context, "chat");
        const chatService = this.resolveChatService(context.appId);
        return chatService.handle({
            message: request.message,
            context,
            useLlm: request.useLlm ?? LLM_ENABLED,
            sessionId: request.sessionId,
        });
    }
    async executeAction(request) {
        const context = this.buildServerAuthoritativeContext(request.context, request.authContext);
        this.assertRolloutAccess(context);
        this.assertRateLimit(context, "action");
        if ((0, assistant_mode_1.isQueryOnlyModeForApp)(context.appId)) {
            throw new common_1.ForbiddenException("El asistente está en modo solo consulta y no puede ejecutar acciones.");
        }
        const adapter = this.resolveAdapter(context.appId);
        const resolvedContext = await adapter.getContext(context);
        if (!adapter.executeAction) {
            return {
                status: "not_found",
                message: "Este SaaS no tiene action system habilitado.",
                actionKey: request.actionKey,
            };
        }
        return adapter.executeAction({
            actionKey: request.actionKey,
            context: resolvedContext,
            confirmed: request.confirmed,
            params: request.params,
        });
    }
    async reindexRagKnowledge(request) {
        this.assertReindexToken(request.token);
        const requestedApps = request.apps?.filter((appId) => typeof appId === "string" && appId.trim().length > 0);
        const apps = requestedApps && requestedApps.length > 0
            ? requestedApps
            : [...this.adaptersByApp.keys()];
        const reports = await this.ragIndexer.reindexApps(apps);
        return { reports };
    }
    getRolloutStatus(request) {
        const context = this.buildServerAuthoritativeContext(request.context, request.authContext);
        const decision = this.rolloutPolicy.evaluate({
            tenantId: context.tenantId,
        });
        return { decision, context };
    }
    buildServerAuthoritativeContext(inputContext, authContext) {
        const visualContext = inputContext ?? {};
        const authoritativeContext = authContext ?? {};
        const appId = authoritativeContext.appId ?? visualContext.appId ?? "buildingos";
        const userId = authoritativeContext.userId ?? visualContext.userId ?? "anonymous-user";
        const role = authoritativeContext.role ?? visualContext.role ?? "RESIDENT";
        const route = visualContext.route ?? "/";
        const context = {
            appId,
            userId,
            role,
            route,
        };
        if (authoritativeContext.tenantId ?? visualContext.tenantId) {
            context.tenantId = authoritativeContext.tenantId ?? visualContext.tenantId;
        }
        if (visualContext.currentModule)
            context.currentModule = visualContext.currentModule;
        if (visualContext.entityType)
            context.entityType = visualContext.entityType;
        if (visualContext.entityId)
            context.entityId = visualContext.entityId;
        if (visualContext.screenTitle)
            context.screenTitle = visualContext.screenTitle;
        if (visualContext.unitOccupantRole)
            context.unitOccupantRole = visualContext.unitOccupantRole;
        if (visualContext.locale)
            context.locale = visualContext.locale;
        if (visualContext.extra)
            context.extra = visualContext.extra;
        return context;
    }
    resolveAdapter(appId) {
        return this.adaptersByApp.get(appId) ?? this.adaptersByApp.get("buildingos");
    }
    resolveChatService(appId) {
        return this.chatServicesByApp.get(appId) ?? this.chatServicesByApp.get("buildingos");
    }
    assertReindexToken(token) {
        const expectedToken = process.env.RAG_REINDEX_TOKEN;
        if (!expectedToken) {
            return;
        }
        if (!token || token !== expectedToken) {
            throw new common_1.UnauthorizedException("Invalid token for rag reindex operation.");
        }
    }
    createRagStore() {
        if (!this.ragRuntimeConfig.dbUrl) {
            return new ai_rag_1.InMemoryRagStore();
        }
        const queryExecutor = this.createPostgresQueryExecutor(this.ragRuntimeConfig.dbUrl);
        return new ai_rag_1.PostgresRagStore(queryExecutor);
    }
    createPostgresQueryExecutor(dbUrl) {
        let poolPromise = null;
        let schemaReadyPromise = null;
        const getPool = async () => {
            if (!poolPromise) {
                poolPromise = (async () => {
                    const pg = await Promise.resolve().then(() => __importStar(require("pg")));
                    return new pg.Pool({
                        connectionString: dbUrl,
                    });
                })();
            }
            return poolPromise;
        };
        const ensureSchema = async () => {
            const pool = await getPool();
            if (!schemaReadyPromise) {
                schemaReadyPromise = pool
                    .query(ai_rag_1.POSTGRES_RAG_SCHEMA_SQL)
                    .then(() => undefined);
            }
            await schemaReadyPromise;
        };
        return async (sql, params) => {
            await ensureSchema();
            const pool = await getPool();
            return pool.query(sql, params ?? []);
        };
    }
    parsePositiveInt(rawValue, fallback) {
        if (!rawValue) {
            return fallback;
        }
        const parsed = Number.parseInt(rawValue, 10);
        if (Number.isNaN(parsed) || parsed <= 0) {
            return fallback;
        }
        return parsed;
    }
    assertRateLimit(context, operation) {
        const decision = this.rateLimiter.consume({
            appId: context.appId,
            tenantId: context.tenantId,
            userId: context.userId,
            operation,
        });
        if (!decision.allowed) {
            throw new common_1.HttpException("Se alcanzó el límite temporal del asistente. Probá de nuevo en unos segundos.", common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
    }
    assertRolloutAccess(context) {
        const decision = this.rolloutPolicy.evaluate({
            tenantId: context.tenantId,
        });
        if (!decision.enabled) {
            throw new common_1.ForbiddenException(`El asistente no está habilitado para este tenant (${decision.reason}).`);
        }
    }
};
exports.AssistantService = AssistantService;
exports.AssistantService = AssistantService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AssistantService);
