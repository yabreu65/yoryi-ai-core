import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UnauthorizedException } from "@nestjs/common";
import { createHmac } from "node:crypto";
import { AssistantAuthGuard } from "./assistant-auth.guard";

describe("AssistantAuthGuard", () => {
  let guard: AssistantAuthGuard;

  beforeEach(() => {
    guard = new AssistantAuthGuard();
    delete process.env.ASSISTANT_STRICT_AUTH;
    delete process.env.ASSISTANT_STRICT_ROLLOUT_PERCENT;
    delete process.env.ASSISTANT_AUTH_JWT_HS_SECRET;
    delete process.env.ASSISTANT_AUTH_JWT_PUBLIC_KEY;
    delete process.env.ASSISTANT_AUTH_JWKS_URL;
    delete process.env.ASSISTANT_AUTH_JWT_ISSUER;
    delete process.env.ASSISTANT_AUTH_JWT_AUDIENCE;
  });

  afterEach(() => {
    delete process.env.ASSISTANT_STRICT_AUTH;
    delete process.env.ASSISTANT_STRICT_ROLLOUT_PERCENT;
    delete process.env.ASSISTANT_AUTH_JWT_HS_SECRET;
    delete process.env.ASSISTANT_AUTH_JWT_PUBLIC_KEY;
    delete process.env.ASSISTANT_AUTH_JWKS_URL;
    delete process.env.ASSISTANT_AUTH_JWT_ISSUER;
    delete process.env.ASSISTANT_AUTH_JWT_AUDIENCE;
    vi.restoreAllMocks();
  });

  it("prefers req.user context over headers", async () => {
    const request = {
      user: {
        appId: "buildingos",
        tenantId: "tenant-from-user",
        userId: "user-from-user",
        role: "RESIDENT",
      },
      headers: {
        "x-tenant-id": "tenant-from-header",
        "x-user-id": "user-from-header",
        "x-user-role": "TENANT_ADMIN",
      },
    } as any;

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.authContext.tenantId).toBe("tenant-from-user");
    expect(request.authContext.userId).toBe("user-from-user");
    expect(request.authContext.role).toBe("RESIDENT");
  });

  it("throws in strict mode when missing authoritative identity", async () => {
    process.env.ASSISTANT_STRICT_AUTH = "true";
    const request = { headers: {} } as any;
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it("allows compatibility mode when strict rollout percent is 0", async () => {
    process.env.ASSISTANT_STRICT_AUTH = "true";
    process.env.ASSISTANT_STRICT_ROLLOUT_PERCENT = "0";

    const request = { headers: {} } as any;
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.authStrictMode).toBe(false);
  });

  it("enforces strict mode when strict rollout percent is 100", async () => {
    process.env.ASSISTANT_STRICT_AUTH = "true";
    process.env.ASSISTANT_STRICT_ROLLOUT_PERCENT = "100";

    const request = { headers: {} } as any;
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it("allows header-based context in compatibility mode", async () => {
    const request = {
      headers: {
        "x-app-id": "buildingos",
        "x-tenant-id": "tenant-1",
        "x-user-id": "user-1",
        "x-user-role": "RESIDENT",
      },
    } as any;
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.authContext.appId).toBe("buildingos");
    expect(request.authContext.tenantId).toBe("tenant-1");
    expect(request.authContext.userId).toBe("user-1");
    expect(request.authContext.role).toBe("RESIDENT");
  });

  it("extracts identity from a valid HS256 bearer token", async () => {
    process.env.ASSISTANT_AUTH_JWT_HS_SECRET = "super-secret";
    process.env.ASSISTANT_STRICT_AUTH = "true";

    const token = createHs256Token(
      {
        sub: "jwt-user",
        role: "RESIDENT",
        tenant_id: "jwt-tenant",
        app_id: "buildingos",
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      process.env.ASSISTANT_AUTH_JWT_HS_SECRET
    );

    const request = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as any;
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.authContext.userId).toBe("jwt-user");
    expect(request.authContext.role).toBe("RESIDENT");
    expect(request.authContext.tenantId).toBe("jwt-tenant");
    expect(request.authContext.appId).toBe("buildingos");
  });

  it("throws in strict mode when bearer token signature is invalid", async () => {
    process.env.ASSISTANT_AUTH_JWT_HS_SECRET = "super-secret";
    process.env.ASSISTANT_STRICT_AUTH = "true";

    const token = createHs256Token(
      {
        sub: "jwt-user",
        role: "RESIDENT",
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      "another-secret"
    );

    const request = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as any;
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it("extracts identity from a valid RS256 bearer token using JWKS", async () => {
    const { generateKeyPairSync, createSign } = await import("node:crypto");
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const publicJwk = publicKey.export({ format: "jwk" }) as Record<string, unknown>;

    process.env.ASSISTANT_AUTH_JWKS_URL = "https://issuer.test/.well-known/jwks.json";
    process.env.ASSISTANT_STRICT_AUTH = "true";
    process.env.ASSISTANT_AUTH_JWT_ISSUER = "issuer.test";
    process.env.ASSISTANT_AUTH_JWT_AUDIENCE = "assistant-api";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          keys: [
            {
              ...publicJwk,
              kid: "k1",
              alg: "RS256",
              use: "sig",
            },
          ],
        }),
      })
    );

    const token = createRs256Token(
      {
        sub: "jwt-user-rs",
        role: "RESIDENT",
        tenant_id: "tenant-rs",
        app_id: "buildingos",
        iss: "issuer.test",
        aud: "assistant-api",
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      privateKey,
      createSign,
      "k1"
    );

    const request = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as any;
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.authContext.userId).toBe("jwt-user-rs");
    expect(request.authContext.role).toBe("RESIDENT");
    expect(request.authContext.tenantId).toBe("tenant-rs");
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

function createRs256Token(
  payload: Record<string, unknown>,
  privateKey: unknown,
  createSignFn: typeof import("node:crypto").createSign,
  kid: string
): string {
  const header = { alg: "RS256", typ: "JWT", kid };
  const rawHeader = encodeBase64Url(JSON.stringify(header));
  const rawPayload = encodeBase64Url(JSON.stringify(payload));
  const signatureBase = `${rawHeader}.${rawPayload}`;
  const signer = createSignFn("RSA-SHA256");
  signer.update(signatureBase);
  signer.end();
  const signature = signer.sign(privateKey as any).toString("base64url");
  return `${rawHeader}.${rawPayload}.${signature}`;
}
