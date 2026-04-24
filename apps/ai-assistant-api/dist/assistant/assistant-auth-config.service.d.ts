export type AssistantAuthPublicStatus = {
    strictMode: boolean;
    verificationMode: "none" | "hs256" | "rs256" | "jwks_rs256" | "hybrid" | "hybrid_jwks";
    issuerConfigured: boolean;
    audienceConfigured: boolean;
    jwksConfigured: boolean;
    strictRolloutPercent: number;
};
export declare class AssistantAuthConfigService {
    getPublicStatus(): AssistantAuthPublicStatus;
    assertValidForStartup(): void;
    private isStrictMode;
    private getVerificationMode;
    private hasJwtIssuer;
    private hasJwtAudience;
    private hasJwksUrl;
    private getStrictRolloutPercent;
}
