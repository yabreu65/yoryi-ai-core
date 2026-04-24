"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssistantAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
let AssistantAuthGuard = class AssistantAuthGuard {
    jwksCache = new Map();
    jwksTtlMs = 5 * 60 * 1000;
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const strictMode = this.isStrictModeEnabledForRequest(request);
        const jwtUser = await this.extractUserFromJwt(request.headers, strictMode);
        if (jwtUser && !request.user) {
            request.user = jwtUser;
        }
        const authContext = this.extractAuthoritativeContext(request);
        if (strictMode && (!authContext.userId || !authContext.role)) {
            throw new common_1.UnauthorizedException("Missing authoritative user context. Provide verified auth identity.");
        }
        request.authContext = authContext;
        request.authStrictMode = strictMode;
        if (this.isTenantValidationEnabled()) {
            this.validateTenantContext(authContext);
        }
        return true;
    }
    isTenantValidationEnabled() {
        const env = process.env.TENANT_VALIDATION_ENABLED;
        if (env === "true") {
            return true;
        }
        if (env === "false") {
            return false;
        }
        return false;
    }
    validateTenantContext(authContext) {
        const tenantId = authContext.tenantId;
        const appId = authContext.appId;
        if (!tenantId || tenantId.trim().length === 0) {
            throw new common_1.UnauthorizedException("tenantId es requerido");
        }
        if (!appId || appId.trim().length === 0) {
            throw new common_1.UnauthorizedException("appId es requerido");
        }
    }
    isStrictModeEnabledForRequest(request) {
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
    getStrictRolloutPercent() {
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
    resolveRolloutKey(request) {
        const headers = (request.headers ?? {});
        const authorization = this.readHeader(headers, "authorization");
        const bearerToken = authorization
            ? this.extractBearerToken(authorization)
            : undefined;
        const user = (request.user ?? {});
        const userId = this.pickFirstString(user.userId, user.id, user.sub);
        const headerUserId = this.readHeader(headers, "x-user-id");
        const headerTenantId = this.readHeader(headers, "x-tenant-id");
        const forwardedFor = this.readHeader(headers, "x-forwarded-for");
        const socket = (request.socket ?? {});
        const clientIp = this.pickFirstString(forwardedFor?.split(",")[0]?.trim(), request.ip, socket.remoteAddress);
        const userAgent = this.readHeader(headers, "user-agent");
        const path = this.pickFirstString(request.url, request.originalUrl, request.path);
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
    computeRolloutBucket(key) {
        const digest = (0, node_crypto_1.createHash)("sha256").update(key).digest();
        const value = digest.readUInt32BE(0);
        return value % 100;
    }
    async extractUserFromJwt(headersValue, strictMode) {
        const headers = (headersValue ?? {});
        const authorization = this.readHeader(headers, "authorization");
        if (!authorization) {
            return undefined;
        }
        const token = this.extractBearerToken(authorization);
        if (!token) {
            if (strictMode) {
                throw new common_1.UnauthorizedException("Invalid Authorization header format.");
            }
            return undefined;
        }
        try {
            return await this.verifyAndDecodeJwt(token, strictMode);
        }
        catch (error) {
            if (strictMode) {
                throw error;
            }
            return undefined;
        }
    }
    extractAuthoritativeContext(request) {
        const fromUser = this.extractFromUser(request.user);
        const fromHeaders = this.extractFromHeaders(request.headers);
        return {
            appId: fromUser.appId ?? fromHeaders.appId,
            tenantId: fromUser.tenantId ?? fromHeaders.tenantId,
            userId: fromUser.userId ?? fromHeaders.userId,
            role: fromUser.role ?? fromHeaders.role,
        };
    }
    extractFromUser(user) {
        const source = (user ?? {});
        const appId = this.pickFirstString(source.appId, source.applicationId);
        const tenantId = this.pickFirstString(source.tenantId, source.tenant?.id);
        const userId = this.pickFirstString(source.userId, source.id, source.sub);
        const role = this.pickFirstString(source.role, source.userRole);
        const context = {};
        if (appId)
            context.appId = appId;
        if (tenantId)
            context.tenantId = tenantId;
        if (userId)
            context.userId = userId;
        if (role)
            context.role = role;
        return context;
    }
    async verifyAndDecodeJwt(token, strictMode) {
        const [rawHeader, rawPayload, rawSignature] = token.split(".");
        if (!rawHeader || !rawPayload || !rawSignature) {
            throw new common_1.UnauthorizedException("Malformed JWT.");
        }
        const header = this.parseJwtPart(rawHeader);
        const payload = this.parseJwtPart(rawPayload);
        if (!header || !payload || typeof header.alg !== "string") {
            throw new common_1.UnauthorizedException("Invalid JWT.");
        }
        const signatureBase = `${rawHeader}.${rawPayload}`;
        const isVerified = await this.verifyJwtSignature(header.alg, signatureBase, rawSignature, header.kid);
        if (!isVerified) {
            throw new common_1.UnauthorizedException("JWT signature verification failed.");
        }
        if (!this.validateJwtClaims(payload)) {
            throw new common_1.UnauthorizedException("JWT claims validation failed.");
        }
        const user = this.mapJwtPayloadToUser(payload);
        if (strictMode && (!user.userId || !user.role)) {
            throw new common_1.UnauthorizedException("JWT missing required identity claims.");
        }
        return user;
    }
    async verifyJwtSignature(alg, signatureBase, rawSignature, kid) {
        if (alg === "HS256") {
            const secret = process.env.ASSISTANT_AUTH_JWT_HS_SECRET;
            if (!secret) {
                return false;
            }
            const expectedSignature = (0, node_crypto_1.createHmac)("sha256", secret)
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
                const verifier = (0, node_crypto_1.createVerify)("RSA-SHA256");
                verifier.update(signatureBase);
                verifier.end();
                return verifier.verify(jwksKey, this.base64UrlToBuffer(rawSignature));
            }
            const verifier = (0, node_crypto_1.createVerify)("RSA-SHA256");
            verifier.update(signatureBase);
            verifier.end();
            return verifier.verify(publicKey, this.base64UrlToBuffer(rawSignature));
        }
        return false;
    }
    validateJwtClaims(payload) {
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
        if (configuredIssuer &&
            typeof payload.iss === "string" &&
            payload.iss !== configuredIssuer) {
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
            }
            else if (Array.isArray(aud)) {
                if (!aud.includes(configuredAudience)) {
                    return false;
                }
            }
            else {
                return false;
            }
        }
        return true;
    }
    mapJwtPayloadToUser(payload) {
        const roleFromArray = Array.isArray(payload.roles)
            ? payload.roles.find((value) => typeof value === "string")
            : undefined;
        const realmRole = this.extractRoleFromNestedArray(payload.realm_access?.roles);
        const cognitoRole = this.extractRoleFromNestedArray(payload["cognito:groups"]);
        return {
            appId: this.pickFirstString(payload.app_id, payload.appId, payload.azp, payload.client_id),
            tenantId: this.pickFirstString(payload.tenant_id, payload.tenantId, payload.tid, payload.org_id, payload.organization_id),
            userId: this.pickFirstString(payload.user_id, payload.userId, payload.sub, payload.uid),
            role: this.pickFirstString(payload.role, payload.user_role, roleFromArray, realmRole, cognitoRole),
        };
    }
    extractRoleFromNestedArray(value) {
        if (!Array.isArray(value)) {
            return undefined;
        }
        return value.find((entry) => typeof entry === "string");
    }
    extractFromHeaders(headersValue) {
        const headers = (headersValue ?? {});
        const appId = this.readHeader(headers, "x-app-id");
        const tenantId = this.readHeader(headers, "x-tenant-id");
        const userId = this.readHeader(headers, "x-user-id");
        const role = this.readHeader(headers, "x-user-role");
        const context = {};
        if (appId)
            context.appId = appId;
        if (tenantId)
            context.tenantId = tenantId;
        if (userId)
            context.userId = userId;
        if (role)
            context.role = role;
        return context;
    }
    readHeader(headers, key) {
        const value = headers[key] ?? headers[key.toLowerCase()] ?? headers[key.toUpperCase()];
        if (Array.isArray(value)) {
            return typeof value[0] === "string" ? value[0] : undefined;
        }
        return typeof value === "string" ? value : undefined;
    }
    extractBearerToken(authorization) {
        const [scheme, token] = authorization.split(" ");
        if (!scheme || !token) {
            return undefined;
        }
        if (scheme.toLowerCase() !== "bearer") {
            return undefined;
        }
        return token;
    }
    parseJwtPart(part) {
        try {
            const json = this.base64UrlToBuffer(part).toString("utf8");
            return JSON.parse(json);
        }
        catch {
            return undefined;
        }
    }
    base64UrlToBuffer(value) {
        const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
        return Buffer.from(padded, "base64");
    }
    safeCompare(a, b) {
        const aBuffer = Buffer.from(a);
        const bBuffer = Buffer.from(b);
        if (aBuffer.length !== bBuffer.length) {
            return false;
        }
        return (0, node_crypto_1.timingSafeEqual)(aBuffer, bBuffer);
    }
    toNumber(value) {
        if (typeof value === "number" && Number.isFinite(value)) {
            return value;
        }
        return undefined;
    }
    async getPublicKeyFromJwks(kid) {
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
            const payload = (await response.json());
            const keys = payload.keys ?? [];
            const targetKey = this.selectJwkKey(keys, kid);
            if (!targetKey) {
                return null;
            }
            const key = (0, node_crypto_1.createPublicKey)({
                key: targetKey,
                format: "jwk",
            });
            this.jwksCache.set(cacheKey, {
                key,
                expiresAt: Date.now() + this.jwksTtlMs,
            });
            return key;
        }
        catch {
            return null;
        }
    }
    selectJwkKey(keys, kid) {
        const rsKeys = keys.filter((key) => {
            const kty = key.kty;
            return typeof kty === "string" && kty.toUpperCase() === "RSA";
        });
        if (kid) {
            return rsKeys.find((key) => key.kid === kid);
        }
        return rsKeys[0];
    }
    pickFirstString(...values) {
        for (const value of values) {
            if (typeof value === "string" && value.trim().length > 0) {
                return value;
            }
        }
        return undefined;
    }
};
exports.AssistantAuthGuard = AssistantAuthGuard;
exports.AssistantAuthGuard = AssistantAuthGuard = __decorate([
    (0, common_1.Injectable)()
], AssistantAuthGuard);
