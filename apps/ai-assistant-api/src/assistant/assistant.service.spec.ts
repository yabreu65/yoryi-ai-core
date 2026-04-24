import { afterEach, describe, it, expect, vi } from "vitest";
import { AssistantService } from "./assistant.service";
import { PostgresRagStore } from "@yoryi/ai-rag";

describe("AssistantService", () => {
  afterEach(() => {
    delete process.env.ASSISTANT_MODE;
    delete process.env.ASSISTANT_GLOBAL_ENABLED;
    delete process.env.ASSISTANT_ROLLOUT_MODE;
    delete process.env.ASSISTANT_ROLLOUT_TENANTS;
    delete process.env.ASSISTANT_ROLLOUT_CANARY_PERCENT;
    delete process.env.ASSISTANT_ROLLOUT_CANARY_SEED;
    delete process.env.ASSISTANT_ROLLOUT_EXCLUDED_TENANTS;
    delete process.env.RAG_REINDEX_TOKEN;
    delete process.env.RAG_DB_URL;
    delete process.env.ASSISTANT_RATE_LIMIT_ENABLED;
    delete process.env.ASSISTANT_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.ASSISTANT_RATE_LIMIT_WINDOW_MS;
    delete process.env.BUILDINGOS_READONLY_QUERY_API_BASE_URL;
    delete process.env.BUILDINGOS_READONLY_QUERY_API_KEY;
    delete process.env.BUILDINGOS_READONLY_QUERY_TIMEOUT_MS;
    delete process.env.BUILDINGOS_GATEWAY_CB_FAILURE_THRESHOLD;
    delete process.env.BUILDINGOS_GATEWAY_CB_OPEN_MS;
    vi.restoreAllMocks();
  });

  it("uses server-authoritative auth context over body context", async () => {
    const service = new AssistantService();
    const handle = vi.fn().mockResolvedValue({
      message: "¿cuánto debo?",
      answer: "Tu deuda actual es ARS 100.00 (corte: 2026-04-18).",
      answerSource: "live_data",
      context: {
        appId: "buildingos",
        tenantId: "tenant-auth",
        userId: "user-auth",
        role: "RESIDENT",
        route: "/resident/finanzas",
        currentModule: "charges",
        permissions: ["charges.read", "payments.read"],
      },
      actions: [],
      llmUsed: false,
      knowledgeUsed: { found: false, sources: [] },
    });

    (service as any).chatServicesByApp = new Map([
      ["buildingos", { handle }],
    ]);

    await service.handleChat({
      message: "¿cuánto debo?",
      sessionId: "session-1",
      context: {
        appId: "buildingos",
        tenantId: "tenant-body",
        userId: "user-body",
        role: "TENANT_ADMIN",
        route: "/resident/finanzas",
      },
      authContext: {
        appId: "buildingos",
        tenantId: "tenant-auth",
        userId: "user-auth",
        role: "RESIDENT",
      },
    });

    expect(handle).toHaveBeenCalledTimes(1);
    const callInput = handle.mock.calls[0][0];
    expect(callInput.context.tenantId).toBe("tenant-auth");
    expect(callInput.context.userId).toBe("user-auth");
    expect(callInput.context.role).toBe("RESIDENT");
    expect(callInput.sessionId).toBe("session-1");
  });

  it("keeps backward compatibility when auth context is missing", async () => {
    const service = new AssistantService();
    const handle = vi.fn().mockResolvedValue({
      message: "test",
      answer: "ok",
      answerSource: "fallback",
      context: {
        appId: "buildingos",
        userId: "legacy-user",
        role: "RESIDENT",
        route: "/test",
        currentModule: "general",
        permissions: [],
      },
      actions: [],
      llmUsed: false,
      knowledgeUsed: { found: false, sources: [] },
    });

    (service as any).chatServicesByApp = new Map([
      ["buildingos", { handle }],
    ]);

    await service.handleChat({
      message: "test",
      context: {
        appId: "buildingos",
        userId: "legacy-user",
        role: "RESIDENT",
        route: "/test",
      },
    });

    const callInput = handle.mock.calls[0][0];
    expect(callInput.context.userId).toBe("legacy-user");
    expect(callInput.context.role).toBe("RESIDENT");
    expect(callInput.context.route).toBe("/test");
  });

  it("executes action using server-authoritative auth context", async () => {
    process.env.ASSISTANT_MODE = "actions_enabled";
    const service = new AssistantService();
    const getContext = vi.fn().mockResolvedValue({
      appId: "buildingos",
      tenantId: "tenant-auth",
      userId: "user-auth",
      role: "RESIDENT",
      route: "/resident/finanzas",
      currentModule: "payments",
      permissions: ["payments.read"],
    });
    const executeAction = vi.fn().mockResolvedValue({
      status: "executed",
      message: "ok",
      actionKey: "open-payments",
      execution: {
        type: "navigate",
        targetPath: "/tenant/payments",
      },
    });

    (service as any).adaptersByApp = new Map([
      ["buildingos", { getContext, executeAction }],
    ]);

    await service.executeAction({
      actionKey: "open-payments",
      context: {
        appId: "buildingos",
        tenantId: "tenant-body",
        userId: "user-body",
        role: "TENANT_ADMIN",
        route: "/tenant/payments",
      },
      authContext: {
        appId: "buildingos",
        tenantId: "tenant-auth",
        userId: "user-auth",
        role: "RESIDENT",
      },
    });

    expect(getContext).toHaveBeenCalledTimes(1);
    const resolvedInput = getContext.mock.calls[0][0];
    expect(resolvedInput.tenantId).toBe("tenant-auth");
    expect(resolvedInput.userId).toBe("user-auth");
    expect(resolvedInput.role).toBe("RESIDENT");

    expect(executeAction).toHaveBeenCalledTimes(1);
    const executeInput = executeAction.mock.calls[0][0];
    expect(executeInput.actionKey).toBe("open-payments");
    expect(executeInput.context.tenantId).toBe("tenant-auth");
  });

  it("returns not_found when adapter has no action execution support", async () => {
    process.env.ASSISTANT_MODE = "actions_enabled";
    const service = new AssistantService();
    const getContext = vi.fn().mockResolvedValue({
      appId: "buildingos",
      tenantId: "tenant-auth",
      userId: "user-auth",
      role: "RESIDENT",
      route: "/resident/finanzas",
      currentModule: "payments",
      permissions: ["payments.read"],
    });

    (service as any).adaptersByApp = new Map([
      ["buildingos", { getContext }],
    ]);

    const result = await service.executeAction({
      actionKey: "open-payments",
      context: {
        appId: "buildingos",
        tenantId: "tenant-auth",
        userId: "user-auth",
        role: "RESIDENT",
        route: "/resident/finanzas",
      },
    });

    expect(result.status).toBe("not_found");
  });

  it("blocks BuildingOS action execution by default in query-only mode", async () => {
    const service = new AssistantService();
    const getContext = vi.fn();
    const executeAction = vi.fn();

    (service as any).adaptersByApp = new Map([
      ["buildingos", { getContext, executeAction }],
    ]);

    await expect(
      service.executeAction({
        actionKey: "open-payments",
        context: {
          appId: "buildingos",
          tenantId: "tenant-auth",
          userId: "user-auth",
          role: "RESIDENT",
          route: "/resident/finanzas",
        },
      })
    ).rejects.toThrow("modo solo consulta");

    expect(getContext).not.toHaveBeenCalled();
    expect(executeAction).not.toHaveBeenCalled();
  });

  it("routes chat to jurismanager adapter by authoritative appId", async () => {
    const service = new AssistantService();
    const handleJuris = vi.fn().mockResolvedValue({
      message: "estado del expediente",
      answer: "ok",
      answerSource: "knowledge",
      context: {
        appId: "jurismanager",
        userId: "lawyer-auth",
        role: "ABOGADO",
        route: "/juris/expedientes",
        currentModule: "expedientes",
        permissions: ["expedientes.read"],
      },
      actions: [],
      knowledgeUsed: { found: true, sources: [] },
    });
    const handleBuilding = vi.fn().mockResolvedValue({
      message: "x",
      answer: "y",
      answerSource: "fallback",
      context: {
        appId: "buildingos",
        userId: "u",
        role: "RESIDENT",
        route: "/",
        currentModule: "general",
        permissions: [],
      },
      actions: [],
      knowledgeUsed: { found: false, sources: [] },
    });

    (service as any).chatServicesByApp = new Map([
      ["buildingos", { handle: handleBuilding }],
      ["jurismanager", { handle: handleJuris }],
    ]);

    await service.handleChat({
      message: "estado del expediente",
      context: {
        appId: "buildingos",
        route: "/juris/expedientes",
      },
      authContext: {
        appId: "jurismanager",
        userId: "lawyer-auth",
        role: "ABOGADO",
      },
    });

    expect(handleJuris).toHaveBeenCalledTimes(1);
    expect(handleBuilding).not.toHaveBeenCalled();
    const callInput = handleJuris.mock.calls[0][0];
    expect(callInput.context.appId).toBe("jurismanager");
    expect(callInput.context.role).toBe("ABOGADO");
  });

  it("protects rag reindex with configured token", async () => {
    process.env.RAG_REINDEX_TOKEN = "expected-token";
    const service = new AssistantService();
    const reindexApps = vi.fn().mockResolvedValue([
      { appId: "buildingos", totalDocuments: 1, indexedDocuments: 1, skippedDocuments: 0, totalChunks: 2 },
    ]);
    (service as any).ragIndexer = { reindexApps };

    await expect(
      service.reindexRagKnowledge({
        token: "wrong-token",
      })
    ).rejects.toThrow();

    const result = await service.reindexRagKnowledge({
      token: "expected-token",
      apps: ["buildingos"],
    });

    expect(reindexApps).toHaveBeenCalledWith(["buildingos"]);
    expect(result.reports).toHaveLength(1);
  });

  it("uses PostgresRagStore when RAG_DB_URL is configured", () => {
    process.env.RAG_DB_URL = "postgres://user:pass@localhost:5432/rag";
    const service = new AssistantService();

    const store = (service as any).ragIndexer?.store;
    expect(store).toBeInstanceOf(PostgresRagStore);
  });

  it("resolves admin live read-only answers through BuildingOS query gateway", async () => {
    process.env.BUILDINGOS_READONLY_QUERY_API_BASE_URL = "https://buildingos.example.com";
    process.env.BUILDINGOS_READONLY_QUERY_API_KEY = "readonly-key";
    process.env.BUILDINGOS_READONLY_QUERY_TIMEOUT_MS = "950";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        answer: "Resumen del mes: cobranzas por ARS 12.340.000 y morosidad 8.2%.",
        metadata: {
          source: "buildingos-live-read-db",
          reportId: "rpt-2026-04",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const service = new AssistantService();
    const response = await service.handleChat({
      message: "Dame un resumen de cobranzas del mes",
      context: {
        appId: "buildingos",
        tenantId: "tenant-body",
        userId: "user-body",
        role: "RESIDENT",
        route: "/tenant/charges",
      },
      authContext: {
        appId: "buildingos",
        tenantId: "tenant-auth",
        userId: "admin-auth",
        role: "TENANT_ADMIN",
      },
    });

    expect(response.answerSource).toBe("live_data");
    expect(response.answer).toContain("Resumen del mes");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.context.tenantId).toBe("tenant-auth");
    expect(body.context.userId).toBe("admin-auth");
    expect(body.context.role).toBe("TENANT_ADMIN");
  });

  it("enforces rate limiting using authoritative tenant/user context", async () => {
    process.env.ASSISTANT_RATE_LIMIT_MAX_REQUESTS = "1";
    process.env.ASSISTANT_RATE_LIMIT_WINDOW_MS = "60000";

    const service = new AssistantService();
    const handle = vi.fn().mockResolvedValue({
      message: "test",
      answer: "ok",
      answerSource: "fallback",
      responseType: "no_data",
      dataScope: "tenant",
      provenance: { strategy: "fallback", sources: [] },
      auditId: "audit-1",
      context: {
        appId: "buildingos",
        userId: "user-auth",
        role: "RESIDENT",
        route: "/test",
        currentModule: "general",
        permissions: [],
      },
      actions: [],
      llmUsed: false,
      knowledgeUsed: { found: false, sources: [] },
    });

    (service as any).chatServicesByApp = new Map([
      ["buildingos", { handle }],
    ]);

    await service.handleChat({
      message: "uno",
      context: {
        appId: "buildingos",
        tenantId: "tenant-body",
        userId: "user-body",
        role: "TENANT_ADMIN",
        route: "/test",
      },
      authContext: {
        appId: "buildingos",
        tenantId: "tenant-auth",
        userId: "user-auth",
        role: "RESIDENT",
      },
    });

    await expect(
      service.handleChat({
        message: "dos",
        context: {
          appId: "buildingos",
          tenantId: "tenant-body-spoof",
          userId: "user-body-spoof",
          role: "TENANT_ADMIN",
          route: "/test",
        },
        authContext: {
          appId: "buildingos",
          tenantId: "tenant-auth",
          userId: "user-auth",
          role: "RESIDENT",
        },
      })
    ).rejects.toThrow("límite temporal");

    expect(handle).toHaveBeenCalledTimes(1);
  });

  it("blocks chat when tenant is outside rollout allowlist", async () => {
    process.env.ASSISTANT_ROLLOUT_MODE = "allowlist";
    process.env.ASSISTANT_ROLLOUT_TENANTS = "tenant-allowed";

    const service = new AssistantService();
    await expect(
      service.handleChat({
        message: "hola",
        context: {
          appId: "buildingos",
          tenantId: "tenant-body",
          userId: "user-body",
          role: "TENANT_ADMIN",
          route: "/tenant/dashboard",
        },
        authContext: {
          appId: "buildingos",
          tenantId: "tenant-blocked",
          userId: "admin-auth",
          role: "TENANT_ADMIN",
        },
      })
    ).rejects.toThrow("tenant_not_allowlisted");
  });

  it("returns rollout status using authoritative auth context", () => {
    process.env.ASSISTANT_ROLLOUT_MODE = "allowlist";
    process.env.ASSISTANT_ROLLOUT_TENANTS = "tenant-allowed";
    const service = new AssistantService();

    const result = service.getRolloutStatus({
      context: {
        appId: "buildingos",
        tenantId: "tenant-body",
        userId: "user-body",
        role: "TENANT_ADMIN",
        route: "/tenant/dashboard",
      },
      authContext: {
        appId: "buildingos",
        tenantId: "tenant-allowed",
        userId: "admin-auth",
        role: "TENANT_ADMIN",
      },
    });

    expect(result.context.tenantId).toBe("tenant-allowed");
    expect(result.decision.enabled).toBe(true);
    expect(result.decision.reason).toBe("tenant_allowlisted");
  });
});
