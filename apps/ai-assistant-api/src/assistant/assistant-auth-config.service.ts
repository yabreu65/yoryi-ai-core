import { Injectable } from "@nestjs/common";

export type AssistantAuthPublicStatus = {
  strictMode: boolean;
  verificationMode:
    | "none"
    | "hs256"
    | "rs256"
    | "jwks_rs256"
    | "hybrid"
    | "hybrid_jwks";
  issuerConfigured: boolean;
  audienceConfigured: boolean;
  jwksConfigured: boolean;
  strictRolloutPercent: number;
};

@Injectable()
export class AssistantAuthConfigService {
  getPublicStatus(): AssistantAuthPublicStatus {
    return {
      strictMode: this.isStrictMode(),
      verificationMode: this.getVerificationMode(),
      issuerConfigured: this.hasJwtIssuer(),
      audienceConfigured: this.hasJwtAudience(),
      jwksConfigured: this.hasJwksUrl(),
      strictRolloutPercent: this.getStrictRolloutPercent(),
    };
  }

  assertValidForStartup(): void {
    const strictRolloutPercent = this.getStrictRolloutPercent();
    if (Number.isNaN(strictRolloutPercent)) {
      throw new Error(
        "ASSISTANT_STRICT_ROLLOUT_PERCENT must be a valid number between 0 and 100."
      );
    }
    if (strictRolloutPercent < 0 || strictRolloutPercent > 100) {
      throw new Error(
        "ASSISTANT_STRICT_ROLLOUT_PERCENT must be between 0 and 100."
      );
    }

    if (!this.isStrictMode()) {
      return;
    }

    const verificationMode = this.getVerificationMode();
    if (verificationMode === "none") {
      throw new Error(
        "ASSISTANT_STRICT_AUTH=true requires ASSISTANT_AUTH_JWT_HS_SECRET or ASSISTANT_AUTH_JWT_PUBLIC_KEY or ASSISTANT_AUTH_JWKS_URL."
      );
    }

    if (!this.hasJwtIssuer()) {
      throw new Error(
        "ASSISTANT_STRICT_AUTH=true requires ASSISTANT_AUTH_JWT_ISSUER."
      );
    }

    if (!this.hasJwtAudience()) {
      throw new Error(
        "ASSISTANT_STRICT_AUTH=true requires ASSISTANT_AUTH_JWT_AUDIENCE."
      );
    }
  }

  private isStrictMode(): boolean {
    return process.env.ASSISTANT_STRICT_AUTH === "true";
  }

  private getVerificationMode():
    | "none"
    | "hs256"
    | "rs256"
    | "jwks_rs256"
    | "hybrid"
    | "hybrid_jwks" {
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

  private hasJwtIssuer(): boolean {
    return Boolean(process.env.ASSISTANT_AUTH_JWT_ISSUER);
  }

  private hasJwtAudience(): boolean {
    return Boolean(process.env.ASSISTANT_AUTH_JWT_AUDIENCE);
  }

  private hasJwksUrl(): boolean {
    return Boolean(process.env.ASSISTANT_AUTH_JWKS_URL);
  }

  private getStrictRolloutPercent(): number {
    const configured = process.env.ASSISTANT_STRICT_ROLLOUT_PERCENT;
    if (!configured || configured.trim().length === 0) {
      return 100;
    }
    return Number(configured);
  }
}
