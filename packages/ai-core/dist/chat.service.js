"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const node_crypto_1 = require("node:crypto");
const assistant_metrics_1 = require("./assistant-metrics");
const contextual_actions_1 = require("./contextual-actions");
const session_memory_1 = require("./session-memory");
const intent_router_1 = require("./intent-router");
class ChatService {
    adapter;
    knowledgeService;
    llmProvider;
    sessionMemory;
    options;
    intentRouter = new intent_router_1.ChatIntentRouter();
    constructor(adapter, knowledgeService, llmProvider, sessionMemory = new session_memory_1.InMemorySessionMemory(), options = {}) {
        this.adapter = adapter;
        this.knowledgeService = knowledgeService;
        this.llmProvider = llmProvider;
        this.sessionMemory = sessionMemory;
        this.options = options;
    }
    async handle(request) {
        const resolvedContext = await this.adapter.getContext(request.context);
        const sessionSnapshot = this.sessionMemory.getSnapshot({
            context: resolvedContext,
            question: request.message,
            sessionId: request.sessionId,
        });
        const canAnswer = await this.adapter.canAnswer(request.message, resolvedContext);
        if (!canAnswer) {
            const auditId = this.createAuditId();
            const response = {
                message: request.message,
                answer: "No puedo responder esta solicitud con el rol o contexto actual.",
                answerSource: "fallback",
                responseType: "clarification",
                dataScope: this.resolveDataScope(resolvedContext),
                provenance: {
                    strategy: "fallback",
                    sources: [
                        {
                            type: "system",
                            name: "authorization_guard",
                        },
                    ],
                },
                auditId,
                context: resolvedContext,
                actions: [],
                knowledgeUsed: {
                    module: resolvedContext.currentModule,
                    found: false,
                    sources: [],
                },
            };
            assistant_metrics_1.metricsService.record(request.message, resolvedContext.appId, {
                auditId,
                tenantId: resolvedContext.tenantId,
                userId: resolvedContext.userId,
                module: resolvedContext.currentModule,
                route: resolvedContext.route,
                role: resolvedContext.role,
                actionCount: 0,
                hasActions: false,
                llmUsed: false,
                knowledgeFound: false,
                fallback: true,
                answerSource: "fallback",
                responseType: response.responseType,
                dataScope: response.dataScope,
                debtQueryDetected: this.isDebtQuestion(request.message),
                debtAnswerExact: false,
            });
            return response;
        }
        const intentRoute = this.intentRouter.route({
            question: request.message,
            queryOnly: this.options.queryOnly === true,
            currentModule: resolvedContext.currentModule,
            hasRecentModuleContext: Boolean(sessionSnapshot.recentModule) &&
                (!resolvedContext.currentModule ||
                    resolvedContext.currentModule === "general"),
        });
        if (intentRoute === "mutation_blocked") {
            const auditId = this.createAuditId();
            const response = {
                message: request.message,
                answer: this.buildReadOnlyMutationAnswer(request.message, resolvedContext),
                answerSource: "fallback",
                responseType: "clarification",
                dataScope: this.resolveDataScope(resolvedContext),
                provenance: {
                    strategy: "fallback",
                    sources: [
                        {
                            type: "system",
                            name: "query_only_mutation_block",
                        },
                    ],
                },
                auditId,
                context: resolvedContext,
                actions: [],
                llmUsed: false,
                knowledgeUsed: {
                    module: resolvedContext.currentModule,
                    found: false,
                    sources: [],
                },
                sessionInsights: {
                    sessionId: request.sessionId,
                    interactionCount: sessionSnapshot.interactionCount,
                    repeatedQuestion: sessionSnapshot.repeatedQuestion,
                    recentModule: sessionSnapshot.recentModule,
                },
            };
            assistant_metrics_1.metricsService.record(request.message, resolvedContext.appId, {
                auditId,
                tenantId: resolvedContext.tenantId,
                userId: resolvedContext.userId,
                module: resolvedContext.currentModule,
                route: resolvedContext.route,
                role: resolvedContext.role,
                actionCount: 0,
                hasActions: false,
                llmUsed: false,
                knowledgeFound: false,
                fallback: true,
                answerSource: "fallback",
                responseType: response.responseType,
                dataScope: response.dataScope,
                debtQueryDetected: this.isDebtQuestion(request.message),
                debtAnswerExact: false,
            });
            return response;
        }
        if (intentRoute === "ambiguous") {
            const auditId = this.createAuditId();
            const response = {
                message: request.message,
                answer: this.buildAmbiguousQuestionAnswer(request.message, resolvedContext, sessionSnapshot.recentModule),
                answerSource: "fallback",
                responseType: "clarification",
                dataScope: this.resolveDataScope(resolvedContext),
                provenance: {
                    strategy: "fallback",
                    sources: [
                        {
                            type: "system",
                            name: "intent_router_ambiguous",
                        },
                    ],
                },
                auditId,
                context: resolvedContext,
                actions: [],
                llmUsed: false,
                knowledgeUsed: {
                    module: resolvedContext.currentModule,
                    found: false,
                    sources: [],
                },
                sessionInsights: {
                    sessionId: request.sessionId,
                    interactionCount: sessionSnapshot.interactionCount,
                    repeatedQuestion: sessionSnapshot.repeatedQuestion,
                    recentModule: sessionSnapshot.recentModule,
                },
            };
            assistant_metrics_1.metricsService.record(request.message, resolvedContext.appId, {
                auditId,
                tenantId: resolvedContext.tenantId,
                userId: resolvedContext.userId,
                module: resolvedContext.currentModule,
                route: resolvedContext.route,
                role: resolvedContext.role,
                actionCount: 0,
                hasActions: false,
                llmUsed: false,
                knowledgeFound: false,
                fallback: true,
                answerSource: "fallback",
                responseType: response.responseType,
                dataScope: response.dataScope,
                debtQueryDetected: this.isDebtQuestion(request.message),
                debtAnswerExact: false,
            });
            return response;
        }
        const actions = this.filterActionsForQueryOnly(await this.adapter.getAvailableActions(resolvedContext));
        let prioritizedActions = actions;
        const hint = {};
        if (resolvedContext.currentModule)
            hint.currentModule = resolvedContext.currentModule;
        if (resolvedContext.route)
            hint.currentRoute = resolvedContext.route;
        if (resolvedContext.screenTitle)
            hint.screenTitle = resolvedContext.screenTitle;
        if (resolvedContext.role)
            hint.role = resolvedContext.role;
        if ((0, contextual_actions_1.isProactiveQuestion)(request.message)) {
            prioritizedActions = (0, contextual_actions_1.getProactiveActions)(actions, hint);
        }
        else {
            prioritizedActions = (0, contextual_actions_1.limitActionsByContext)(actions, hint, request.message);
        }
        prioritizedActions = this.applyBehavioralActionPrioritization(prioritizedActions, sessionSnapshot.preferredActionKeys);
        const debtQueryDetected = this.isDebtQuestion(request.message);
        let dataBackedLatencyMs;
        let dataBackedAnswer = null;
        console.log('[DEBUG CHAT] About to call resolveDataBackedAnswer, question:', request.message.substring(0, 40));
        if (this.adapter.resolveDataBackedAnswer) {
            const startedAt = Date.now();
            try {
                dataBackedAnswer = await this.adapter.resolveDataBackedAnswer({
                    question: request.message,
                    context: resolvedContext,
                });
            }
            catch {
                dataBackedAnswer = null;
            }
            finally {
                dataBackedLatencyMs = Date.now() - startedAt;
            }
        }
        if (dataBackedAnswer) {
            const auditId = this.createAuditId();
            const liveActions = this.filterActionsForQueryOnly(dataBackedAnswer.actions && dataBackedAnswer.actions.length > 0
                ? dataBackedAnswer.actions
                : prioritizedActions);
            const latencyFromAdapter = typeof dataBackedAnswer.metadata?.financialGatewayLatencyMs === "number"
                ? dataBackedAnswer.metadata.financialGatewayLatencyMs
                : dataBackedLatencyMs;
            const liveResponse = {
                message: request.message,
                answer: dataBackedAnswer.answer,
                answerSource: "live_data",
                responseType: this.resolveLiveDataResponseType(dataBackedAnswer.answer, dataBackedAnswer.metadata),
                dataScope: this.resolveDataScope(resolvedContext),
                provenance: this.buildLiveDataProvenance(dataBackedAnswer.metadata),
                auditId,
                context: resolvedContext,
                actions: liveActions,
                llmUsed: false,
                knowledgeUsed: {
                    module: resolvedContext.currentModule,
                    found: false,
                    sources: [],
                },
                sessionInsights: {
                    sessionId: request.sessionId,
                    interactionCount: sessionSnapshot.interactionCount,
                    repeatedQuestion: sessionSnapshot.repeatedQuestion,
                    recentModule: sessionSnapshot.recentModule,
                },
            };
            this.sessionMemory.remember({
                context: resolvedContext,
                question: request.message,
                sessionId: request.sessionId,
                actions: liveActions,
            });
            assistant_metrics_1.metricsService.record(request.message, resolvedContext.appId, {
                auditId,
                tenantId: resolvedContext.tenantId,
                userId: resolvedContext.userId,
                module: resolvedContext.currentModule,
                route: resolvedContext.route,
                role: resolvedContext.role,
                actionCount: liveActions.length,
                hasActions: liveActions.length > 0,
                llmUsed: false,
                knowledgeFound: false,
                fallback: false,
                answerSource: "live_data",
                responseType: liveResponse.responseType,
                dataScope: liveResponse.dataScope,
                debtQueryDetected,
                debtAnswerExact: true,
                financialGatewayLatencyMs: latencyFromAdapter,
            });
            return liveResponse;
        }
        const knowledgeDocuments = (await this.knowledgeService?.getKnowledgeBundle({
            appId: resolvedContext.appId,
            module: resolvedContext.currentModule,
            role: resolvedContext.role,
            question: request.message,
            unitOccupantRole: resolvedContext.unitOccupantRole,
        })) ?? [];
        let answer;
        let llmUsed = false;
        let usedShortWorkflow = false;
        const useLlm = request.useLlm === true && this.llmProvider !== undefined;
        if (useLlm) {
            try {
                const isAvailable = await this.llmProvider.isAvailable();
                if (isAvailable) {
                    answer = await this.buildLlmAnswer({
                        question: request.message,
                        module: resolvedContext.currentModule,
                        role: resolvedContext.role,
                        documents: knowledgeDocuments,
                    });
                    llmUsed = true;
                }
                else {
                    answer = this.buildContextualAnswer({
                        question: request.message,
                        module: resolvedContext.currentModule,
                        role: resolvedContext.role,
                        documents: knowledgeDocuments,
                    });
                }
            }
            catch {
                answer = this.buildContextualAnswer({
                    question: request.message,
                    module: resolvedContext.currentModule,
                    role: resolvedContext.role,
                    documents: knowledgeDocuments,
                });
            }
        }
        else if (knowledgeDocuments.length > 0) {
            answer = this.buildContextualAnswer({
                question: request.message,
                module: resolvedContext.currentModule,
                role: resolvedContext.role,
                documents: knowledgeDocuments,
            });
        }
        else {
            const shortWorkflow = this.buildShortWorkflowAnswer(request.message, resolvedContext.currentModule);
            usedShortWorkflow = Boolean(shortWorkflow);
            answer =
                shortWorkflow ??
                    this.buildContextualAnswer({
                        question: request.message,
                        module: resolvedContext.currentModule,
                        role: resolvedContext.role,
                        documents: knowledgeDocuments,
                    });
        }
        const fallback = knowledgeDocuments.length === 0;
        const answerSource = fallback
            ? "fallback"
            : "knowledge";
        const contextualAnswer = (0, contextual_actions_1.formatContextualAnswer)(answer, hint, request.message, prioritizedActions.length > 0);
        const adaptedAnswer = this.adaptAnswerWithSessionContext(contextualAnswer, sessionSnapshot, answerSource);
        const knowledgeSources = knowledgeDocuments.map((doc) => {
            const source = {
                type: doc.type,
                fileName: doc.fileName,
            };
            if (doc.retrievalTrace) {
                source.trace = {
                    rankingVersion: doc.retrievalTrace.rankingVersion,
                    strategyId: doc.retrievalTrace.strategyId,
                    moduleScore: doc.retrievalTrace.moduleScore,
                    keywordScore: doc.retrievalTrace.keywordScore,
                    tagScore: doc.retrievalTrace.tagScore,
                    occupantScore: doc.retrievalTrace.occupantScore,
                    totalScore: doc.retrievalTrace.totalScore,
                    matchedModule: doc.retrievalTrace.matchedModule,
                    matchedOccupantScope: doc.retrievalTrace.matchedOccupantScope,
                    matchedTags: doc.retrievalTrace.matchedTags,
                    matchedKeywords: doc.retrievalTrace.matchedKeywords,
                };
                if (typeof doc.retrievalTrace.semanticScore === "number") {
                    source.trace.semanticScore = doc.retrievalTrace.semanticScore;
                }
                if (typeof doc.retrievalTrace.semanticSourceType === "string") {
                    source.trace.semanticSourceType = doc.retrievalTrace.semanticSourceType;
                }
            }
            return source;
        });
        const response = {
            message: request.message,
            answer: adaptedAnswer,
            answerSource,
            responseType: this.resolveKnowledgeOrFallbackResponseType({
                answerSource,
                answer: adaptedAnswer,
                knowledgeFound: knowledgeDocuments.length > 0,
                usedShortWorkflow,
            }),
            dataScope: this.resolveDataScope(resolvedContext),
            provenance: this.buildKnowledgeOrFallbackProvenance({
                answerSource,
                knowledgeSources,
                usedShortWorkflow,
            }),
            auditId: this.createAuditId(),
            context: resolvedContext,
            actions: prioritizedActions,
            llmUsed,
            knowledgeUsed: {
                module: resolvedContext.currentModule,
                found: knowledgeDocuments.length > 0,
                sources: knowledgeSources,
            },
            sessionInsights: {
                sessionId: request.sessionId,
                interactionCount: sessionSnapshot.interactionCount,
                repeatedQuestion: sessionSnapshot.repeatedQuestion,
                recentModule: sessionSnapshot.recentModule,
            },
        };
        this.sessionMemory.remember({
            context: resolvedContext,
            question: request.message,
            sessionId: request.sessionId,
            actions: prioritizedActions,
        });
        assistant_metrics_1.metricsService.record(request.message, resolvedContext.appId, {
            auditId: response.auditId,
            tenantId: resolvedContext.tenantId,
            userId: resolvedContext.userId,
            module: resolvedContext.currentModule,
            route: resolvedContext.route,
            role: resolvedContext.role,
            actionCount: prioritizedActions.length,
            hasActions: prioritizedActions.length > 0,
            llmUsed,
            knowledgeFound: knowledgeDocuments.length > 0,
            fallback,
            answerSource,
            responseType: response.responseType,
            dataScope: response.dataScope,
            debtQueryDetected,
            debtAnswerExact: false,
            financialGatewayLatencyMs: dataBackedLatencyMs,
        });
        return response;
    }
    createAuditId() {
        return (0, node_crypto_1.randomUUID)();
    }
    resolveDataScope(context) {
        if (context.role === "RESIDENT") {
            return "self";
        }
        if (context.tenantId) {
            return "tenant";
        }
        if (context.currentModule && context.currentModule !== "general") {
            return "module";
        }
        return "unknown";
    }
    resolveLiveDataResponseType(answer, metadata) {
        const fromMetadata = this.asResponseType(metadata?.responseType);
        if (fromMetadata) {
            return fromMetadata;
        }
        if (typeof metadata?.noData === "boolean" && metadata.noData) {
            return "no_data";
        }
        if (typeof metadata?.itemCount === "number" && metadata.itemCount > 1) {
            return "list";
        }
        if (typeof metadata?.metricValue === "number") {
            return "metric";
        }
        if (this.isListLikeAnswer(answer)) {
            return "list";
        }
        if (this.isMetricLikeAnswer(answer)) {
            return "metric";
        }
        return "summary";
    }
    resolveKnowledgeOrFallbackResponseType(input) {
        if (input.answerSource === "knowledge") {
            if (this.isListLikeAnswer(input.answer)) {
                return "list";
            }
            if (this.isMetricLikeAnswer(input.answer)) {
                return "metric";
            }
            return "summary";
        }
        if (input.usedShortWorkflow) {
            return this.isListLikeAnswer(input.answer) ? "list" : "summary";
        }
        if (!input.knowledgeFound) {
            return "no_data";
        }
        return this.isListLikeAnswer(input.answer) ? "list" : "summary";
    }
    buildLiveDataProvenance(metadata) {
        const sourceName = typeof metadata?.intent === "string" && metadata.intent.trim().length > 0
            ? metadata.intent
            : "adapter.resolveDataBackedAnswer";
        const source = {
            type: "gateway",
            name: sourceName,
        };
        if (metadata && Object.keys(metadata).length > 0) {
            source.metadata = metadata;
        }
        return {
            strategy: "live_data",
            sources: [source],
        };
    }
    buildKnowledgeOrFallbackProvenance(input) {
        if (input.answerSource === "knowledge") {
            return {
                strategy: "knowledge",
                sources: input.knowledgeSources.map((source) => ({
                    type: "knowledge",
                    name: source.fileName,
                    score: source.trace?.semanticScore,
                    metadata: {
                        sourceType: source.type,
                    },
                })),
            };
        }
        if (input.usedShortWorkflow) {
            return {
                strategy: "fallback",
                sources: [
                    {
                        type: "system",
                        name: "short_workflow_guidance",
                    },
                ],
            };
        }
        return {
            strategy: "fallback",
            sources: [
                {
                    type: "system",
                    name: "knowledge_not_found",
                },
            ],
        };
    }
    asResponseType(value) {
        if (typeof value !== "string") {
            return null;
        }
        const normalized = value.trim().toLowerCase();
        if (normalized === "metric" ||
            normalized === "list" ||
            normalized === "summary" ||
            normalized === "no_data" ||
            normalized === "clarification") {
            return normalized;
        }
        return null;
    }
    isListLikeAnswer(answer) {
        return /^(\s*[-*•]\s+|\s*\d+\.\s+)/m.test(answer);
    }
    isMetricLikeAnswer(answer) {
        const normalized = answer.toLowerCase();
        return (/\b\d+[.,]?\d*\s*%/.test(answer) ||
            /\b(ars|usd|eur)\b/.test(normalized) ||
            /\b(total|monto|importe|saldo|deuda|cantidad)\b/.test(normalized));
    }
    applyBehavioralActionPrioritization(actions, preferredActionKeys) {
        if (actions.length === 0 || preferredActionKeys.length === 0) {
            return actions;
        }
        const rankByKey = new Map();
        preferredActionKeys.forEach((key, index) => {
            rankByKey.set(key, index);
        });
        const prioritized = [];
        const others = [];
        for (const action of actions) {
            const rank = rankByKey.get(action.key);
            if (rank !== undefined) {
                prioritized.push({ action, rank });
            }
            else {
                others.push(action);
            }
        }
        prioritized.sort((a, b) => a.rank - b.rank);
        return [...prioritized.map((item) => item.action), ...others];
    }
    filterActionsForQueryOnly(actions) {
        if (!this.options.queryOnly) {
            return actions;
        }
        return actions.filter((action) => !this.isTransactionalAction(action));
    }
    isTransactionalAction(action) {
        const key = action.key.toLowerCase();
        const permission = action.requiredPermission?.toLowerCase() ?? "";
        if (action.destructive || action.requiresConfirmation) {
            return true;
        }
        if (permission.includes(".write") ||
            permission.includes(".publish") ||
            permission.includes(".approve") ||
            permission.includes(".delete") ||
            permission.includes(".reject")) {
            return true;
        }
        return [
            "create",
            "edit",
            "update",
            "delete",
            "remove",
            "approve",
            "reject",
            "publish",
            "assign",
            "upload",
            "report",
            "send",
            "review",
        ].some((prefix) => key.startsWith(`${prefix}-`));
    }
    buildReadOnlyMutationAnswer(question, context) {
        return [
            "Actualmente solo puedo consultar información; no puedo crear, editar, eliminar, aprobar, rechazar, publicar, asignar ni marcar datos como pagados.",
            `Para hacerlo manualmente, entrá a ${this.resolveManualModulePath(question, context)} y completá la acción desde BuildingOS.`,
        ].join("\n\n");
    }
    resolveManualModulePath(question, context) {
        const normalized = `${question} ${context.currentModule ?? ""} ${context.route ?? ""}`
            .toLowerCase()
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "");
        if (normalized.includes("pago") || normalized.includes("payment")) {
            return "Finanzas > Pagos";
        }
        if (normalized.includes("cargo") || normalized.includes("charge")) {
            return "Finanzas > Cargos";
        }
        if (normalized.includes("ticket") || normalized.includes("soporte") || normalized.includes("support")) {
            return "Support";
        }
        if (normalized.includes("comunicado") || normalized.includes("communication") || normalized.includes("aviso")) {
            return "Comunicaciones";
        }
        if (normalized.includes("documento") || normalized.includes("document") || normalized.includes("archivo")) {
            return "Documentos";
        }
        if (normalized.includes("residente") || normalized.includes("resident") || normalized.includes("unidad") || normalized.includes("unit")) {
            return "Unidades";
        }
        if (normalized.includes("edificio") || normalized.includes("building")) {
            return "Edificios";
        }
        return "el módulo correspondiente";
    }
    buildAmbiguousQuestionAnswer(_question, context, recentModule) {
        const scopeHint = context.currentModule && context.currentModule !== "general"
            ? `Si te referís a ${context.currentModule}, indicame exactamente qué necesitás (métrica, lista o período).`
            : recentModule
                ? `Veo que venías trabajando en ${recentModule}; si es sobre eso, decime el dato puntual que querés.`
                : "Indicame módulo + alcance, por ejemplo: pagos pendientes del mes, tickets abiertos por edificio o deuda de una unidad.";
        return [
            "La consulta quedó ambigua y necesito un poco más de precisión para responder bien.",
            scopeHint,
        ].join("\n\n");
    }
    adaptAnswerWithSessionContext(answer, snapshot, answerSource) {
        const notes = [];
        if (snapshot.repeatedQuestion &&
            snapshot.interactionCount > 0 &&
            answerSource !== "live_data") {
            notes.push("Veo que repetiste esta consulta en la sesión; probá una acción sugerida para resolverlo más rápido.");
        }
        if (snapshot.recentModule && answerSource === "fallback") {
            notes.push(`Contexto de sesión: venías trabajando en ${snapshot.recentModule}.`);
        }
        if (notes.length === 0) {
            return answer;
        }
        return `${answer}\n\n${notes.join("\n")}`;
    }
    async buildLlmAnswer(input) {
        const { question, module, role, documents } = input;
        if (documents.length === 0) {
            return this.buildFallbackAnswer(question, module);
        }
        const prioritizedDocs = this.prioritizeDocuments(documents);
        const knowledgeContent = this.extractKnowledgeForLlm(prioritizedDocs);
        const messages = this.llmProvider.buildPrompt({
            question,
            module: module ?? "general",
            role,
            knowledgeContent,
        });
        const response = await this.llmProvider.generate({
            model: this.llmProvider.model,
            messages,
        });
        return response;
    }
    extractKnowledgeForLlm(documents) {
        return documents
            .slice(0, 5)
            .map((doc) => {
            const source = doc.type === "module" ? "Module"
                : doc.type === "faq" ? "FAQ"
                    : doc.type === "flow" ? "Workflow"
                        : doc.type === "role" ? "Role"
                            : doc.type === "policy" ? "Policy"
                                : "Document";
            return `[${source}] ${doc.fileName}\n${doc.content.slice(0, 800)}`;
        })
            .join("\n\n---\n\n");
    }
    buildContextualAnswer(input) {
        const { question, module, role, documents } = input;
        if (documents.length === 0) {
            return this.buildFallbackAnswer(question, module);
        }
        const prioritizedDocs = this.prioritizeDocuments(documents);
        const intent = this.detectIntent(question);
        const snippets = this.extractRelevantSnippets(prioritizedDocs, intent);
        if (snippets.length === 0) {
            return this.buildFallbackAnswer(question, module);
        }
        return this.buildAnswerFromSnippets(question, role, module, snippets);
    }
    isDebtQuestion(question) {
        const normalized = question.toLowerCase();
        const debtKeywords = [
            "deuda",
            "saldo",
            "cuánto debo",
            "cuanto debo",
            "pending charges",
            "charges pending",
            "balance",
            "cargos pendientes",
            "pago pendiente",
            "lo que debo",
        ];
        return debtKeywords.some((keyword) => normalized.includes(keyword));
    }
    detectIntent(question, module) {
        const normalized = question.toLowerCase();
        if (normalized.includes("how") ||
            normalized.includes("steps") ||
            normalized.includes(" proceso") ||
            normalized.includes("workflow") ||
            normalized.includes("crear") ||
            normalized.includes("create") ||
            normalized.includes("hacer")) {
            return "workflow";
        }
        if (normalized.includes("why") ||
            normalized.includes("porque") ||
            normalized.includes("reason") ||
            normalized.includes("difference")) {
            return "explanation";
        }
        if (normalized.includes("can") ||
            normalized.includes("allowed") ||
            normalized.includes("puedo") ||
            normalized.includes("permission") ||
            normalized.includes("allowed")) {
            return "permission";
        }
        return "general";
    }
    buildShortWorkflowAnswer(question, module) {
        const normalized = question.toLowerCase();
        if (normalized.includes("edificio") || normalized.includes("building")) {
            if (module === "buildings" || normalized.includes("crear")) {
                return [
                    "Para crear un edificio:",
                    "1. Andá a Buildings y elegí Create Building",
                    "2. Completá nombre, código, dirección y estado inicial",
                    "3. Guardá y verificá que aparezca en la lista",
                ].join("\n");
            }
        }
        if (normalized.includes("ticket") || normalized.includes("soporte")) {
            if (module === "tickets" || normalized.includes("crear")) {
                return [
                    "Para crear un ticket:",
                    "1. Andá a Support y seleccioná New Ticket",
                    "2. Indicá título, descripción y categoría",
                    "3. Establecé prioridad y guardá",
                ].join("\n");
            }
        }
        if (normalized.includes("pago") || normalized.includes("payment") || normalized.includes("reportar")) {
            if (module === "payments" || module === "charges" || normalized.includes("reportar")) {
                return [
                    "Para reportar un pago:",
                    "1. Andá a Finanzas > Pagos",
                    "2. Usá Reportar Pago e ingresá monto y fecha",
                    "3. Subí el comprobante si tenés",
                ].join("\n");
            }
        }
        if (normalized.includes("cargo") || normalized.includes("charge")) {
            if (module === "charges" || normalized.includes("crear")) {
                return [
                    "Para crear un cargo:",
                    "1. Andá a Finanzas > Cargos",
                    "2. Seleccioná Create Charge",
                    "3. Completá concepto, monto, fecha de vencimiento",
                    "4. Asigná a las unidades correspondientes",
                ].join("\n");
            }
        }
        return null;
    }
    prioritizeDocuments(documents) {
        const priorityOrder = [
            "module",
            "flow",
            "faq",
            "role",
            "policy",
        ];
        const sorted = [...documents].sort((a, b) => {
            const indexA = priorityOrder.indexOf(a.type);
            const indexB = priorityOrder.indexOf(b.type);
            return indexA - indexB;
        });
        return sorted;
    }
    extractRelevantSnippets(documents, intent) {
        const snippets = [];
        for (const doc of documents) {
            const content = this.toPlainText(doc.content);
            if (intent === "workflow") {
                const workflowMatches = content.match(/(?:###?\s*(?:Step|Paso)\s*\d+|recommended flow|workflow|típico|flujo recomendado).*?(?=\n\n|\n##|$)/gis);
                if (workflowMatches && workflowMatches.length > 0) {
                    snippets.push(...workflowMatches.slice(0, 2));
                }
            }
            if (intent === "explanation") {
                const explainMatches = content.match(/(?:purpose|reason|concept|explicación|porque|difference).*?(?=\n\n|\n##|$)/gis);
                if (explainMatches && explainMatches.length > 0) {
                    snippets.push(...explainMatches.slice(0, 2));
                }
            }
            if (intent === "permission") {
                const permMatches = content.match(/(?:role|allowed|permission|only|solo|restricted|authorized).*?(?=\n\n|\n##|$)/gis);
                if (permMatches && permMatches.length > 0) {
                    snippets.push(...permMatches.slice(0, 2));
                }
            }
            if (intent === "general" || snippets.length === 0) {
                const firstParagraph = content.split("\n\n")[0];
                if (firstParagraph && firstParagraph.length > 20) {
                    snippets.push(firstParagraph);
                }
            }
        }
        return snippets.slice(0, 4);
    }
    toPlainText(markdown) {
        return markdown
            .replace(/^#+\s*/gm, "")
            .replace(/\*\*/g, "")
            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
            .replace(/`{1,3}[^`]*`{1,3}/g, "")
            .replace(/^[-*]\s+/gm, "")
            .replace(/\n+/g, " ")
            .replace(/\s{2,}/g, " ")
            .trim();
    }
    buildAnswerFromSnippets(question, role, module, snippets) {
        const lines = [];
        if (module) {
            lines.push(`Basado en el contexto del módulo ${module}, esta es la guía que solicitaste:`);
        }
        else {
            lines.push("Esta es la guía basada en el conocimiento disponible:");
        }
        for (const snippet of snippets.slice(0, 3)) {
            const cleaned = snippet.slice(0, 250);
            lines.push(cleaned);
        }
        lines.push("Verificá los pasos específicos en tu módulo actual antes de tomar acción.");
        return lines.join("\n\n");
    }
    buildFallbackAnswer(question, module) {
        const normalized = question.toLowerCase();
        const moduleHint = module ? ` en el módulo ${module}` : "";
        // Special handling for tickets/support questions
        if (normalized.includes("ticket") || normalized.includes("soporte") ||
            normalized.includes("support") || normalized.includes("issue") ||
            normalized.includes("reportar") || normalized.includes("problema")) {
            if (module === "tickets") {
                return [
                    "Para crear un ticket de soporte:",
                    "1. Ve al módulo de Support",
                    "2. Crea un nuevo ticket indicando:",
                    "   - Título claro del problema",
                    "   - Descripción detallada",
                    "   - Categoría (plomería, eléctrica, etc.)",
                    "   - Prioridad según urgencia",
                    "",
                    "Una vez creado, puedes seguir su estado desde 'Mis tickets'.",
                ].join("\n");
            }
            // If module is not tickets but asking about tickets
            return [
                "El módulo de Support te ayuda a reportar y seguir problemas.",
                "Para acceder: ve a 'Support' en el menú de tu cuenta.",
                "",
                "Actions disponibles:",
                "- Abrir Support: para ver todos los tickets",
                "- Crear Ticket: para reportar un nuevo problema",
                "- Ver Mis Tickets: para ver tus tickets abiertos",
            ].join("\n");
        }
        // Special handling for payments/charges/balance questions
        if (normalized.includes("pago") || normalized.includes("payment") ||
            normalized.includes("balance") || normalized.includes("saldo") ||
            normalized.includes("deuda") || normalized.includes("charge") ||
            normalized.includes("cargo") || normalized.includes("comprobante") ||
            normalized.includes("proof") || normalized.includes("historial")) {
            if (module === "payments" || module === "charges") {
                return [
                    "Para gestionar tus pagos y cargos:",
                    "1. Ve al módulo de Finanzas",
                    "2. En 'Cargos' verás tus cargos pendientes",
                    "3. En 'Pagos' verás tu historial y estados",
                    "",
                    "Actions disponibles:",
                    "- Ver Mi Balance: para ver lo que debes",
                    "- Ver Historial de Pagos: para ver pagos anteriores",
                    "- Reportar Pago: para informar un pago realizado",
                    "- Subir Comprobante: para enviar comprobante de pago",
                ].join("\n");
            }
            // If module is not payments but asking about it
            return [
                "El módulo de Finanzas te ayuda a gestionar pagos y cargos.",
                "Para acceder: ve a 'Finanzas' en el menú de tu cuenta.",
                "",
                "Actions disponibles:",
                "- Abrir Finanzas: para ver pagos y cargos",
                "- Ver Mi Balance: para ver tu saldo actual",
                "- Ver Historial: para ver pagos anteriores",
                "- Reportar Pago: para informar un pago realizado",
            ].join("\n");
        }
        // Special handling for communications/announcements/notices
        if (normalized.includes("comunicado") || normalized.includes("communication") ||
            normalized.includes("announcement") || normalized.includes("notice") ||
            normalized.includes("aviso") || normalized.includes("mensaje") ||
            normalized.includes("noticia") || normalized.includes("inbox") ||
            normalized.includes("administracion")) {
            if (module === "communications") {
                return [
                    "Para gestionar comunicaciones:",
                    "1. Ve al módulo de Comunicaciones",
                    "2. Desde 'Todos' verás las comunicaciones del edificio",
                    "3. Desde 'Bandeja de entrada' verás tus mensajes",
                    "",
                    "Actions disponibles:",
                    "- Abrir Comunicaciones: para ver todas las comunicaciones",
                    "- Crear Comunicación: para enviar un nuevo comunicado",
                    "- Ver Mis Mensajes: para ver tu bandeja de entrada",
                    "- Ver Avisos: para ver avisos del edificio",
                ].join("\n");
            }
            return [
                "El módulo de Comunicaciones te mantiene informado sobre noticias y avisos.",
                "Para acceder: ve a 'Comunicaciones' o 'Mi Bandeja' en el menú.",
                "",
                "Actions disponibles:",
                "- Abrir Comunicaciones: para ver comunicados del edificio",
                "- Ver Mis Mensajes: para ver mensajes recibidos",
                "- Ver Avisos: para ver avisos importantes",
            ].join("\n");
        }
        // Special handling for documents/files/regulation
        if (normalized.includes("documento") || normalized.includes("document") ||
            normalized.includes("file") || normalized.includes("archivo") ||
            normalized.includes("regulation") || normalized.includes("reglamento") ||
            normalized.includes("reglas") || normalized.includes("rules") ||
            normalized.includes("pdf") || normalized.includes("normas")) {
            if (module === "documents") {
                return [
                    "Para gestionar documentos:",
                    "1. Ve al módulo de Documentos",
                    "2. Verás documentos del edificio por categoría",
                    "3. Busca por tipo: reglamentos, contratos, etc.",
                    "",
                    "Actions disponibles:",
                    "- Abrir Documentos: para ver todos los documentos",
                    "- Subir Documento: para cargar un nuevo archivo",
                    "- Ver Reglamentos: para ver reglas del edificio",
                ].join("\n");
            }
            return [
                "El módulo de Documentos te permite acceder a archivos y reglamentos.",
                "Para acceder: ve a 'Documentos' en el menú de tu cuenta.",
                "",
                "Actions disponibles:",
                "- Abrir Documentos: para ver documentos del edificio",
                "- Ver Reglamentos: para ver reglas y normas",
            ].join("\n");
        }
        const knownModules = ["support", "finanzas", "charges", "payments", "tickets", "communications", "documents", "buildings", "units"];
        const matchedModule = knownModules.find(m => normalized.includes(m) || normalized.includes(m.replace("s", "")));
        if (matchedModule && !moduleHint) {
            return [
                `No tengo información específica sobre "${matchedModule}"${moduleHint}.`,
                "Para obtener ayuda:",
                `1. Ve al módulo de ${matchedModule} en el menú`,
                "2. Busca en la documentación disponible",
                "3. Consulta con tu administrador",
            ].join("\n");
        }
        const generalModules = ["Support", "Finanzas", "Comunicaciones", "Documentos", "Edificios"];
        return [
            `No tengo información específica para responder esa pregunta${moduleHint}.`,
            "Puedes probar estos módulos:",
            ...generalModules.slice(0, 3).map(m => `- ${m}`),
            "",
            "Para ayuda específica: navega al módulo correspondiente.",
        ].join("\n");
    }
}
exports.ChatService = ChatService;
