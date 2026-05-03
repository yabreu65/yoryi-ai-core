import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { join } from "node:path";
import { BuildingOSAdapter, JurisManagerAdapter } from "@yoryi/ai-adapters";
import { ChatService, KnowledgeService, OllamaLlmProvider } from "@yoryi/ai-core";
import type { ChatRequest, ChatResponse } from "@yoryi/ai-core";
import type {
  ActionExecutionResult,
  AssistantRuntimeContext,
  SaasAssistantAdapter,
} from "@yoryi/ai-types";
import {
  createDefaultEmbeddingProvider,
  getRagRuntimeConfig,
  InMemoryRagStore,
  MarkdownKnowledgeSource,
  POSTGRES_RAG_SCHEMA_SQL,
  PostgresRagStore,
  RagIndexer,
  RagRetriever,
  type QueryExecutor,
  type RagStore,
  type RagIndexReport,
} from "@yoryi/ai-rag";
import { HttpBuildingOSFinancialGateway } from "./buildingos-financial.gateway";
import { HttpBuildingOSReadOnlyQueryGateway } from "./buildingos-readonly-query.gateway";
import { isQueryOnlyModeForApp } from "./assistant-mode";
import { InMemoryAssistantRateLimiter } from "./assistant-rate-limiter";
import {
  AssistantRolloutDecision,
  AssistantRolloutPolicyService,
} from "./assistant-rollout-policy.service";

const LLM_ENABLED = process.env.LLM_ENABLED === "true";
const LLM_BASE_URL = process.env.LLM_BASE_URL || "http://localhost:11434";
const LLM_MODEL = process.env.LLM_MODEL || "llama3";

type PgQueryResult = {
  rows: Array<Record<string, unknown>>;
};

@Injectable()
export class AssistantService {
  private readonly adaptersByApp = new Map<string, SaasAssistantAdapter>();
  private readonly chatServicesByApp = new Map<string, ChatService>();
  private readonly ragIndexer: RagIndexer;
  private readonly ragRuntimeConfig = getRagRuntimeConfig();
  private readonly rateLimiter: InMemoryAssistantRateLimiter;
  private readonly rolloutPolicy = new AssistantRolloutPolicyService();

  constructor() {
    this.rateLimiter = new InMemoryAssistantRateLimiter({
      enabled: process.env.ASSISTANT_RATE_LIMIT_ENABLED !== "false",
      maxRequests: this.parsePositiveInt(
        process.env.ASSISTANT_RATE_LIMIT_MAX_REQUESTS,
        60
      ),
      windowMs: this.parsePositiveInt(
        process.env.ASSISTANT_RATE_LIMIT_WINDOW_MS,
        60_000
      ),
    });

    const financialGateway = new HttpBuildingOSFinancialGateway({
      baseUrl: process.env.BUILDINGOS_FINANCIAL_API_BASE_URL,
      timeoutMs: 800,
      apiKey: process.env.BUILDINGOS_FINANCIAL_API_KEY,
      circuitBreakerFailureThreshold: this.parsePositiveInt(
        process.env.BUILDINGOS_GATEWAY_CB_FAILURE_THRESHOLD,
        3
      ),
      circuitBreakerOpenMs: this.parsePositiveInt(
        process.env.BUILDINGOS_GATEWAY_CB_OPEN_MS,
        30_000
      ),
    });
    const readOnlyQueryGateway = new HttpBuildingOSReadOnlyQueryGateway({
      baseUrl: process.env.BUILDINGOS_READONLY_QUERY_API_BASE_URL,
      timeoutMs: this.parsePositiveInt(
        process.env.BUILDINGOS_READONLY_QUERY_TIMEOUT_MS,
        30_000
      ),
      apiKey: process.env.BUILDINGOS_READONLY_QUERY_API_KEY,
      circuitBreakerFailureThreshold: this.parsePositiveInt(
        process.env.BUILDINGOS_GATEWAY_CB_FAILURE_THRESHOLD,
        3
      ),
      circuitBreakerOpenMs: this.parsePositiveInt(
        process.env.BUILDINGOS_GATEWAY_CB_OPEN_MS,
        30_000
      ),
    });

    const buildingosAdapter = new BuildingOSAdapter({
      financialGateway,
      readOnlyQueryGateway,
    });
    const jurismanagerAdapter = new JurisManagerAdapter();
    this.adaptersByApp.set(buildingosAdapter.appId, buildingosAdapter);
    this.adaptersByApp.set(jurismanagerAdapter.appId, jurismanagerAdapter);

    console.log("[GATEWAY] BUILDINGOS ReadOnly:", {
      baseUrl: process.env.BUILDINGOS_READONLY_QUERY_API_BASE_URL ? "SET" : "UNDEFINED",
      timeout: process.env.BUILDINGOS_READONLY_QUERY_TIMEOUT_MS || "default 30000",
      hasApiKey: !!process.env.BUILDINGOS_READONLY_QUERY_API_KEY,
    });
    console.log("[GATEWAY] BUILDINGOS Financial:", {
      baseUrl: process.env.BUILDINGOS_FINANCIAL_API_BASE_URL ? "SET" : "UNDEFINED",
      hasApiKey: !!process.env.BUILDINGOS_FINANCIAL_API_KEY,
    });

    const knowledgeBasePath = join(__dirname, "..", "..", "..", "..", "knowledge");
    const llmProvider = LLM_ENABLED
      ? new OllamaLlmProvider({ baseUrl: LLM_BASE_URL, model: LLM_MODEL })
      : undefined;

    const embeddings = createDefaultEmbeddingProvider({
      model: this.ragRuntimeConfig.embeddingModel,
      fallbackToHash: process.env.NODE_ENV === "test",
    });
    const ragStore = this.createRagStore();
    this.ragIndexer = new RagIndexer(
      new MarkdownKnowledgeSource(knowledgeBasePath),
      ragStore,
      embeddings
    );

    const semanticRetriever = this.ragRuntimeConfig.enabled
      ? new RagRetriever(ragStore, embeddings, {
          topK: this.ragRuntimeConfig.topK,
          minScore: this.ragRuntimeConfig.minScore,
        })
      : undefined;

    for (const adapter of this.adaptersByApp.values()) {
      const knowledgeService = new KnowledgeService(
        knowledgeBasePath,
        undefined,
        semanticRetriever
      );
      const chatService = new ChatService(
        adapter,
        knowledgeService,
        llmProvider,
        undefined,
        {
          queryOnly: isQueryOnlyModeForApp(adapter.appId),
        }
      );
      this.chatServicesByApp.set(adapter.appId, chatService);
    }
  }

