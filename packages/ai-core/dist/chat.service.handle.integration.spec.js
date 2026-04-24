"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const chat_service_1 = require("./chat.service");
(0, vitest_1.describe)("ChatService.handle() - integration", () => {
    const mockResolvedContext = {
        appId: "buildingos",
        tenantId: "t_123",
        userId: "u_456",
        role: "TENANT_ADMIN",
        route: "/tenant/charges",
        currentModule: "charges",
        permissions: ["charges.read", "charges.write"],
    };
    const mockActions = [
        { key: "open-charges", label: "Open Charges", description: "Navigate to Charges" },
    ];
    const mockModuleKnowledge = {
        type: "module",
        fileName: "charges.md",
        filePath: "/buildingos/modules/charges.md",
        content: "The Charges module manages monthly financial charges for units.",
        retrievalTrace: {
            rankingVersion: "v1",
            strategyId: "default-v1",
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
    };
    (0, vitest_1.describe)("case 1: with knowledge found", () => {
        (0, vitest_1.it)("should return knowledgeUsed.found = true and include sources", async () => {
            const mockAdapter = {
                appId: "buildingos",
                getModules: vitest_1.vi.fn().mockResolvedValue([]),
                getRoles: vitest_1.vi.fn().mockResolvedValue([]),
                getContext: vitest_1.vi.fn().mockResolvedValue(mockResolvedContext),
                getKnowledgeScopes: vitest_1.vi.fn().mockResolvedValue([]),
                getAvailableActions: vitest_1.vi.fn().mockResolvedValue(mockActions),
                canAnswer: vitest_1.vi.fn().mockResolvedValue(true),
            };
            const mockKnowledgeService = {
                getKnowledgeBundle: vitest_1.vi.fn().mockReturnValue([mockModuleKnowledge]),
            };
            const chatService = new chat_service_1.ChatService(mockAdapter, mockKnowledgeService);
            const request = {
                message: "How do I manage charges?",
                context: {
                    appId: "buildingos",
                    tenantId: "t_123",
                    userId: "u_456",
                    role: "TENANT_ADMIN",
                    route: "/tenant/charges",
                },
            };
            const result = await chatService.handle(request);
            (0, vitest_1.expect)(result.knowledgeUsed?.found).toBe(true);
            (0, vitest_1.expect)(result.knowledgeUsed?.sources).toHaveLength(1);
            (0, vitest_1.expect)(result.knowledgeUsed?.sources?.[0]).toEqual({
                type: "module",
                fileName: "charges.md",
                trace: {
                    rankingVersion: "v1",
                    strategyId: "default-v1",
                    moduleScore: 0,
                    keywordScore: 0,
                    tagScore: 0,
                    occupantScore: 0,
                    totalScore: 0,
                    matchedModule: true,
                    matchedOccupantScope: false,
                    matchedTags: [],
                    matchedKeywords: [],
                },
            });
            (0, vitest_1.expect)(result.actions).toEqual(mockActions);
            (0, vitest_1.expect)(result.answer).toContain("módulo charges");
            (0, vitest_1.expect)(result.answer).not.toBe("");
            (0, vitest_1.expect)(result.answerSource).toBe("knowledge");
            (0, vitest_1.expect)(result.responseType).toBe("summary");
            (0, vitest_1.expect)(result.dataScope).toBe("tenant");
            (0, vitest_1.expect)(result.provenance.strategy).toBe("knowledge");
            (0, vitest_1.expect)(result.provenance.sources[0]?.name).toBe("charges.md");
            (0, vitest_1.expect)(typeof result.auditId).toBe("string");
        });
    });
    (0, vitest_1.describe)("case 2: without knowledge", () => {
        (0, vitest_1.it)("should return knowledgeUsed.found = false and use fallback", async () => {
            const mockAdapter = {
                appId: "buildingos",
                getModules: vitest_1.vi.fn().mockResolvedValue([]),
                getRoles: vitest_1.vi.fn().mockResolvedValue([]),
                getContext: vitest_1.vi.fn().mockResolvedValue(mockResolvedContext),
                getKnowledgeScopes: vitest_1.vi.fn().mockResolvedValue([]),
                getAvailableActions: vitest_1.vi.fn().mockResolvedValue(mockActions),
                canAnswer: vitest_1.vi.fn().mockResolvedValue(true),
            };
            const mockKnowledgeService = {
                getKnowledgeBundle: vitest_1.vi.fn().mockReturnValue([]),
            };
            const chatService = new chat_service_1.ChatService(mockAdapter, mockKnowledgeService);
            const request = {
                message: "What is the meaning of life?",
                context: {
                    appId: "buildingos",
                    tenantId: "t_123",
                    userId: "u_456",
                    role: "TENANT_ADMIN",
                    route: "/tenant/charges",
                },
            };
            const result = await chatService.handle(request);
            (0, vitest_1.expect)(result.knowledgeUsed?.found).toBe(false);
            (0, vitest_1.expect)(result.knowledgeUsed?.sources).toHaveLength(0);
            (0, vitest_1.expect)(result.answer).toContain("No tengo información específica");
            (0, vitest_1.expect)(result.context).toEqual(mockResolvedContext);
            (0, vitest_1.expect)(result.answerSource).toBe("fallback");
            (0, vitest_1.expect)(result.responseType).toBe("no_data");
            (0, vitest_1.expect)(result.provenance.strategy).toBe("fallback");
            (0, vitest_1.expect)(result.provenance.sources[0]?.name).toBe("knowledge_not_found");
        });
    });
    (0, vitest_1.describe)("case 3: canAnswer = false", () => {
        (0, vitest_1.it)("should return safe response with empty actions", async () => {
            const mockAdapter = {
                appId: "buildingos",
                getModules: vitest_1.vi.fn().mockResolvedValue([]),
                getRoles: vitest_1.vi.fn().mockResolvedValue([]),
                getContext: vitest_1.vi.fn().mockResolvedValue(mockResolvedContext),
                getKnowledgeScopes: vitest_1.vi.fn().mockResolvedValue([]),
                getAvailableActions: vitest_1.vi.fn().mockResolvedValue(mockActions),
                canAnswer: vitest_1.vi.fn().mockResolvedValue(false),
            };
            const mockKnowledgeService = {
                getKnowledgeBundle: vitest_1.vi.fn().mockReturnValue([mockModuleKnowledge]),
            };
            const chatService = new chat_service_1.ChatService(mockAdapter, mockKnowledgeService);
            const request = {
                message: "Delete all buildings",
                context: {
                    appId: "buildingos",
                    tenantId: "t_123",
                    userId: "u_456",
                    role: "TENANT_ADMIN",
                    route: "/tenant/buildings",
                },
            };
            const result = await chatService.handle(request);
            (0, vitest_1.expect)(result.answer).toBe("No puedo responder esta solicitud con el rol o contexto actual.");
            (0, vitest_1.expect)(result.actions).toHaveLength(0);
            (0, vitest_1.expect)(result.knowledgeUsed?.found).toBe(false);
            (0, vitest_1.expect)(result.knowledgeUsed?.sources).toHaveLength(0);
            (0, vitest_1.expect)(result.answerSource).toBe("fallback");
        });
    });
    (0, vitest_1.describe)("case 4: resolved context propagates correctly", () => {
        (0, vitest_1.it)("should return the exact context resolved by adapter", async () => {
            const customResolvedContext = {
                appId: "jurismanager",
                tenantId: "tenant_999",
                userId: "lawyer_42",
                role: "ABOGADO",
                route: "/expedientes",
                currentModule: "expedientes",
                permissions: ["expedientes.read", "expedientes.write"],
            };
            const mockAdapter = {
                appId: "jurismanager",
                getModules: vitest_1.vi.fn().mockResolvedValue([]),
                getRoles: vitest_1.vi.fn().mockResolvedValue([]),
                getContext: vitest_1.vi.fn().mockResolvedValue(customResolvedContext),
                getKnowledgeScopes: vitest_1.vi.fn().mockResolvedValue([]),
                getAvailableActions: vitest_1.vi.fn().mockResolvedValue([]),
                canAnswer: vitest_1.vi.fn().mockResolvedValue(true),
            };
            const mockKnowledgeService = {
                getKnowledgeBundle: vitest_1.vi.fn().mockReturnValue([]),
            };
            const chatService = new chat_service_1.ChatService(mockAdapter, mockKnowledgeService);
            const request = {
                message: "test question",
                context: {
                    appId: "jurismanager",
                    tenantId: "tenant_999",
                    userId: "lawyer_42",
                    role: "ABOGADO",
                    route: "/expedientes",
                },
            };
            const result = await chatService.handle(request);
            (0, vitest_1.expect)(result.context.appId).toBe("jurismanager");
            (0, vitest_1.expect)(result.context.tenantId).toBe("tenant_999");
            (0, vitest_1.expect)(result.context.userId).toBe("lawyer_42");
            (0, vitest_1.expect)(result.context.role).toBe("ABOGADO");
            (0, vitest_1.expect)(result.context.currentModule).toBe("expedientes");
            (0, vitest_1.expect)(result.context.permissions).toEqual(["expedientes.read", "expedientes.write"]);
            (0, vitest_1.expect)(result.answerSource).toBe("fallback");
        });
    });
    (0, vitest_1.describe)("unitOccupantRole propagation", () => {
        (0, vitest_1.it)("should propagate unitOccupantRole when provided in request", async () => {
            const contextWithOccupant = {
                appId: "buildingos",
                tenantId: "t_123",
                userId: "u_456",
                role: "RESIDENT",
                route: "/tenant/units/u_001",
                currentModule: "units",
                unitOccupantRole: "OWNER",
                permissions: ["units.read", "charges.read", "payments.read"],
            };
            const mockAdapter = {
                appId: "buildingos",
                getModules: vitest_1.vi.fn().mockResolvedValue([]),
                getRoles: vitest_1.vi.fn().mockResolvedValue([]),
                getContext: vitest_1.vi.fn().mockResolvedValue(contextWithOccupant),
                getKnowledgeScopes: vitest_1.vi.fn().mockResolvedValue([]),
                getAvailableActions: vitest_1.vi.fn().mockResolvedValue([]),
                canAnswer: vitest_1.vi.fn().mockResolvedValue(true),
            };
            const mockKnowledgeService = {
                getKnowledgeBundle: vitest_1.vi.fn().mockReturnValue([]),
            };
            const chatService = new chat_service_1.ChatService(mockAdapter, mockKnowledgeService);
            const request = {
                message: "Why can't I see my charge?",
                context: {
                    appId: "buildingos",
                    tenantId: "t_123",
                    userId: "u_456",
                    role: "RESIDENT",
                    unitOccupantRole: "OWNER",
                    route: "/tenant/units/u_001",
                },
            };
            const result = await chatService.handle(request);
            (0, vitest_1.expect)(result.context.role).toBe("RESIDENT");
            (0, vitest_1.expect)(result.context.unitOccupantRole).toBe("OWNER");
            (0, vitest_1.expect)(result.answerSource).toBe("fallback");
        });
        (0, vitest_1.it)("should handle request without unitOccupantRole (backward compatibility)", async () => {
            const contextWithoutOccupant = {
                appId: "buildingos",
                tenantId: "t_123",
                userId: "u_456",
                role: "RESIDENT",
                route: "/tenant/charges",
                currentModule: "charges",
                permissions: ["charges.read", "payments.read"],
            };
            const mockAdapter = {
                appId: "buildingos",
                getModules: vitest_1.vi.fn().mockResolvedValue([]),
                getRoles: vitest_1.vi.fn().mockResolvedValue([]),
                getContext: vitest_1.vi.fn().mockResolvedValue(contextWithoutOccupant),
                getKnowledgeScopes: vitest_1.vi.fn().mockResolvedValue([]),
                getAvailableActions: vitest_1.vi.fn().mockResolvedValue([]),
                canAnswer: vitest_1.vi.fn().mockResolvedValue(true),
            };
            const mockKnowledgeService = {
                getKnowledgeBundle: vitest_1.vi.fn().mockReturnValue([]),
            };
            const chatService = new chat_service_1.ChatService(mockAdapter, mockKnowledgeService);
            const request = {
                message: "test question",
                context: {
                    appId: "buildingos",
                    tenantId: "t_123",
                    userId: "u_456",
                    role: "RESIDENT",
                    route: "/tenant/charges",
                },
            };
            const result = await chatService.handle(request);
            (0, vitest_1.expect)(result.context.role).toBe("RESIDENT");
            (0, vitest_1.expect)(result.context.unitOccupantRole).toBeUndefined();
            (0, vitest_1.expect)(result.answerSource).toBe("fallback");
        });
    });
    (0, vitest_1.describe)("case 6: data-backed answer available", () => {
        (0, vitest_1.it)("should return live_data answerSource and prioritize exact response", async () => {
            const mockAdapter = {
                appId: "buildingos",
                getModules: vitest_1.vi.fn().mockResolvedValue([]),
                getRoles: vitest_1.vi.fn().mockResolvedValue([]),
                getContext: vitest_1.vi.fn().mockResolvedValue({
                    ...mockResolvedContext,
                    role: "RESIDENT",
                    permissions: ["charges.read", "payments.read"],
                }),
                getKnowledgeScopes: vitest_1.vi.fn().mockResolvedValue([]),
                getAvailableActions: vitest_1.vi.fn().mockResolvedValue(mockActions),
                canAnswer: vitest_1.vi.fn().mockResolvedValue(true),
                resolveDataBackedAnswer: vitest_1.vi.fn().mockResolvedValue({
                    answer: "Tu deuda actual es ARS 100.00 (corte: 2026-04-18).",
                    actions: [
                        { key: "view-my-balance", label: "View My Balance" },
                        { key: "view-pending-charges", label: "View Pending Charges" },
                    ],
                    metadata: {
                        debtAnswerExact: true,
                        financialGatewayLatencyMs: 50,
                    },
                }),
            };
            const mockKnowledgeService = {
                getKnowledgeBundle: vitest_1.vi.fn().mockReturnValue([mockModuleKnowledge]),
            };
            const chatService = new chat_service_1.ChatService(mockAdapter, mockKnowledgeService);
            const result = await chatService.handle({
                message: "¿Cuánto debo?",
                context: {
                    appId: "buildingos",
                    tenantId: "t_123",
                    userId: "u_456",
                    role: "RESIDENT",
                    route: "/tenant/charges",
                },
            });
            (0, vitest_1.expect)(result.answerSource).toBe("live_data");
            (0, vitest_1.expect)(result.answer).toContain("deuda actual");
            (0, vitest_1.expect)(result.actions).toHaveLength(2);
            (0, vitest_1.expect)(result.knowledgeUsed?.found).toBe(false);
            (0, vitest_1.expect)(result.responseType).toBe("metric");
            (0, vitest_1.expect)(result.dataScope).toBe("self");
            (0, vitest_1.expect)(result.provenance.strategy).toBe("live_data");
            (0, vitest_1.expect)(result.provenance.sources[0]?.name).toBe("adapter.resolveDataBackedAnswer");
            (0, vitest_1.expect)(typeof result.auditId).toBe("string");
        });
    });
    (0, vitest_1.describe)("case 7: session memory and adaptive responses", () => {
        (0, vitest_1.it)("flags repeated questions in the same session", async () => {
            const mockAdapter = {
                appId: "buildingos",
                getModules: vitest_1.vi.fn().mockResolvedValue([]),
                getRoles: vitest_1.vi.fn().mockResolvedValue([]),
                getContext: vitest_1.vi.fn().mockResolvedValue({
                    ...mockResolvedContext,
                    currentModule: "general",
                }),
                getKnowledgeScopes: vitest_1.vi.fn().mockResolvedValue([]),
                getAvailableActions: vitest_1.vi.fn().mockResolvedValue([
                    { key: "open-payments", label: "Open Payments" },
                ]),
                canAnswer: vitest_1.vi.fn().mockResolvedValue(true),
            };
            const mockKnowledgeService = {
                getKnowledgeBundle: vitest_1.vi.fn().mockReturnValue([]),
            };
            const chatService = new chat_service_1.ChatService(mockAdapter, mockKnowledgeService);
            await chatService.handle({
                message: "¿Cómo pago mis cargos?",
                sessionId: "sess-1",
                context: {
                    appId: "buildingos",
                    tenantId: "t_123",
                    userId: "u_456",
                    role: "RESIDENT",
                    route: "/resident/finanzas",
                },
            });
            const result = await chatService.handle({
                message: "¿Cómo pago mis cargos?",
                sessionId: "sess-1",
                context: {
                    appId: "buildingos",
                    tenantId: "t_123",
                    userId: "u_456",
                    role: "RESIDENT",
                    route: "/resident/finanzas",
                },
            });
            (0, vitest_1.expect)(result.sessionInsights?.repeatedQuestion).toBe(true);
            (0, vitest_1.expect)(result.answer).toContain("repetiste esta consulta");
        });
        (0, vitest_1.it)("uses recent module context when current module is general", async () => {
            const getContext = vitest_1.vi
                .fn()
                .mockResolvedValueOnce({
                ...mockResolvedContext,
                currentModule: "charges",
            })
                .mockResolvedValueOnce({
                ...mockResolvedContext,
                currentModule: "general",
                route: "/",
            });
            const mockAdapter = {
                appId: "buildingos",
                getModules: vitest_1.vi.fn().mockResolvedValue([]),
                getRoles: vitest_1.vi.fn().mockResolvedValue([]),
                getContext,
                getKnowledgeScopes: vitest_1.vi.fn().mockResolvedValue([]),
                getAvailableActions: vitest_1.vi
                    .fn()
                    .mockResolvedValueOnce([
                    { key: "open-charges", label: "Open Charges" },
                    { key: "open-payments", label: "Open Payments" },
                ])
                    .mockResolvedValueOnce([
                    { key: "open-payments", label: "Open Payments" },
                    { key: "open-charges", label: "Open Charges" },
                ]),
                canAnswer: vitest_1.vi.fn().mockResolvedValue(true),
            };
            const mockKnowledgeService = {
                getKnowledgeBundle: vitest_1.vi.fn().mockReturnValue([]),
            };
            const chatService = new chat_service_1.ChatService(mockAdapter, mockKnowledgeService);
            await chatService.handle({
                message: "Quiero revisar cargos",
                sessionId: "sess-2",
                context: {
                    appId: "buildingos",
                    tenantId: "t_123",
                    userId: "u_456",
                    role: "RESIDENT",
                    route: "/tenant/charges",
                },
            });
            const result = await chatService.handle({
                message: "¿Qué hago ahora?",
                sessionId: "sess-2",
                context: {
                    appId: "buildingos",
                    tenantId: "t_123",
                    userId: "u_456",
                    role: "RESIDENT",
                    route: "/",
                },
            });
            (0, vitest_1.expect)(result.answerSource).toBe("fallback");
            (0, vitest_1.expect)(result.answer).toContain("venías trabajando en charges");
            (0, vitest_1.expect)(result.actions[0]?.key).toBe("open-charges");
        });
    });
    (0, vitest_1.describe)("case 8: query-only mode", () => {
        (0, vitest_1.it)("blocks mutation requests and returns read-only guidance", async () => {
            const executeAction = vitest_1.vi.fn();
            const mockAdapter = {
                appId: "buildingos",
                getModules: vitest_1.vi.fn().mockResolvedValue([]),
                getRoles: vitest_1.vi.fn().mockResolvedValue([]),
                getContext: vitest_1.vi.fn().mockResolvedValue({
                    ...mockResolvedContext,
                    currentModule: "payments",
                    permissions: ["payments.read", "payments.approve"],
                }),
                getKnowledgeScopes: vitest_1.vi.fn().mockResolvedValue([]),
                getAvailableActions: vitest_1.vi.fn().mockResolvedValue([
                    { key: "open-payments", label: "Open Payments" },
                    {
                        key: "review-pending-payments",
                        label: "Review Pending Payments",
                        requiredPermission: "payments.approve",
                    },
                ]),
                canAnswer: vitest_1.vi.fn().mockResolvedValue(true),
                executeAction,
            };
            const mockKnowledgeService = {
                getKnowledgeBundle: vitest_1.vi.fn().mockReturnValue([mockModuleKnowledge]),
            };
            const chatService = new chat_service_1.ChatService(mockAdapter, mockKnowledgeService, undefined, undefined, { queryOnly: true });
            const result = await chatService.handle({
                message: "aprueba este pago",
                context: {
                    appId: "buildingos",
                    tenantId: "t_123",
                    userId: "u_456",
                    role: "TENANT_ADMIN",
                    route: "/tenant/payments",
                },
            });
            (0, vitest_1.expect)(result.answer).toContain("solo puedo consultar información");
            (0, vitest_1.expect)(result.answer).toContain("Finanzas > Pagos");
            (0, vitest_1.expect)(result.actions).toHaveLength(0);
            (0, vitest_1.expect)(result.answerSource).toBe("fallback");
            (0, vitest_1.expect)(mockAdapter.getAvailableActions).not.toHaveBeenCalled();
            (0, vitest_1.expect)(mockKnowledgeService.getKnowledgeBundle).not.toHaveBeenCalled();
            (0, vitest_1.expect)(executeAction).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)("filters transactional actions but keeps read-only navigation actions", async () => {
            const mockAdapter = {
                appId: "buildingos",
                getModules: vitest_1.vi.fn().mockResolvedValue([]),
                getRoles: vitest_1.vi.fn().mockResolvedValue([]),
                getContext: vitest_1.vi.fn().mockResolvedValue({
                    ...mockResolvedContext,
                    currentModule: "payments",
                    permissions: ["payments.read", "payments.write", "payments.approve"],
                }),
                getKnowledgeScopes: vitest_1.vi.fn().mockResolvedValue([]),
                getAvailableActions: vitest_1.vi.fn().mockResolvedValue([
                    { key: "open-payments", label: "Open Payments", requiredPermission: "payments.read" },
                    { key: "view-payment-history", label: "View Payment History", requiredPermission: "payments.read" },
                    { key: "report-payment", label: "Report Payment", requiredPermission: "payments.write" },
                    { key: "review-pending-payments", label: "Review Pending Payments", requiredPermission: "payments.approve" },
                ]),
                canAnswer: vitest_1.vi.fn().mockResolvedValue(true),
            };
            const mockKnowledgeService = {
                getKnowledgeBundle: vitest_1.vi.fn().mockReturnValue([]),
            };
            const chatService = new chat_service_1.ChatService(mockAdapter, mockKnowledgeService, undefined, undefined, { queryOnly: true });
            const result = await chatService.handle({
                message: "mostrame mis pagos",
                context: {
                    appId: "buildingos",
                    tenantId: "t_123",
                    userId: "u_456",
                    role: "TENANT_ADMIN",
                    route: "/tenant/payments",
                },
            });
            (0, vitest_1.expect)(result.actions.map((action) => action.key).sort()).toEqual([
                "open-payments",
                "view-payment-history",
            ]);
        });
        (0, vitest_1.it)("does not treat historical approval queries as mutation requests", async () => {
            const mockAdapter = {
                appId: "buildingos",
                getModules: vitest_1.vi.fn().mockResolvedValue([]),
                getRoles: vitest_1.vi.fn().mockResolvedValue([]),
                getContext: vitest_1.vi.fn().mockResolvedValue({
                    ...mockResolvedContext,
                    currentModule: "payments",
                    permissions: ["payments.read"],
                }),
                getKnowledgeScopes: vitest_1.vi.fn().mockResolvedValue([]),
                getAvailableActions: vitest_1.vi.fn().mockResolvedValue([
                    { key: "open-payments", label: "Open Payments", requiredPermission: "payments.read" },
                ]),
                canAnswer: vitest_1.vi.fn().mockResolvedValue(true),
            };
            const mockKnowledgeService = {
                getKnowledgeBundle: vitest_1.vi.fn().mockReturnValue([]),
            };
            const chatService = new chat_service_1.ChatService(mockAdapter, mockKnowledgeService, undefined, undefined, { queryOnly: true });
            const result = await chatService.handle({
                message: "¿Qué pagos fueron aprobados hoy?",
                context: {
                    appId: "buildingos",
                    tenantId: "t_123",
                    userId: "u_456",
                    role: "TENANT_ADMIN",
                    route: "/tenant/payments",
                },
            });
            (0, vitest_1.expect)(result.answer).not.toContain("solo puedo consultar información");
            (0, vitest_1.expect)(mockAdapter.getAvailableActions).toHaveBeenCalled();
            (0, vitest_1.expect)(result.actions.map((action) => action.key)).toEqual(["open-payments"]);
        });
    });
    (0, vitest_1.describe)("case 9: ambiguous routing", () => {
        (0, vitest_1.it)("routes ambiguous prompts to clarification without touching data or knowledge layers", async () => {
            const resolveDataBackedAnswer = vitest_1.vi.fn();
            const mockAdapter = {
                appId: "buildingos",
                getModules: vitest_1.vi.fn().mockResolvedValue([]),
                getRoles: vitest_1.vi.fn().mockResolvedValue([]),
                getContext: vitest_1.vi.fn().mockResolvedValue({
                    ...mockResolvedContext,
                    currentModule: "general",
                    route: "/",
                    permissions: ["payments.read"],
                }),
                getKnowledgeScopes: vitest_1.vi.fn().mockResolvedValue([]),
                getAvailableActions: vitest_1.vi.fn().mockResolvedValue([
                    { key: "open-payments", label: "Open Payments", requiredPermission: "payments.read" },
                ]),
                canAnswer: vitest_1.vi.fn().mockResolvedValue(true),
                resolveDataBackedAnswer,
            };
            const mockKnowledgeService = {
                getKnowledgeBundle: vitest_1.vi.fn().mockReturnValue([mockModuleKnowledge]),
            };
            const chatService = new chat_service_1.ChatService(mockAdapter, mockKnowledgeService, undefined, undefined, { queryOnly: true });
            const result = await chatService.handle({
                message: "¿y eso?",
                context: {
                    appId: "buildingos",
                    tenantId: "t_123",
                    userId: "u_456",
                    role: "TENANT_ADMIN",
                    route: "/",
                },
            });
            (0, vitest_1.expect)(result.answerSource).toBe("fallback");
            (0, vitest_1.expect)(result.answer).toContain("consulta quedó ambigua");
            (0, vitest_1.expect)(result.responseType).toBe("clarification");
            (0, vitest_1.expect)(result.provenance.sources[0]?.name).toBe("intent_router_ambiguous");
            (0, vitest_1.expect)(result.actions).toHaveLength(0);
            (0, vitest_1.expect)(mockAdapter.getAvailableActions).not.toHaveBeenCalled();
            (0, vitest_1.expect)(resolveDataBackedAnswer).not.toHaveBeenCalled();
            (0, vitest_1.expect)(mockKnowledgeService.getKnowledgeBundle).not.toHaveBeenCalled();
        });
    });
});
