export interface AssistantMetrics {
    timestamp: number;
    auditId?: string;
    question: string;
    appId: string;
    tenantId?: string;
    userId?: string;
    module?: string;
    route?: string;
    role?: string;
    actionCount: number;
    hasActions: boolean;
    llmUsed: boolean;
    knowledgeFound: boolean;
    fallback: boolean;
    answerSource?: "live_data" | "knowledge" | "fallback";
    responseType?: "metric" | "list" | "summary" | "no_data" | "clarification";
    dataScope?: "tenant" | "self" | "module" | "unknown";
    debtQueryDetected?: boolean;
    debtAnswerExact?: boolean;
    financialGatewayLatencyMs?: number;
}
export type MetricsRecorder = {
    record: (metrics: AssistantMetrics) => void;
};
export declare class AssistantMetricsService {
    private recorder;
    constructor(recorder?: MetricsRecorder);
    setRecorder(recorder: MetricsRecorder): void;
    record(question: string, appId: string, options: {
        auditId?: string;
        tenantId?: string;
        userId?: string;
        module?: string;
        route?: string;
        role?: string;
        actionCount: number;
        hasActions: boolean;
        llmUsed: boolean;
        knowledgeFound: boolean;
        fallback: boolean;
        answerSource?: "live_data" | "knowledge" | "fallback";
        responseType?: "metric" | "list" | "summary" | "no_data" | "clarification";
        dataScope?: "tenant" | "self" | "module" | "unknown";
        debtQueryDetected?: boolean;
        debtAnswerExact?: boolean;
        financialGatewayLatencyMs?: number;
    }): void;
}
export declare const metricsService: AssistantMetricsService;