  async handleChat(request: {
    message: string;
    context?: Partial<AssistantRuntimeContext>;
    authContext?: Partial<AssistantRuntimeContext>;
    useLlm?: boolean;
    sessionId?: string;
  }): Promise<ChatResponse> {
    const context = this.buildServerAuthoritativeContext(
      request.context,
      request.authContext
    );
    this.assertRolloutAccess(context);
    this.assertRateLimit(context, "chat");
    const chatService = this.resolveChatService(context.appId);

    const response = await chatService.handle({
      message: request.message,
      context,
      useLlm: request.useLlm ?? LLM_ENABLED,
      sessionId: request.sessionId,
    } as ChatRequest);

    return this.normalizeResponseContract(response);
  }

  async executeAction(request: {
    actionKey: string;
    context?: Partial<AssistantRuntimeContext>;
    authContext?: Partial<AssistantRuntimeContext>;
    confirmed?: boolean;
    params?: Record<string, unknown>;
  }): Promise<ActionExecutionResult> {
    const context = this.buildServerAuthoritativeContext(
      request.context,
      request.authContext
    );
    this.assertRolloutAccess(context);
    this.assertRateLimit(context, "action");

    if (isQueryOnlyModeForApp(context.appId)) {
      throw new ForbiddenException(
        "El asistente está en modo solo consulta y no puede ejecutar acciones."
      );
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

  async reindexRagKnowledge(request: {
    token?: string;
    apps?: string[];
  }): Promise<{ reports: RagIndexReport[] }> {
    this.assertReindexToken(request.token);

    const requestedApps = request.apps?.filter(
      (appId): appId is string => typeof appId === "string" && appId.trim().length > 0
    );
    const apps =
      requestedApps && requestedApps.length > 0
        ? requestedApps
        : [...this.adaptersByApp.keys()];

    const reports = await this.ragIndexer.reindexApps(apps);
    return { reports };
  }

  getRolloutStatus(request: {
    context?: Partial<AssistantRuntimeContext>;
    authContext?: Partial<AssistantRuntimeContext>;
  }): {
    decision: AssistantRolloutDecision;
    context: AssistantRuntimeContext;
  } {
    const context = this.buildServerAuthoritativeContext(
      request.context,
      request.authContext
    );
    const decision = this.rolloutPolicy.evaluate({
      tenantId: context.tenantId,
    });
    return { decision, context };
  }

  private buildServerAuthoritativeContext(
    inputContext?: Partial<AssistantRuntimeContext>,
    authContext?: Partial<AssistantRuntimeContext>
  ): AssistantRuntimeContext {
    const visualContext = inputContext ?? {};
    const authoritativeContext = authContext ?? {};

    const appId = authoritativeContext.appId ?? visualContext.appId ?? "buildingos";
    const userId =
      authoritativeContext.userId ?? visualContext.userId ?? "anonymous-user";
    const role = authoritativeContext.role ?? visualContext.role ?? "RESIDENT";
    const route = visualContext.route ?? "/";

    const context: AssistantRuntimeContext = {
      appId,
      userId,
      role,
      route,
    };

    if (authoritativeContext.tenantId ?? visualContext.tenantId) {
      context.tenantId = authoritativeContext.tenantId ?? visualContext.tenantId;
    }
    if (visualContext.currentModule) context.currentModule = visualContext.currentModule;
    if (visualContext.entityType) context.entityType = visualContext.entityType;
    if (visualContext.entityId) context.entityId = visualContext.entityId;
    if (visualContext.screenTitle) context.screenTitle = visualContext.screenTitle;
    if (visualContext.unitOccupantRole) context.unitOccupantRole = visualContext.unitOccupantRole;
    if (visualContext.locale) context.locale = visualContext.locale;
    if (visualContext.extra) context.extra = visualContext.extra;

    return context;
  }

  private resolveAdapter(appId: string): SaasAssistantAdapter {
    return this.adaptersByApp.get(appId) ?? this.adaptersByApp.get("buildingos")!;
  }

  private resolveChatService(appId: string): ChatService {
    return this.chatServicesByApp.get(appId) ?? this.chatServicesByApp.get("buildingos")!;
  }

  private assertReindexToken(token?: string): void {
    const expectedToken = process.env.RAG_REINDEX_TOKEN;
    if (!expectedToken) {
      return;
    }

    if (!token || token !== expectedToken) {
      throw new UnauthorizedException("Invalid token for rag reindex operation.");
    }
  }

  private createRagStore(): RagStore {
    if (!this.ragRuntimeConfig.dbUrl) {
      return new InMemoryRagStore();
    }

    const queryExecutor = this.createPostgresQueryExecutor(this.ragRuntimeConfig.dbUrl);
    return new PostgresRagStore(queryExecutor);
  }

  private normalizeResponseContract(response: ChatResponse): ChatResponse {
    const normalizedType = this.normalizeResponseTypeAlias(
      (response as { responseType?: string }).responseType
    );
    if (!normalizedType) {
      return response;
    }

    return {
      ...response,
      responseType: normalizedType as ChatResponse["responseType"],
    };
  }

  private normalizeResponseTypeAlias(
    responseType?: string
  ): "exact" | "summary" | "list" | "clarification" | undefined {
    if (!responseType) {
      return undefined;
    }
    const normalized = responseType.toLowerCase();
    if (normalized === "metric") {
      return "exact";
    }
    if (normalized === "no_data") {
      return "clarification";
    }
    if (
      normalized === "exact" ||
      normalized === "summary" ||
      normalized === "list" ||
      normalized === "clarification"
    ) {
      return normalized;
    }
    return undefined;
  }

  private createPostgresQueryExecutor(dbUrl: string): QueryExecutor {
    let poolPromise:
      | Promise<{
          query: (
            sql: string,
            params?: unknown[]
          ) => Promise<PgQueryResult>;
        }>
      | null = null;
    let schemaReadyPromise: Promise<void> | null = null;

    const getPool = async () => {
      if (!poolPromise) {
        poolPromise = (async () => {
          const pg = await import("pg");
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
          .query(POSTGRES_RAG_SCHEMA_SQL)
          .then(() => undefined);
      }
      await schemaReadyPromise;
    };

    return async (sql: string, params?: unknown[]) => {
      await ensureSchema();
      const pool = await getPool();
      return pool.query(sql, params ?? []);
    };
  }

  private parsePositiveInt(rawValue: string | undefined, fallback: number): number {
    if (!rawValue) {
      return fallback;
    }

    const parsed = Number.parseInt(rawValue, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return fallback;
    }

    return parsed;
  }

  private assertRateLimit(
    context: AssistantRuntimeContext,
    operation: "chat" | "action"
  ): void {
    const decision = this.rateLimiter.consume({
      appId: context.appId,
      tenantId: context.tenantId,
      userId: context.userId,
      operation,
    });

    if (!decision.allowed) {
      throw new HttpException(
        "Se alcanzó el límite temporal del asistente. Probá de nuevo en unos segundos.",
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }

  private assertRolloutAccess(context: AssistantRuntimeContext): void {
    const decision = this.rolloutPolicy.evaluate({
      tenantId: context.tenantId,
    });

    if (!decision.enabled) {
      throw new ForbiddenException(
        `El asistente no está habilitado para este tenant (${decision.reason}).`
      );
    }
  }
}
