import { afterEach, describe, it, expect, vi } from "vitest";
import { AssistantController } from "./assistant.controller";

describe("AssistantController", () => {
  afterEach(() => {
    delete process.env.ASSISTANT_MODE;
  });

  it("forwards authoritative context resolved by guard", async () => {
    const handleChat = vi.fn().mockResolvedValue({
      message: "test",
      answer: "ok",
      answerSource: "fallback",
      context: {
        appId: "buildingos",
        userId: "u",
        role: "RESIDENT",
        route: "/test",
        currentModule: "general",
        permissions: [],
      },
      actions: [],
      llmUsed: false,
      knowledgeUsed: { found: false, sources: [] },
    });
    const reindexRagKnowledge = vi.fn().mockResolvedValue({
      reports: [],
    });

    const controller = new AssistantController({
      handleChat,
      reindexRagKnowledge,
    } as any);

    await controller.chat(
      {
        message: "test",
        context: {
          appId: "buildingos",
          userId: "user-body",
          role: "TENANT_ADMIN",
          route: "/test",
        },
        sessionId: "session-1",
      } as any,
      {
        authContext: {
          appId: "buildingos",
          tenantId: "tenant-auth",
          userId: "user-auth",
          role: "RESIDENT",
        },
      } as any
    );

    expect(handleChat).toHaveBeenCalledTimes(1);
    const callArg = handleChat.mock.calls[0][0];
    expect(callArg.authContext.userId).toBe("user-auth");
    expect(callArg.authContext.role).toBe("RESIDENT");
    expect(callArg.authContext.tenantId).toBe("tenant-auth");
    expect(callArg.sessionId).toBe("session-1");
  });

  it("forwards authoritative context for action execution", async () => {
    process.env.ASSISTANT_MODE = "actions_enabled";
    const executeAction = vi.fn().mockResolvedValue({
      status: "executed",
      message: "ok",
      actionKey: "open-payments",
      execution: {
        type: "navigate",
        targetPath: "/tenant/payments",
      },
    });

    const controller = new AssistantController({
      handleChat: vi.fn(),
      executeAction,
      reindexRagKnowledge: vi.fn(),
    } as any);

    await controller.executeAction(
      {
        actionKey: "open-payments",
        context: {
          appId: "buildingos",
          userId: "user-body",
          role: "TENANT_ADMIN",
          route: "/tenant/payments",
        },
        confirmed: false,
      } as any,
      {
        authContext: {
          appId: "buildingos",
          tenantId: "tenant-auth",
          userId: "user-auth",
          role: "RESIDENT",
        },
      } as any
    );

    expect(executeAction).toHaveBeenCalledTimes(1);
    const callArg = executeAction.mock.calls[0][0];
    expect(callArg.actionKey).toBe("open-payments");
    expect(callArg.authContext.userId).toBe("user-auth");
    expect(callArg.authContext.role).toBe("RESIDENT");
    expect(callArg.authContext.tenantId).toBe("tenant-auth");
  });

  it("blocks action execution for BuildingOS in query-only mode", async () => {
    const executeAction = vi.fn();

    const controller = new AssistantController({
      handleChat: vi.fn(),
      executeAction,
      reindexRagKnowledge: vi.fn(),
    } as any);

    await expect(
      controller.executeAction(
        {
          actionKey: "open-payments",
          context: {
            appId: "buildingos",
            userId: "user-body",
            role: "TENANT_ADMIN",
            route: "/tenant/payments",
          },
        } as any,
        {
          authContext: {
            appId: "buildingos",
            tenantId: "tenant-auth",
            userId: "user-auth",
            role: "RESIDENT",
          },
        } as any
      )
    ).rejects.toThrow("modo solo consulta");

    expect(executeAction).not.toHaveBeenCalled();
  });

  it("forwards app list and internal token for rag reindex", async () => {
    const reindexRagKnowledge = vi.fn().mockResolvedValue({
      reports: [{ appId: "buildingos", totalDocuments: 1 }],
    });

    const controller = new AssistantController({
      handleChat: vi.fn(),
      executeAction: vi.fn(),
      reindexRagKnowledge,
    } as any);

    await controller.reindexRag(
      { apps: ["buildingos", "jurismanager"] } as any,
      {
        headers: {
          "x-internal-token": "internal-secret",
        },
      } as any
    );

    expect(reindexRagKnowledge).toHaveBeenCalledWith({
      apps: ["buildingos", "jurismanager"],
      token: "internal-secret",
    });
  });

  it("forwards authoritative context for rollout status", () => {
    const getRolloutStatus = vi.fn().mockReturnValue({
      decision: {
        enabled: true,
        mode: "global",
        reason: "global_enabled",
      },
      context: {
        appId: "buildingos",
        tenantId: "tenant-auth",
        userId: "user-auth",
        role: "TENANT_ADMIN",
        route: "/tenant/dashboard",
      },
    });

    const controller = new AssistantController({
      handleChat: vi.fn(),
      executeAction: vi.fn(),
      reindexRagKnowledge: vi.fn(),
      getRolloutStatus,
    } as any);

    const result = controller.getRolloutStatus(
      {
        context: {
          appId: "buildingos",
          tenantId: "tenant-body",
        },
      } as any,
      {
        authContext: {
          appId: "buildingos",
          tenantId: "tenant-auth",
          userId: "user-auth",
          role: "TENANT_ADMIN",
        },
      } as any
    );

    expect(getRolloutStatus).toHaveBeenCalledWith({
      context: {
        appId: "buildingos",
        tenantId: "tenant-body",
      },
      authContext: {
        appId: "buildingos",
        tenantId: "tenant-auth",
        userId: "user-auth",
        role: "TENANT_ADMIN",
      },
    });
    expect(result.decision.reason).toBe("global_enabled");
  });
});
