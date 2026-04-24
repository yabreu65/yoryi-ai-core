import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { AssistantRuntimeContext } from "@yoryi/ai-types";
import {
  KeyObject,
  createHash,
  createHmac,
  createPublicKey,
  createVerify,
  timingSafeEqual,
} from "node:crypto";

type JwksEntry = {
  key: KeyObject;
  expiresAt: number;
};

@Injectable()
export class AssistantAuthGuard implements CanActivate {
  private readonly jwksCache = new Map<string, JwksEntry>();
  private readonly jwksTtlMs = 5 * 60 * 1000;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest() as Record<string, unknown>;
    const strictMode = this.isStrictModeEnabledForRequest(request);
    const jwtUser = await this.extractUserFromJwt(request.headers, strictMode);
    if (jwtUser && !request.user) {
      request.user = jwtUser;
    }

    const authContext = this.extractAuthoritativeContext(request);

    if (strictMode && (!authContext.userId || !authContext.role)) {
      throw new UnauthorizedException(
        "Missing authoritative user context. Provide verified auth identity."
      );
    }

    request.authContext = authContext;
    request.authStrictMode = strictMode;

    if (this.isTenantValidationEnabled()) {
      this.validateTenantContext(authContext);
    }

    return true;
  }

  private isTenantValidationEnabled(): boolean {
    const env = process.env.TENANT_VALIDATION_ENABLED;
    if (env === "true") {
      return true;
    }
    if (env === "false") {
      return false;
    }
    return false;
  }

  validateTenantContext(authContext: Record<string, unknown>): void {
    const tenantId = authContext.tenantId as string | undefined;
    const appId = authContext.appId as string | undefined;

    if (!tenantId || (tenantId as string).trim().length === 0) {
      throw new UnauthorizedException("tenantId es requerido");
    }
    if (!appId || (appId as string).trim().length === 0) {
      throw new UnauthorizedException("appId es requerido");
    }
  }

  private isStrictModeEnabledForRequest(request: Record<string, unknown>): boolean {
    if (process.env.ASSISTANT_STRICT_AUTH !== "true") {
      return false;
    }

    const rolloutPercent = this.getStrictRolloutPercent();
    if (rolloutPercent >= 100) {
      return true;
    }
    if (rolloutPercent <= 0) {
      return false;
    }

    const rolloutKey = this.resolveRolloutKey(request);
    const bucket = this.computeRolloutBucket(rolloutKey);
    return bucket < rolloutPercent;
  }

  private getStrictRolloutPercent(): number {
    const configured = process.env.ASSISTANT_STRICT_ROLLOUT_PERCENT;
    if (!configured || configured.trim().length === 0) {
      return 100;
    }

    const numeric = Number(configured);
    if (!Number.isFinite(numeric)) {
      return 100;
    }

    if (numeric < 0) {
      return 0;
    }
    if (numeric > 100) {
      return 100;
    }
    return numeric;
  }

  private resolveRolloutKey(request: Record<string, unknown>): string {
    const headers = (request.headers ?? {}) as Record<string, unknown>;
    const authorization = this.readHeader(headers, "authorization");
    const bearerToken = authorization
      ? this.extractBearerToken(authorization)
      : undefined;

    const user = (request.user ?? {}) as Record<string, unknown>;
    const userId = this.pickFirstString(user.userId, user.id, user.sub);
    const headerUserId = this.readHeader(headers, "x-user-id");
    const headerTenantId = this.readHeader(headers, "x-tenant-id");
    const forwardedFor = this.readHeader(headers, "x-forwarded-for");
    const socket = (request.socket ?? {}) as Record<string, unknown>;
    const clientIp = this.pickFirstString(
      forwardedFor?.split(",")[0]?.trim(),
      request.ip,
      socket.remoteAddress
    );
    const userAgent = this.readHeader(headers, "user-agent");
    const path = this.pickFirstString(
      request.url,
      request.originalUrl,
      request.path
    );

    return [
      bearerToken ? `bearer:${bearerToken}` : undefined,
      userId ? `user:${userId}` : undefined,
      headerUserId ? `header-user:${headerUserId}` : undefined,
      headerTenantId ? `header-tenant:${headerTenantId}` : undefined,
      clientIp ? `ip:${clientIp}` : undefined,
      userAgent ? `ua:${userAgent}` : undefined,
      path ? `path:${path}` : undefined,
      "assistant-auth-rollout",
    ]
      .filter(Boolean)
      .join("|");
  }

  private computeRolloutBucket(key: string): number {
    const digest = createHash("sha256").update(key).digest();
    const value = digest.readUInt32BE(0);
    return value % 100;
  }

  private async extractUserFromJwt(
    headersValue: unknown,
    strictMode: boolean
  ): Promise<Record<string, unknown> | undefined> {
    const headers = (headersValue ?? {}) as Record<string, unknown>;
    const authorization = this.readHeader(headers, "authorization");
    if (!authorization) {
      return undefined;
    }

    const token = this.extractBearerToken(authorization);
    if (!token) {
      if (strictMode) {
        throw new UnauthorizedException("Invalid Authorization header format.");
      }
      return undefined;
    }

    try {
      return await this.verifyAndDecodeJwt(token, strictMode);
    } catch (error) {
      if (strictMode) {
        throw error;
      }
      return undefined;
    }
  }

  private extractAuthoritativeContext(
    request: Record<string, unknown>
  ): Partial<AssistantRuntimeContext> {
    const fromUser = this.extractFromUser(request.user);
    const fromHeaders = this.extractFromHeaders(request.headers);

    return {
      appId: fromUser.appId ?? fromHeaders.appId,
      tenantId: fromUser.tenantId ?? fromHeaders.tenantId,
      userId: fromUser.userId ?? fromHeaders.userId,
      role: fromUser.role ?? fromHeaders.role,
    };
  }

  private extractFromUser(user: unknown): Partial<AssistantRuntimeContext> {
    const source = (user ?? {}) as Record<string, unknown>;
    const appId = this.pickFirstString(source.appId, source.applicationId);
    const tenantId = this.pickFirstString(
      source.tenantId,
      (source.tenant as Record<string, unknown> | undefined)?.id
    );
    const userId = this.pickFirstString(source.userId, source.id, source.sub);
    const role = this.pickFirstString(source.role, source.userRole);

    const context: Partial<AssistantRuntimeContext> = {};
    if (appId) context.appId = appId;
    if (tenantId) context.tenantId = tenantId;
    if (userId) context.userId = userId;
    if (role) context.role = role;
    return context;
  }

  private async verifyAndDecodeJwt(
    token: string,
    strictMode: boolean
  ): Promise<Record<string, unknown> | undefined> {
    const [rawHeader, rawPayload, rawSignature] = token.split(".");
    if (!rawHeader || !rawPayload || !rawSignature) {
      throw new UnauthorizedException("Malformed JWT.");
    }

    const header = this.parseJwtPart(rawHeader) as { alg?: string } | undefined;
    const payload = this.parseJwtPart(rawPayload) as Record<string, unknown> | undefined;
    if (!header || !payload || typeof header.alg !== "string") {
      throw new UnauthorizedException("Invalid JWT.");
    }

    const signatureBase = `${rawHeader}.${rawPayload}`;
    const isVerified = await this.verifyJwtSignature(
      header.alg,
      signatureBase,
      rawSignature,
      header.kid
    );

    if (!isVerified) {
      throw new UnauthorizedException("JWT signature verification failed.");
    }

    if (!this.validateJwtClaims(payload)) {
      throw new UnauthorizedException("JWT claims validation failed.");
    }

    const user = this.mapJwtPayloadToUser(payload);
    if (strictMode && (!user.userId || !user.role)) {
      throw new UnauthorizedException("JWT missing required identity claims.");
    }

    return user;
  }

  private async verifyJwtSignature(
    alg: string,
    signatureBase: string,
    rawSignature: string,
    kid?: string
  ): Promise<boolean> {
    if (alg === "HS256") {
      const secret = process.env.ASSISTANT_AUTH_JWT_HS_SECRET;
      if (!secret) {
        return false;
      }

      const expectedSignature = createHmac("sha256", secret)
        .update(signatureBase)
        .digest("base64url");
      return this.safeCompare(rawSignature, expectedSignature);
    }

    if (alg === "RS256") {
      const publicKey = process.env.ASSISTANT_AUTH_JWT_PUBLIC_KEY;
      if (!publicKey) {
        const jwksKey = await this.getPublicKeyFromJwks(kid);
        if (!jwksKey) {
          return false;
        }
        const verifier = createVerify("RSA-SHA256");
        verifier.update(signatureBase);
        verifier.end();
        return verifier.verify(jwksKey, this.base64UrlToBuffer(rawSignature));
      }

      const verifier = createVerify("RSA-SHA256");
      verifier.update(signatureBase);
      verifier.end();
      return verifier.verify(publicKey, this.base64UrlToBuffer(rawSignature));
    }

    return false;
  }

  private validateJwtClaims(payload: Record<string, unknown>): boolean {
    const now = Math.floor(Date.now() / 1000);
    const exp = this.toNumber(payload.exp);
    const nbf = this.toNumber(payload.nbf);
    const configuredIssuer = process.env.ASSISTANT_AUTH_JWT_ISSUER;
    const configuredAudience = process.env.ASSISTANT_AUTH_JWT_AUDIENCE;

    if (exp !== undefined && now >= exp) {
      return false;
    }
    if (nbf !== undefined && now < nbf) {
      return false;
    }
    if (
      configuredIssuer &&
      typeof payload.iss === "string" &&
      payload.iss !== configuredIssuer
    ) {
      return false;
    }
    if (configuredIssuer && typeof payload.iss !== "string") {
      return false;
    }

    if (configuredAudience) {
      const aud = payload.aud;
      if (typeof aud === "string") {
        if (aud !== configuredAudience) {
          return false;
        }
      } else if (Array.isArray(aud)) {
        if (!aud.includes(configuredAudience)) {
          return false;
        }
      } else {
        return false;
      }
    }

    return true;
  }

  private mapJwtPayloadToUser(payload: Record<string, unknown>): Record<string, unknown> {
    const roleFromArray = Array.isArray(payload.roles)
      ? payload.roles.find((value) => typeof value === "string")
      : undefined;
    const realmRole = this.extractRoleFromNestedArray(
      (payload.realm_access as Record<string, unknown> | undefined)?.roles
    );
    const cognitoRole = this.extractRoleFromNestedArray(
      payload["cognito:groups"]
    );

    return {
      appId: this.pickFirstString(
        payload.app_id,
        payload.appId,
        payload.azp,
        payload.client_id
      ),
      tenantId: this.pickFirstString(
        payload.tenant_id,
        payload.tenantId,
        payload.tid,
        payload.org_id,
        payload.organization_id
      ),
      userId: this.pickFirstString(
        payload.user_id,
        payload.userId,
        payload.sub,
        payload.uid
      ),
      role: this.pickFirstString(
        payload.role,
        payload.user_role,
        roleFromArray,
        realmRole,
        cognitoRole
      ),
    };
  }

  private extractRoleFromNestedArray(value: unknown): string | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }
    return value.find((entry) => typeof entry === "string");
  }

  private extractFromHeaders(
    headersValue: unknown
  ): Partial<AssistantRuntimeContext> {
    const headers = (headersValue ?? {}) as Record<string, unknown>;
    const appId = this.readHeader(headers, "x-app-id");
    const tenantId = this.readHeader(headers, "x-tenant-id");
    const userId = this.readHeader(headers, "x-user-id");
    const role = this.readHeader(headers, "x-user-role");

    const context: Partial<AssistantRuntimeContext> = {};
    if (appId) context.appId = appId;
    if (tenantId) context.tenantId = tenantId;
    if (userId) context.userId = userId;
    if (role) context.role = role;
    return context;
  }

  private readHeader(
    headers: Record<string, unknown>,
    key: string
  ): string | undefined {
    const value = headers[key] ?? headers[key.toLowerCase()] ?? headers[key.toUpperCase()];
    if (Array.isArray(value)) {
      return typeof value[0] === "string" ? value[0] : undefined;
    }
    return typeof value === "string" ? value : undefined;
  }

  private extractBearerToken(authorization: string): string | undefined {
    const [scheme, token] = authorization.split(" ");
    if (!scheme || !token) {
      return undefined;
    }
    if (scheme.toLowerCase() !== "bearer") {
      return undefined;
    }
    return token;
  }

  private parseJwtPart(part: string): unknown {
    try {
      const json = this.base64UrlToBuffer(part).toString("utf8");
      return JSON.parse(json);
    } catch {
      return undefined;
    }
  }

  private base64UrlToBuffer(value: string): Buffer {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded =
      normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    return Buffer.from(padded, "base64");
  }

  private safeCompare(a: string, b: string): boolean {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);
    if (aBuffer.length !== bBuffer.length) {
      return false;
    }
    return timingSafeEqual(aBuffer, bBuffer);
  }

  private toNumber(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    return undefined;
  }

  private async getPublicKeyFromJwks(kid?: string): Promise<KeyObject | null> {
    const jwksUrl = process.env.ASSISTANT_AUTH_JWKS_URL;
    if (!jwksUrl) {
      return null;
    }

    const cacheKey = kid ?? "__default__";
    const cached = this.jwksCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.key;
    }

    try {
      const response = await fetch(jwksUrl, { method: "GET" });
      if (!response.ok) {
        return null;
      }
      const payload = (await response.json()) as {
        keys?: Array<Record<string, unknown>>;
      };
      const keys = payload.keys ?? [];
      const targetKey = this.selectJwkKey(keys, kid);
      if (!targetKey) {
        return null;
      }

      const key = createPublicKey({
        key: targetKey as Record<string, unknown>,
        format: "jwk",
      });
      this.jwksCache.set(cacheKey, {
        key,
        expiresAt: Date.now() + this.jwksTtlMs,
      });
      return key;
    } catch {
      return null;
    }
  }

  private selectJwkKey(
    keys: Array<Record<string, unknown>>,
    kid?: string
  ): Record<string, unknown> | undefined {
    const rsKeys = keys.filter((key) => {
      const kty = key.kty;
      return typeof kty === "string" && kty.toUpperCase() === "RSA";
    });

    if (kid) {
      return rsKeys.find((key) => key.kid === kid);
    }
    return rsKeys[0];
  }

  private pickFirstString(...values: unknown[]): string | undefined {
    for (const value of values) {
      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }
    }
    return undefined;
  }
}
