"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssistantAuthConfigService = void 0;
const common_1 = require("@nestjs/common");
let AssistantAuthConfigService = class AssistantAuthConfigService {
    getPublicStatus() {
        return {
            strictMode: this.isStrictMode(),
            verificationMode: this.getVerificationMode(),
            issuerConfigured: this.hasJwtIssuer(),
            audienceConfigured: this.hasJwtAudience(),
            jwksConfigured: this.hasJwksUrl(),
            strictRolloutPercent: this.getStrictRolloutPercent(),
        };
    }
    assertValidForStartup() {
        const strictRolloutPercent = this.getStrictRolloutPercent();
        if (Number.isNaN(strictRolloutPercent)) {
            throw new Error("ASSISTANT_STRICT_ROLLOUT_PERCENT must be a valid number between 0 and 100.");
        }
        if (strictRolloutPercent < 0 || strictRolloutPercent > 100) {
            throw new Error("ASSISTANT_STRICT_ROLLOUT_PERCENT must be between 0 and 100.");
        }
        if (!this.isStrictMode()) {
            return;
        }
        const verificationMode = this.getVerificationMode();
        if (verificationMode === "none") {
            throw new Error("ASSISTANT_STRICT_AUTH=true requires ASSISTANT_AUTH_JWT_HS_SECRET or ASSISTANT_AUTH_JWT_PUBLIC_KEY or ASSISTANT_AUTH_JWKS_URL.");
        }
        if (!this.hasJwtIssuer()) {
            throw new Error("ASSISTANT_STRICT_AUTH=true requires ASSISTANT_AUTH_JWT_ISSUER.");
        }
        if (!this.hasJwtAudience()) {
            throw new Error("ASSISTANT_STRICT_AUTH=true requires ASSISTANT_AUTH_JWT_AUDIENCE.");
        }
    }
    isStrictMode() {
        return process.env.ASSISTANT_STRICT_AUTH === "true";
    }
    getVerificationMode() {
        const hasHsSecret = Boolean(process.env.ASSISTANT_AUTH_JWT_HS_SECRET);
        const hasRsKey = Boolean(process.env.ASSISTANT_AUTH_JWT_PUBLIC_KEY);
        const hasJwks = this.hasJwksUrl();
        if (hasHsSecret && hasRsKey) {
            return "hybrid";
        }
        if (hasHsSecret && hasJwks) {
            return "hybrid_jwks";
        }
        if (hasHsSecret) {
            return "hs256";
        }
        if (hasRsKey) {
            return "rs256";
        }
        if (hasJwks) {
            return "jwks_rs256";
        }
        return "none";
    }
    hasJwtIssuer() {
        return Boolean(process.env.ASSISTANT_AUTH_JWT_ISSUER);
    }
    hasJwtAudience() {
        return Boolean(process.env.ASSISTANT_AUTH_JWT_AUDIENCE);
    }
    hasJwksUrl() {
        return Boolean(process.env.ASSISTANT_AUTH_JWKS_URL);
    }
    getStrictRolloutPercent() {
        const configured = process.env.ASSISTANT_STRICT_ROLLOUT_PERCENT;
        if (!configured || configured.trim().length === 0) {
            return 100;
        }
        return Number(configured);
    }
};
exports.AssistantAuthConfigService = AssistantAuthConfigService;
exports.AssistantAuthConfigService = AssistantAuthConfigService = __decorate([
    (0, common_1.Injectable)()
], AssistantAuthConfigService);
