import "reflect-metadata";
import { createHmac } from "node:crypto";
import request from "supertest";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AssistantModule } from "./assistant.module";
import { AssistantService } from "./assistant.service";

describe("Assistant security e2e", () => {
  let app: INestApplication;
  const handleChat = vi.fn();
  const executeAction = vi.fn();
  const reindexRagKnowledge = vi.fn();

  beforeEach(async () => {
    handleChat.mockReset();
    executeAction.mockReset();
    reindexRagKnowledge.mockReset();
    handleChat.mockResolvedValue({
      message: "test",
      answer: "ok",
      answerSource: "fallback",
      context: {
        appId: "buildingos",
        userId: "u_1",
        role: "RESIDENT",
        route: "/resident/finanzas",
        currentModule: "charges",
        permissions: ["charges.read", "payments.read"],
      },
      actions: [],
      llmUsed: false,
      knowledgeUsed: { found: false, sources: [] },
    });
    executeAction.mockResolvedValue({
      status: "executed",
      message: "ok",
      actionKey: "open-payments",
      execution: {
        type: "navigate",
        targetPath: "/tenant/payments",
      },
    });
    reindexRagKnowledge.mockResolvedValue({
      reports: [],
    });

    const moduleRef = await Test.createTestingModule({
      imports: [AssistantModule],
    })
      .overrideProvider(AssistantService)
      .useValue({ handleChat, executeAction, reindexRagKnowledge })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    delete process.env.ASSISTANT_STRICT_AUTH;
    delete process.env.ASSISTANT_STRICT_ROLLOUT_PERCENT;
    delete process.env.ASSISTANT_AUTH_JWT_HS_SECRET;
    delete process.env.ASSISTANT_AUTH_JWT_ISSUER;
    delete process.env.ASSISTANT_AUTH_JWT_AUDIENCE;
    delete process.env.RAG_REINDEX_TOKEN;
    delete process.env.ASSISTANT_MODE;
  });

  it("returns 401 in strict mode when JWT signature is invalid", async () => {
    process.env.ASSISTANT_STRICT_AUTH = "true";
    process.env.ASSISTANT_AUTH_JWT_HS_SECRET = "correct-secret";

    const invalidToken = createHs256Token(
      {
        sub: "resident-1",
        role: "RESIDENT",
        tenant_id: "tenant-auth",
        app_id: "buildingos",
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      "wrong-secret"
    );

    const response = await request(app.getHttpServer())
      .post("/assistant/chat")
      .set("Authorization", `Bearer ${invalidToken}`)
      .send({
        message: "¿cuánto debo?",
        context: {
          appId: "buildingos",
          tenantId: "tenant-body",
          userId: "body-user",
          role: "TENANT_ADMIN",
          route: "/resident/finanzas",
        },
      });

    expect(response.status).toBe(401);
    expect(handleChat).not.toHaveBeenCalled();
  });

  it("keeps compatibility behavior when strict rollout is 0", async () => {
    process.env.ASSISTANT_STRICT_AUTH = "true";
    process.env.ASSISTANT_STRICT_ROLLOUT_PERCENT = "0";

    const response = await request(app.getHttpServer())
      .post("/assistant/chat")
      .send({
        message: "¿cuánto debo?",
        context: {
          appId: "buildingos",
          tenantId: "tenant-body",
          userId: "user-body",
          role: "TENANT_ADMIN",
          route: "/resident/finanzas",
        },
      });

    expect(response.status).toBe(200);
    expect(handleChat).toHaveBeenCalledTimes(1);
  });

  it("uses token identity over body spoofing for role and tenant", async () => {
    process.env.ASSISTANT_STRICT_AUTH = "true";
    process.env.ASSISTANT_AUTH_JWT_HS_SECRET = "correct-secret";
    process.env.ASSISTANT_AUTH_JWT_ISSUER = "issuer.test";
    process.env.ASSISTANT_AUTH_JWT_AUDIENCE = "assistant-api";

    const validToken = createHs256Token(
      {
        sub: "resident-auth",
        role: "RESIDENT",
        tenant_id: "tenant-auth",
        app_id: "buildingos",
        iss: "issuer.test",
        aud: "assistant-api",
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      "correct-secret"
    );

    const response = await request(app.getHttpServer())
      .post("/assistant/chat")
      .set("Authorization", `Bearer ${validToken}`)
      .send({
        message: "¿cuánto debo?",
        context: {
          appId: "buildingos",
          tenantId: "tenant-body",
          userId: "user-body",
          role: "TENANT_ADMIN",
          route: "/resident/finanzas",
        },
      });

    expect(response.status).toBe(200);
    expect(handleChat).toHaveBeenCalledTimes(1);
    const callArg = handleChat.mock.calls[0][0];
    expect(callArg.authContext.userId).toBe("resident-auth");
    expect(callArg.authContext.role).toBe("RESIDENT");
    expect(callArg.authContext.tenantId).toBe("tenant-auth");
  });

  it("returns 401 in strict mode when token is expired", async () => {
    process.env.ASSISTANT_STRICT_AUTH = "true";
    process.env.ASSISTANT_AUTH_JWT_HS_SECRET = "correct-secret";

    const expiredToken = createHs256Token(
      {
        sub: "resident-auth",
        role: "RESIDENT",
        tenant_id: "tenant-auth",
        app_id: "buildingos",
        exp: Math.floor(Date.now() / 1000) - 5,
      },
      "correct-secret"
    );

    const response = await request(app.getHttpServer())
      .post("/assistant/chat")
      .set("Authorization", `Bearer ${expiredToken}`)
      .send({
        message: "¿cuánto debo?",
        context: {
          appId: "buildingos",
          role: "TENANT_ADMIN",
          route: "/resident/finanzas",
        },
      });

    expect(response.status).toBe(401);
    expect(handleChat).not.toHaveBeenCalled();
  });

  it("returns 401 in strict mode when token issuer does not match", async () => {
    process.env.ASSISTANT_STRICT_AUTH = "true";
    process.env.ASSISTANT_AUTH_JWT_HS_SECRET = "correct-secret";
    process.env.ASSISTANT_AUTH_JWT_ISSUER = "issuer.expected";

    const tokenWithWrongIssuer = createHs256Token(
      {
        sub: "resident-auth",
        role: "RESIDENT",
        tenant_id: "tenant-auth",
        app_id: "buildingos",
        iss: "issuer.other",
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      "correct-secret"
    );

    const response = await request(app.getHttpServer())
      .post("/assistant/chat")
      .set("Authorization", `Bearer ${tokenWithWrongIssuer}`)
      .send({
        message: "¿cuánto debo?",
        context: {
          appId: "buildingos",
          role: "TENANT_ADMIN",
          route: "/resident/finanzas",
        },
      });

    expect(response.status).toBe(401);
    expect(handleChat).not.toHaveBeenCalled();
  });

  it("returns 401 in strict mode when token audience does not match", async () => {
    process.env.ASSISTANT_STRICT_AUTH = "true";
    process.env.ASSISTANT_AUTH_JWT_HS_SECRET = "correct-secret";
    process.env.ASSISTANT_AUTH_JWT_AUDIENCE = "assistant-api";

    const tokenWithWrongAudience = createHs256Token(
      {
        sub: "resident-auth",
        role: "RESIDENT",
        tenant_id: "tenant-auth",
        app_id: "buildingos",
        aud: "other-service",
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      "correct-secret"
    );

    const response = await request(app.getHttpServer())
      .post("/assistant/chat")
      .set("Authorization", `Bearer ${tokenWithWrongAudience}`)
      .send({
        message: "¿cuánto debo?",
        context: {
          appId: "buildingos",
          role: "TENANT_ADMIN",
          route: "/resident/finanzas",
        },
      });

    expect(response.status).toBe(401);
    expect(handleChat).not.toHaveBeenCalled();
  });

  it("uses token identity over body spoofing when executing actions", async () => {
    process.env.ASSISTANT_MODE = "actions_enabled";
    process.env.ASSISTANT_STRICT_AUTH = "true";
    process.env.ASSISTANT_AUTH_JWT_HS_SECRET = "correct-secret";
    process.env.ASSISTANT_AUTH_JWT_ISSUER = "issuer.test";
    process.env.ASSISTANT_AUTH_JWT_AUDIENCE = "assistant-api";

    const validToken = createHs256Token(
      {
        sub: "resident-auth",
        role: "RESIDENT",
        tenant_id: "tenant-auth",
        app_id: "buildingos",
        iss: "issuer.test",
        aud: "assistant-api",
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      "correct-secret"
    );

    const response = await request(app.getHttpServer())
      .post("/assistant/actions/execute")
      .set("Authorization", `Bearer ${validToken}`)
      .send({
        actionKey: "open-payments",
        context: {
          appId: "buildingos",
          tenantId: "tenant-body",
          userId: "user-body",
          role: "TENANT_ADMIN",
          route: "/tenant/payments",
        },
      });

    expect(response.status).toBe(200);
    expect(executeAction).toHaveBeenCalledTimes(1);
    const callArg = executeAction.mock.calls[0][0];
    expect(callArg.authContext.userId).toBe("resident-auth");
    expect(callArg.authContext.role).toBe("RESIDENT");
    expect(callArg.authContext.tenantId).toBe("tenant-auth");
  });

  it("blocks BuildingOS action execution by default in query-only mode", async () => {
    process.env.ASSISTANT_STRICT_AUTH = "true";
    process.env.ASSISTANT_AUTH_JWT_HS_SECRET = "correct-secret";
    process.env.ASSISTANT_AUTH_JWT_ISSUER = "issuer.test";
    process.env.ASSISTANT_AUTH_JWT_AUDIENCE = "assistant-api";

    const validToken = createHs256Token(
      {
        sub: "resident-auth",
        role: "RESIDENT",
        tenant_id: "tenant-auth",
        app_id: "buildingos",
        iss: "issuer.test",
        aud: "assistant-api",
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      "correct-secret"
    );

    const response = await request(app.getHttpServer())
      .post("/assistant/actions/execute")
      .set("Authorization", `Bearer ${validToken}`)
      .send({
        actionKey: "open-payments",
        context: {
          appId: "buildingos",
          tenantId: "tenant-body",
          userId: "user-body",
          role: "TENANT_ADMIN",
          route: "/tenant/payments",
        },
      });

    expect(response.status).toBe(403);
    expect(executeAction).not.toHaveBeenCalled();
  });

  it("uses token appId over body appId spoofing on chat", async () => {
    process.env.ASSISTANT_STRICT_AUTH = "true";
    process.env.ASSISTANT_AUTH_JWT_HS_SECRET = "correct-secret";
    process.env.ASSISTANT_AUTH_JWT_ISSUER = "issuer.test";
    process.env.ASSISTANT_AUTH_JWT_AUDIENCE = "assistant-api";

    const validToken = createHs256Token(
      {
        sub: "lawyer-auth",
        role: "ABOGADO",
        tenant_id: "tenant-jm",
        app_id: "jurismanager",
        iss: "issuer.test",
        aud: "assistant-api",
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      "correct-secret"
    );

    const response = await request(app.getHttpServer())
      .post("/assistant/chat")
      .set("Authorization", `Bearer ${validToken}`)
      .send({
        message: "estado del expediente",
        context: {
          appId: "buildingos",
          tenantId: "tenant-body",
          userId: "user-body",
          role: "TENANT_ADMIN",
          route: "/juris/expedientes",
        },
      });

    expect(response.status).toBe(200);
    expect(handleChat).toHaveBeenCalledTimes(1);
    const callArg = handleChat.mock.calls[0][0];
    expect(callArg.authContext.appId).toBe("jurismanager");
    expect(callArg.authContext.userId).toBe("lawyer-auth");
    expect(callArg.authContext.role).toBe("ABOGADO");
  });

  it("protects rag reindex endpoint with internal token when configured", async () => {
    process.env.RAG_REINDEX_TOKEN = "internal-token";

    const forbiddenResponse = await request(app.getHttpServer())
      .post("/assistant/rag/reindex")
      .send({});

    expect(forbiddenResponse.status).toBe(401);
    expect(reindexRagKnowledge).not.toHaveBeenCalled();

    const successResponse = await request(app.getHttpServer())
      .post("/assistant/rag/reindex")
      .set("x-internal-token", "internal-token")
      .send({
        apps: ["buildingos"],
      });

    expect(successResponse.status).toBe(200);
    expect(reindexRagKnowledge).toHaveBeenCalledWith({
      apps: ["buildingos"],
      token: "internal-token",
    });
  });
});

function createHs256Token(
  payload: Record<string, unknown>,
  secret: string
): string {
  const header = { alg: "HS256", typ: "JWT" };
  const rawHeader = encodeBase64Url(JSON.stringify(header));
  const rawPayload = encodeBase64Url(JSON.stringify(payload));
  const signatureBase = `${rawHeader}.${rawPayload}`;
  const signature = createHmac("sha256", secret)
    .update(signatureBase)
    .digest("base64url");
  return `${rawHeader}.${rawPayload}.${signature}`;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}
