import { describe, it, expect, vi } from "vitest";
import { ChatService } from "./chat.service";
import type { SaasAssistantAdapter, ResolvedAssistantContext, AssistantRuntimeContext } from "@yoryi/ai-types";
import type { KnowledgeDocument, KnowledgeService } from "./knowledge.service";
import type { ChatRequest } from "./chat.service";

describe("ChatService.handle() - integration", () => {
  const mockResolvedContext: ResolvedAssistantContext = {
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

  const mockModuleKnowledge: KnowledgeDocument = {
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

  describe("case 1: with knowledge found", () => {
    it("should return knowledgeUsed.found = true and include sources", async () => {
      const mockAdapter: SaasAssistantAdapter = {
        appId: "buildingos",
        getModules: vi.fn().mockResolvedValue([]),
        getRoles: vi.fn().mockResolvedValue([]),
        getContext: vi.fn().mockResolvedValue(mockResolvedContext),
        getKnowledgeScopes: vi.fn().mockResolvedValue([]),
        getAvailableActions: vi.fn().mockResolvedValue(mockActions),
        canAnswer: vi.fn().mockResolvedValue(true),
      };

      const mockKnowledgeService = {
        getKnowledgeBundle: vi.fn().mockReturnValue([mockModuleKnowledge]),
      } as unknown as KnowledgeService;

      const chatService = new ChatService(mockAdapter as any, mockKnowledgeService);

      const request: ChatRequest = {
        message: "How do I manage charges?",
        context: {
          appId: "buildingos",
          tenantId: "t_123",
          userId: "u_456",
          role: "TENANT_ADMIN",
          route: "/tenant/charges",
        } as AssistantRuntimeContext,
      };

      const result = await chatService.handle(request);

      expect(result.knowledgeUsed?.found).toBe(true);
      expect(result.knowledgeUsed?.sources).toHaveLength(1);
      expect(result.knowledgeUsed?.sources?.[0]).toEqual({
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
      expect(result.actions).toEqual(mockActions);
      expect(result.answer).toContain("módulo charges");
      expect(result.answer).not.toBe("");
      expect(result.answerSource).toBe("knowledge");
      expect(result.responseType).toBe("summary");
      expect(result.dataScope).toBe("tenant");
      expect(result.provenance.strategy).toBe("knowledge");
      expect(result.provenance.sources[0]?.name).toBe("charges.md");
      expect(typeof result.auditId).toBe("string");
    });
  });

  describe("case 2: without knowledge", () => {
    it("should return knowledgeUsed.found = false and use fallback", async () => {
      const mockAdapter: SaasAssistantAdapter = {
        appId: "buildingos",
        getModules: vi.fn().mockResolvedValue([]),
        getRoles: vi.fn().mockResolvedValue([]),
        getContext: vi.fn().mockResolvedValue(mockResolvedContext),
        getKnowledgeScopes: vi.fn().mockResolvedValue([]),
        getAvailableActions: vi.fn().mockResolvedValue(mockActions),
        canAnswer: vi.fn().mockResolvedValue(true),
      };

      const mockKnowledgeService = {
        getKnowledgeBundle: vi.fn().mockReturnValue([]),
      } as unknown as KnowledgeService;

      const chatService = new ChatService(mockAdapter as any, mockKnowledgeService);

      const request: ChatRequest = {
        message: "What is the meaning of life?",
        context: {
          appId: "buildingos",
          tenantId: "t_123",
          userId: "u_456",
          role: "TENANT_ADMIN",
          route: "/tenant/charges",
        } as AssistantRuntimeContext,
      };

      const result = await chatService.handle(request);

      expect(result.knowledgeUsed?.found).toBe(false);
      expect(result.knowledgeUsed?.sources).toHaveLength(0);
      expect(result.answer).toContain("No tengo información específica");
      expect(result.context).toEqual(mockResolvedContext);
      expect(result.answerSource).toBe("fallback");
      expect(result.responseType).toBe("no_data");
      expect(result.provenance.strategy).toBe("fallback");
      expect(result.provenance.sources[0]?.name).toBe("knowledge_not_found");
    });
  });

  describe("case 3: canAnswer = false", () => {
    it("should return safe response with empty actions", async () => {
      const mockAdapter: SaasAssistantAdapter = {
        appId: "buildingos",
        getModules: vi.fn().mockResolvedValue([]),
        getRoles: vi.fn().mockResolvedValue([]),
        getContext: vi.fn().mockResolvedValue(mockResolvedContext),
        getKnowledgeScopes: vi.fn().mockResolvedValue([]),
        getAvailableActions: vi.fn().mockResolvedValue(mockActions),
        canAnswer: vi.fn().mockResolvedValue(false),
      };

      const mockKnowledgeService = {
        getKnowledgeBundle: vi.fn().mockReturnValue([mockModuleKnowledge]),
      } as unknown as KnowledgeService;

      const chatService = new ChatService(mockAdapter as any, mockKnowledgeService);

      const request: ChatRequest = {
        message: "Delete all buildings",
        context: {
          appId: "buildingos",
          tenantId: "t_123",
          userId: "u_456",
          role: "TENANT_ADMIN",
          route: "/tenant/buildings",
        } as AssistantRuntimeContext,
      };

      const result = await chatService.handle(request);

      expect(result.answer).toBe("No puedo responder esta solicitud con el rol o contexto actual.");
      expect(result.actions).toHaveLength(0);
      expect(result.knowledgeUsed?.found).toBe(false);
      expect(result.knowledgeUsed?.sources).toHaveLength(0);
      expect(result.answerSource).toBe("fallback");
    });
  });

  describe("case 4: resolved context propagates correctly", () => {
    it("should return the exact context resolved by adapter", async () => {
      const customResolvedContext: ResolvedAssistantContext = {
        appId: "jurismanager",
        tenantId: "tenant_999",
        userId: "lawyer_42",
        role: "ABOGADO",
        route: "/expedientes",
        currentModule: "expedientes",
        permissions: ["expedientes.read", "expedientes.write"],
      };

      const mockAdapter: SaasAssistantAdapter = {
        appId: "jurismanager",
        getModules: vi.fn().mockResolvedValue([]),
        getRoles: vi.fn().mockResolvedValue([]),
        getContext: vi.fn().mockResolvedValue(customResolvedContext),
        getKnowledgeScopes: vi.fn().mockResolvedValue([]),
        getAvailableActions: vi.fn().mockResolvedValue([]),
        canAnswer: vi.fn().mockResolvedValue(true),
      };

      const mockKnowledgeService = {
        getKnowledgeBundle: vi.fn().mockReturnValue([]),
      } as unknown as KnowledgeService;

      const chatService = new ChatService(mockAdapter as any, mockKnowledgeService);

      const request: ChatRequest = {
        message: "test question",
        context: {
          appId: "jurismanager",
          tenantId: "tenant_999",
          userId: "lawyer_42",
          role: "ABOGADO",
          route: "/expedientes",
        } as AssistantRuntimeContext,
      };

      const result = await chatService.handle(request);

      expect(result.context.appId).toBe("jurismanager");
      expect(result.context.tenantId).toBe("tenant_999");
      expect(result.context.userId).toBe("lawyer_42");
      expect(result.context.role).toBe("ABOGADO");
      expect(result.context.currentModule).toBe("expedientes");
      expect(result.context.permissions).toEqual(["expedientes.read", "expedientes.write"]);
      expect(result.answerSource).toBe("fallback");
    });
  });

  describe("unitOccupantRole propagation", () => {
    it("should propagate unitOccupantRole when provided in request", async () => {
      const contextWithOccupant: ResolvedAssistantContext = {
        appId: "buildingos",
        tenantId: "t_123",
        userId: "u_456",
        role: "RESIDENT",
        route: "/tenant/units/u_001",
        currentModule: "units",
        unitOccupantRole: "OWNER",
        permissions: ["units.read", "charges.read", "payments.read"],
      };

      const mockAdapter: SaasAssistantAdapter = {
        appId: "buildingos",
        getModules: vi.fn().mockResolvedValue([]),
        getRoles: vi.fn().mockResolvedValue([]),
        getContext: vi.fn().mockResolvedValue(contextWithOccupant),
        getKnowledgeScopes: vi.fn().mockResolvedValue([]),
        getAvailableActions: vi.fn().mockResolvedValue([]),
        canAnswer: vi.fn().mockResolvedValue(true),
      };

      const mockKnowledgeService = {
        getKnowledgeBundle: vi.fn().mockReturnValue([]),
      } as unknown as KnowledgeService;

      const chatService = new ChatService(mockAdapter as any, mockKnowledgeService);

      const request: ChatRequest = {
        message: "Why can't I see my charge?",
        context: {
          appId: "buildingos",
          tenantId: "t_123",
          userId: "u_456",
          role: "RESIDENT",
          unitOccupantRole: "OWNER",
          route: "/tenant/units/u_001",
        } as AssistantRuntimeContext,
      };

      const result = await chatService.handle(request);

      expect(result.context.role).toBe("RESIDENT");
      expect(result.context.unitOccupantRole).toBe("OWNER");
      expect(result.answerSource).toBe("fallback");
    });

    it("should handle request without unitOccupantRole (backward compatibility)", async () => {
      const contextWithoutOccupant: ResolvedAssistantContext = {
        appId: "buildingos",
        tenantId: "t_123",
        userId: "u_456",
        role: "RESIDENT",
        route: "/tenant/charges",
        currentModule: "charges",
        permissions: ["charges.read", "payments.read"],
      };

      const mockAdapter: SaasAssistantAdapter = {
        appId: "buildingos",
        getModules: vi.fn().mockResolvedValue([]),
        getRoles: vi.fn().mockResolvedValue([]),
        getContext: vi.fn().mockResolvedValue(contextWithoutOccupant),
        getKnowledgeScopes: vi.fn().mockResolvedValue([]),
        getAvailableActions: vi.fn().mockResolvedValue([]),
        canAnswer: vi.fn().mockResolvedValue(true),
      };

      const mockKnowledgeService = {
        getKnowledgeBundle: vi.fn().mockReturnValue([]),
      } as unknown as KnowledgeService;

      const chatService = new ChatService(mockAdapter as any, mockKnowledgeService);

      const request: ChatRequest = {
        message: "test question",
        context: {
          appId: "buildingos",
          tenantId: "t_123",
          userId: "u_456",
          role: "RESIDENT",
          route: "/tenant/charges",
        } as AssistantRuntimeContext,
      };

      const result = await chatService.handle(request);

      expect(result.context.role).toBe("RESIDENT");
      expect(result.context.unitOccupantRole).toBeUndefined();
      expect(result.answerSource).toBe("fallback");
    });
  });

  describe("case 6: data-backed answer available", () => {
    it("should return live_data answerSource and prioritize exact response", async () => {
      const mockAdapter: SaasAssistantAdapter = {
        appId: "buildingos",
        getModules: vi.fn().mockResolvedValue([]),
        getRoles: vi.fn().mockResolvedValue([]),
        getContext: vi.fn().mockResolvedValue({
          ...mockResolvedContext,
          role: "RESIDENT",
          permissions: ["charges.read", "payments.read"],
        }),
        getKnowledgeScopes: vi.fn().mockResolvedValue([]),
        getAvailableActions: vi.fn().mockResolvedValue(mockActions),
        canAnswer: vi.fn().mockResolvedValue(true),
        resolveDataBackedAnswer: vi.fn().mockResolvedValue({
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
        getKnowledgeBundle: vi.fn().mockReturnValue([mockModuleKnowledge]),
      } as unknown as KnowledgeService;

      const chatService = new ChatService(mockAdapter as any, mockKnowledgeService);

      const result = await chatService.handle({
        message: "¿Cuánto debo?",
        context: {
          appId: "buildingos",
          tenantId: "t_123",
          userId: "u_456",
          role: "RESIDENT",
          route: "/tenant/charges",
        } as AssistantRuntimeContext,
      });

      expect(result.answerSource).toBe("live_data");
      expect(result.answer).toContain("deuda actual");
      expect(result.actions).toHaveLength(2);
      expect(result.knowledgeUsed?.found).toBe(false);
      expect(result.responseType).toBe("metric");
      expect(result.dataScope).toBe("self");
      expect(result.provenance.strategy).toBe("live_data");
      expect(result.provenance.sources[0]?.name).toBe("adapter.resolveDataBackedAnswer");
      expect(typeof result.auditId).toBe("string");
    });
  });

  describe("case 7: session memory and adaptive responses", () => {
    it("flags repeated questions in the same session", async () => {
      const mockAdapter: SaasAssistantAdapter = {
        appId: "buildingos",
        getModules: vi.fn().mockResolvedValue([]),
        getRoles: vi.fn().mockResolvedValue([]),
        getContext: vi.fn().mockResolvedValue({
          ...mockResolvedContext,
          currentModule: "general",
        }),
        getKnowledgeScopes: vi.fn().mockResolvedValue([]),
        getAvailableActions: vi.fn().mockResolvedValue([
          { key: "open-payments", label: "Open Payments" },
        ]),
        canAnswer: vi.fn().mockResolvedValue(true),
      };

      const mockKnowledgeService = {
        getKnowledgeBundle: vi.fn().mockReturnValue([]),
      } as unknown as KnowledgeService;

      const chatService = new ChatService(mockAdapter as any, mockKnowledgeService);

      await chatService.handle({
        message: "¿Cómo pago mis cargos?",
        sessionId: "sess-1",
        context: {
          appId: "buildingos",
          tenantId: "t_123",
          userId: "u_456",
          role: "RESIDENT",
          route: "/resident/finanzas",
        } as AssistantRuntimeContext,
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
        } as AssistantRuntimeContext,
      });

      expect(result.sessionInsights?.repeatedQuestion).toBe(true);
      expect(result.answer).toContain("repetiste esta consulta");
    });

    it("uses recent module context when current module is general", async () => {
      const getContext = vi
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

      const mockAdapter: SaasAssistantAdapter = {
        appId: "buildingos",
        getModules: vi.fn().mockResolvedValue([]),
        getRoles: vi.fn().mockResolvedValue([]),
        getContext,
        getKnowledgeScopes: vi.fn().mockResolvedValue([]),
        getAvailableActions: vi
          .fn()
          .mockResolvedValueOnce([
            { key: "open-charges", label: "Open Charges" },
            { key: "open-payments", label: "Open Payments" },
          ])
          .mockResolvedValueOnce([
            { key: "open-payments", label: "Open Payments" },
            { key: "open-charges", label: "Open Charges" },
          ]),
        canAnswer: vi.fn().mockResolvedValue(true),
      };

      const mockKnowledgeService = {
        getKnowledgeBundle: vi.fn().mockReturnValue([]),
      } as unknown as KnowledgeService;

      const chatService = new ChatService(mockAdapter as any, mockKnowledgeService);

      await chatService.handle({
        message: "Quiero revisar cargos",
        sessionId: "sess-2",
        context: {
          appId: "buildingos",
          tenantId: "t_123",
          userId: "u_456",
          role: "RESIDENT",
          route: "/tenant/charges",
        } as AssistantRuntimeContext,
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
        } as AssistantRuntimeContext,
      });

      expect(result.answerSource).toBe("fallback");
      expect(result.answer).toContain("venías trabajando en charges");
      expect(result.actions[0]?.key).toBe("open-charges");
    });
  });

  describe("case 8: query-only mode", () => {
    it("blocks mutation requests and returns read-only guidance", async () => {
      const executeAction = vi.fn();
      const mockAdapter: SaasAssistantAdapter = {
        appId: "buildingos",
        getModules: vi.fn().mockResolvedValue([]),
        getRoles: vi.fn().mockResolvedValue([]),
        getContext: vi.fn().mockResolvedValue({
          ...mockResolvedContext,
          currentModule: "payments",
          permissions: ["payments.read", "payments.approve"],
        }),
        getKnowledgeScopes: vi.fn().mockResolvedValue([]),
        getAvailableActions: vi.fn().mockResolvedValue([
          { key: "open-payments", label: "Open Payments" },
          {
            key: "review-pending-payments",
            label: "Review Pending Payments",
            requiredPermission: "payments.approve",
          },
        ]),
        canAnswer: vi.fn().mockResolvedValue(true),
        executeAction,
      };

      const mockKnowledgeService = {
        getKnowledgeBundle: vi.fn().mockReturnValue([mockModuleKnowledge]),
      } as unknown as KnowledgeService;

      const chatService = new ChatService(
        mockAdapter as any,
        mockKnowledgeService,
        undefined,
        undefined,
        { queryOnly: true }
      );

      const result = await chatService.handle({
        message: "aprueba este pago",
        context: {
          appId: "buildingos",
          tenantId: "t_123",
          userId: "u_456",
          role: "TENANT_ADMIN",
          route: "/tenant/payments",
        } as AssistantRuntimeContext,
      });

      expect(result.answer).toContain("solo puedo consultar información");
      expect(result.answer).toContain("Finanzas > Pagos");
      expect(result.actions).toHaveLength(0);
      expect(result.answerSource).toBe("fallback");
      expect(mockAdapter.getAvailableActions).not.toHaveBeenCalled();
      expect(mockKnowledgeService.getKnowledgeBundle).not.toHaveBeenCalled();
      expect(executeAction).not.toHaveBeenCalled();
    });

    it("filters transactional actions but keeps read-only navigation actions", async () => {
      const mockAdapter: SaasAssistantAdapter = {
        appId: "buildingos",
        getModules: vi.fn().mockResolvedValue([]),
        getRoles: vi.fn().mockResolvedValue([]),
        getContext: vi.fn().mockResolvedValue({
          ...mockResolvedContext,
          currentModule: "payments",
          permissions: ["payments.read", "payments.write", "payments.approve"],
        }),
        getKnowledgeScopes: vi.fn().mockResolvedValue([]),
        getAvailableActions: vi.fn().mockResolvedValue([
          { key: "open-payments", label: "Open Payments", requiredPermission: "payments.read" },
          { key: "view-payment-history", label: "View Payment History", requiredPermission: "payments.read" },
          { key: "report-payment", label: "Report Payment", requiredPermission: "payments.write" },
          { key: "review-pending-payments", label: "Review Pending Payments", requiredPermission: "payments.approve" },
        ]),
        canAnswer: vi.fn().mockResolvedValue(true),
      };

      const mockKnowledgeService = {
        getKnowledgeBundle: vi.fn().mockReturnValue([]),
      } as unknown as KnowledgeService;

      const chatService = new ChatService(
        mockAdapter as any,
        mockKnowledgeService,
        undefined,
        undefined,
        { queryOnly: true }
      );

      const result = await chatService.handle({
        message: "mostrame mis pagos",
        context: {
          appId: "buildingos",
          tenantId: "t_123",
          userId: "u_456",
          role: "TENANT_ADMIN",
          route: "/tenant/payments",
        } as AssistantRuntimeContext,
      });

      expect(result.actions.map((action) => action.key).sort()).toEqual([
        "open-payments",
        "view-payment-history",
      ]);
    });

    it("does not treat historical approval queries as mutation requests", async () => {
      const mockAdapter: SaasAssistantAdapter = {
        appId: "buildingos",
        getModules: vi.fn().mockResolvedValue([]),
        getRoles: vi.fn().mockResolvedValue([]),
        getContext: vi.fn().mockResolvedValue({
          ...mockResolvedContext,
          currentModule: "payments",
          permissions: ["payments.read"],
        }),
        getKnowledgeScopes: vi.fn().mockResolvedValue([]),
        getAvailableActions: vi.fn().mockResolvedValue([
          { key: "open-payments", label: "Open Payments", requiredPermission: "payments.read" },
        ]),
        canAnswer: vi.fn().mockResolvedValue(true),
      };

      const mockKnowledgeService = {
        getKnowledgeBundle: vi.fn().mockReturnValue([]),
      } as unknown as KnowledgeService;

      const chatService = new ChatService(
        mockAdapter as any,
        mockKnowledgeService,
        undefined,
        undefined,
        { queryOnly: true }
      );

      const result = await chatService.handle({
        message: "¿Qué pagos fueron aprobados hoy?",
        context: {
          appId: "buildingos",
          tenantId: "t_123",
          userId: "u_456",
          role: "TENANT_ADMIN",
          route: "/tenant/payments",
        } as AssistantRuntimeContext,
      });

      expect(result.answer).not.toContain("solo puedo consultar información");
      expect(mockAdapter.getAvailableActions).toHaveBeenCalled();
      expect(result.actions.map((action) => action.key)).toEqual(["open-payments"]);
    });
  });

  describe("case 9: ambiguous routing", () => {
    it("routes ambiguous prompts to clarification without touching data or knowledge layers", async () => {
      const resolveDataBackedAnswer = vi.fn();
      const mockAdapter: SaasAssistantAdapter = {
        appId: "buildingos",
        getModules: vi.fn().mockResolvedValue([]),
        getRoles: vi.fn().mockResolvedValue([]),
        getContext: vi.fn().mockResolvedValue({
          ...mockResolvedContext,
          currentModule: "general",
          route: "/",
          permissions: ["payments.read"],
        }),
        getKnowledgeScopes: vi.fn().mockResolvedValue([]),
        getAvailableActions: vi.fn().mockResolvedValue([
          { key: "open-payments", label: "Open Payments", requiredPermission: "payments.read" },
        ]),
        canAnswer: vi.fn().mockResolvedValue(true),
        resolveDataBackedAnswer,
      };

      const mockKnowledgeService = {
        getKnowledgeBundle: vi.fn().mockReturnValue([mockModuleKnowledge]),
      } as unknown as KnowledgeService;

      const chatService = new ChatService(
        mockAdapter as any,
        mockKnowledgeService,
        undefined,
        undefined,
        { queryOnly: true }
      );

      const result = await chatService.handle({
        message: "¿y eso?",
        context: {
          appId: "buildingos",
          tenantId: "t_123",
          userId: "u_456",
          role: "TENANT_ADMIN",
          route: "/",
        } as AssistantRuntimeContext,
      });

      expect(result.answerSource).toBe("fallback");
      expect(result.answer).toContain("consulta quedó ambigua");
      expect(result.responseType).toBe("clarification");
      expect(result.provenance.sources[0]?.name).toBe("intent_router_ambiguous");
      expect(result.actions).toHaveLength(0);
      expect(mockAdapter.getAvailableActions).not.toHaveBeenCalled();
      expect(resolveDataBackedAnswer).not.toHaveBeenCalled();
      expect(mockKnowledgeService.getKnowledgeBundle).not.toHaveBeenCalled();
    });
  });
});
