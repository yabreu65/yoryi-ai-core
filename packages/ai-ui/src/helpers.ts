export type AssistantAnswerSource = "live_data" | "knowledge" | "fallback";
export type AssistantResponseType =
  | "metric"
  | "list"
  | "summary"
  | "no_data"
  | "clarification";
export type AssistantDataScope = "tenant" | "self" | "module" | "unknown";

export type AssistantResponseLike = {
  answer?: string;
  answerSource?: AssistantAnswerSource;
  responseType?: AssistantResponseType;
  dataScope?: AssistantDataScope;
  provenance?: {
    strategy: AssistantAnswerSource;
    sources: Array<{ type: string; name: string; score?: number }>;
  };
  auditId?: string;
  actions?: Array<{
    key: string;
    label: string;
    requiresConfirmation?: boolean;
  }>;
  knowledgeUsed?: {
    found: boolean;
    sources: Array<{ type: string; fileName: string }>;
  };
  sessionInsights?: {
    interactionCount: number;
    repeatedQuestion: boolean;
    recentModule?: string;
  };
};

export function normalizeAssistantResponse(input: AssistantResponseLike) {
  return {
    answer: input.answer ?? "",
    answerSource: input.answerSource ?? "fallback",
    responseType: input.responseType ?? "summary",
    dataScope: input.dataScope ?? "unknown",
    provenanceStrategy: input.provenance?.strategy ?? input.answerSource ?? "fallback",
    auditId: input.auditId,
    actionCount: input.actions?.length ?? 0,
    knowledgeFound: Boolean(input.knowledgeUsed?.found),
    sourceFiles: input.knowledgeUsed?.sources?.map((source) => source.fileName) ?? [],
    repeatedQuestion: Boolean(input.sessionInsights?.repeatedQuestion),
    recentModule: input.sessionInsights?.recentModule,
  };
}

export function isConfirmationRequired(result: {
  status?: string;
  requiresConfirmation?: boolean;
}) {
  return (
    result.status === "confirmation_required" || result.requiresConfirmation === true
  );
}
