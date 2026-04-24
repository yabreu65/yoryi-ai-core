import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AssistantAuthConfigService } from "./assistant-auth-config.service";

describe("AssistantAuthConfigService", () => {
  let service: AssistantAuthConfigService;

  beforeEach(() => {
    service = new AssistantAuthConfigService();
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
  });

  it("returns non-strict status by default", () => {
    expect(service.getPublicStatus()).toEqual({
      strictMode: false,
      verificationMode: "none",
      issuerConfigured: false,
      audienceConfigured: false,
      jwksConfigured: false,
      strictRolloutPercent: 100,
    });
  });

  it("throws when strict mode is enabled without verifier keys", () => {
    process.env.ASSISTANT_STRICT_AUTH = "true";
    process.env.ASSISTANT_AUTH_JWT_ISSUER = "issuer.test";
    process.env.ASSISTANT_AUTH_JWT_AUDIENCE = "assistant-api";

    expect(() => service.assertValidForStartup()).toThrow(
      /ASSISTANT_STRICT_AUTH=true requires ASSISTANT_AUTH_JWT_HS_SECRET or ASSISTANT_AUTH_JWT_PUBLIC_KEY/
    );
  });

  it("throws when strict mode is enabled without issuer/audience", () => {
    process.env.ASSISTANT_STRICT_AUTH = "true";
    process.env.ASSISTANT_AUTH_JWT_HS_SECRET = "secret";

    expect(() => service.assertValidForStartup()).toThrow(
      /ASSISTANT_AUTH_JWT_ISSUER/
    );

    process.env.ASSISTANT_AUTH_JWT_ISSUER = "issuer.test";
    expect(() => service.assertValidForStartup()).toThrow(
      /ASSISTANT_AUTH_JWT_AUDIENCE/
    );
  });

  it("passes strict startup validation when fully configured", () => {
    process.env.ASSISTANT_STRICT_AUTH = "true";
    process.env.ASSISTANT_AUTH_JWT_HS_SECRET = "secret";
    process.env.ASSISTANT_AUTH_JWT_ISSUER = "issuer.test";
    process.env.ASSISTANT_AUTH_JWT_AUDIENCE = "assistant-api";

    expect(() => service.assertValidForStartup()).not.toThrow();
    expect(service.getPublicStatus()).toEqual({
      strictMode: true,
      verificationMode: "hs256",
      issuerConfigured: true,
      audienceConfigured: true,
      jwksConfigured: false,
      strictRolloutPercent: 100,
    });
  });

  it("passes strict startup validation with JWKS URL and no static key", () => {
    process.env.ASSISTANT_STRICT_AUTH = "true";
    process.env.ASSISTANT_AUTH_JWKS_URL = "https://issuer.test/.well-known/jwks.json";
    process.env.ASSISTANT_AUTH_JWT_ISSUER = "issuer.test";
    process.env.ASSISTANT_AUTH_JWT_AUDIENCE = "assistant-api";

    expect(() => service.assertValidForStartup()).not.toThrow();
    expect(service.getPublicStatus()).toEqual({
      strictMode: true,
      verificationMode: "jwks_rs256",
      issuerConfigured: true,
      audienceConfigured: true,
      jwksConfigured: true,
      strictRolloutPercent: 100,
    });
  });

  it("returns configured strict rollout percent", () => {
    process.env.ASSISTANT_STRICT_ROLLOUT_PERCENT = "25";

    expect(service.getPublicStatus().strictRolloutPercent).toBe(25);
  });

  it("throws when strict rollout percent is not numeric", () => {
    process.env.ASSISTANT_STRICT_ROLLOUT_PERCENT = "abc";

    expect(() => service.assertValidForStartup()).toThrow(
      /ASSISTANT_STRICT_ROLLOUT_PERCENT must be a valid number/
    );
  });

  it("throws when strict rollout percent is out of range", () => {
    process.env.ASSISTANT_STRICT_ROLLOUT_PERCENT = "-1";
    expect(() => service.assertValidForStartup()).toThrow(
      /ASSISTANT_STRICT_ROLLOUT_PERCENT must be between 0 and 100/
    );

    process.env.ASSISTANT_STRICT_ROLLOUT_PERCENT = "101";
    expect(() => service.assertValidForStartup()).toThrow(
      /ASSISTANT_STRICT_ROLLOUT_PERCENT must be between 0 and 100/
    );
  });
});
