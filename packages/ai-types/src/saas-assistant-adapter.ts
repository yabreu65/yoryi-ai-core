import type { AssistantRuntimeContext } from "./assistant-runtime-context";

export type AppModuleDefinition = {
  key: string;
  label: string;
};

export type RoleDefinition = {
  key: string;
  label: string;
};

export type KnowledgeScope = {
  appId: string;
  module?: string;
  flow?: string;
  roleScope?: string[];
  locale?: string;
};

export type ActionDefinition = {
  key: string;
  label: string;
  description?: string;
  requiresConfirmation?: boolean;
  destructive?: boolean;
  requiredPermission?: string;
};

export type ActionExecution = {
  type: "navigate" | "open_entity" | "workflow";
  targetPath?: string;
  entityType?: string;
  entityId?: string;
  workflowKey?: string;
};

export type ActionExecutionInput = {
  actionKey: string;
  context: ResolvedAssistantContext;
  confirmed?: boolean;
  params?: Record<string, unknown>;
};

export type ActionExecutionResult = {
  status: "executed" | "confirmation_required" | "forbidden" | "not_found";
  message: string;
  execution?: ActionExecution;
  actionKey?: string;
  requiresConfirmation?: boolean;
  metadata?: Record<string, unknown>;
};

export type RuntimeContextInput = AssistantRuntimeContext;

export type ResolvedAssistantContext = AssistantRuntimeContext & {
  currentModule: string;
  permissions: string[];
};

export type DataBackedAnswerInput = {
  question: string;
  context: ResolvedAssistantContext;
};

export type DataBackedAnswerResult = {
  answer: string;
  actions?: ActionDefinition[];
  metadata?: Record<string, unknown>;
};

export interface SaasAssistantAdapter {
  appId: string;
  getModules(): Promise<AppModuleDefinition[]>;
  getRoles(): Promise<RoleDefinition[]>;
  getContext(input: RuntimeContextInput): Promise<ResolvedAssistantContext>;
  getKnowledgeScopes(): Promise<KnowledgeScope[]>;
  getAvailableActions(
    context: ResolvedAssistantContext
  ): Promise<ActionDefinition[]>;
  canAnswer(
    question: string,
    context: ResolvedAssistantContext
  ): Promise<boolean>;
  resolveDataBackedAnswer?(
    input: DataBackedAnswerInput
  ): Promise<DataBackedAnswerResult | null>;
  executeAction?(
    input: ActionExecutionInput
  ): Promise<ActionExecutionResult>;
}
