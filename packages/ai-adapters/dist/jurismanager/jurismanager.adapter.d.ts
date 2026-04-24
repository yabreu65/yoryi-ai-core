import type { ActionDefinition, ActionExecutionInput, ActionExecutionResult, AppModuleDefinition, KnowledgeScope, ResolvedAssistantContext, RoleDefinition, RuntimeContextInput, SaasAssistantAdapter } from "@yoryi/ai-types";
export declare class JurisManagerAdapter implements SaasAssistantAdapter {
    readonly appId = "jurismanager";
    getModules(): Promise<AppModuleDefinition[]>;
    getRoles(): Promise<RoleDefinition[]>;
    getContext(input: RuntimeContextInput): Promise<ResolvedAssistantContext>;
    getKnowledgeScopes(): Promise<KnowledgeScope[]>;
    getAvailableActions(context: ResolvedAssistantContext): Promise<ActionDefinition[]>;
    canAnswer(_question: string, context: ResolvedAssistantContext): Promise<boolean>;
    executeAction(input: ActionExecutionInput): Promise<ActionExecutionResult>;
    private resolveModuleFromRoute;
    private resolvePermissionsByRole;
}
