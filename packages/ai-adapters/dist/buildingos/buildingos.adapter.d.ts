import type { ActionDefinition, ActionExecutionInput, ActionExecutionResult, AppModuleDefinition, DataBackedAnswerInput, DataBackedAnswerResult, ResolvedAssistantContext, RoleDefinition, RuntimeContextInput, SaasAssistantAdapter, KnowledgeScope } from "@yoryi/ai-types";
import type { BuildingOSFinancialGateway } from "./buildingos-financial.gateway";
import type { BuildingOSReadOnlyQueryGateway } from "./buildingos-readonly-query.gateway";
export type BuildingOSAdapterOptions = {
    financialGateway?: BuildingOSFinancialGateway;
    readOnlyQueryGateway?: BuildingOSReadOnlyQueryGateway;
};
export declare class BuildingOSAdapter implements SaasAssistantAdapter {
    readonly appId = "buildingos";
    private readonly financialGateway;
    private readonly readOnlyQueryGateway;
    private readonly readOnlyIntentClassifier;
    constructor(options?: BuildingOSAdapterOptions);
    getModules(): Promise<AppModuleDefinition[]>;
    getRoles(): Promise<RoleDefinition[]>;
    getContext(input: RuntimeContextInput): Promise<ResolvedAssistantContext>;
    getKnowledgeScopes(): Promise<KnowledgeScope[]>;
    getAvailableActions(context: ResolvedAssistantContext): Promise<ActionDefinition[]>;
    executeAction(input: ActionExecutionInput): Promise<ActionExecutionResult>;
    resolveDataBackedAnswer(input: DataBackedAnswerInput): Promise<DataBackedAnswerResult | null>;
    private extractUnitIdFromQuestion;
    private buildPermissionActions;
    private filterActionsByRole;
    private enrichActionsWithRegistry;
    private executeOpenEntityAction;
    private pickParamAsString;
    canAnswer(_question: string, context: ResolvedAssistantContext): Promise<boolean>;
    private isResidentDebtQuestion;
    private canRunReadOnlyIntent;
    private getDefaultReadOnlyActions;
    private normalizeText;
    private formatDateSafe;
    private resolveModuleFromRoute;
    private resolvePermissions;
}
