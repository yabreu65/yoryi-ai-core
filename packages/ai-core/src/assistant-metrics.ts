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

class NoopMetricsRecorder implements MetricsRecorder {
  record(_metrics: AssistantMetrics): void {
    // No-op in development, replace with actual implementation in production
  }
}

export class AssistantMetricsService {
  private recorder: MetricsRecorder;

  constructor(recorder?: MetricsRecorder) {
    this.recorder = recorder || new NoopMetricsRecorder();
  }

  setRecorder(recorder: MetricsRecorder): void {
    this.recorder = recorder;
  }

  record(
    question: string,
    appId: string,
    options: {
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
    }
  ): void {
    const metrics: AssistantMetrics = {
      timestamp: Date.now(),
      question: question.slice(0, 500),
      appId,
      actionCount: options.actionCount,
      hasActions: options.hasActions,
      llmUsed: options.llmUsed,
      knowledgeFound: options.knowledgeFound,
      fallback: options.fallback,
    };
    if (options.auditId) metrics.auditId = options.auditId;
    if (options.tenantId) metrics.tenantId = options.tenantId;
    if (options.userId) metrics.userId = options.userId;
    if (options.module) metrics.module = options.module;
    if (options.route) metrics.route = options.route;
    if (options.role) metrics.role = options.role;
    if (options.answerSource) metrics.answerSource = options.answerSource;
    if (options.responseType) metrics.responseType = options.responseType;
    if (options.dataScope) metrics.dataScope = options.dataScope;
    if (options.debtQueryDetected !== undefined) metrics.debtQueryDetected = options.debtQueryDetected;
    if (options.debtAnswerExact !== undefined) metrics.debtAnswerExact = options.debtAnswerExact;
    if (options.financialGatewayLatencyMs !== undefined) metrics.financialGatewayLatencyMs = options.financialGatewayLatencyMs;
    
    this.recorder.record(metrics);
  }
}

export const metricsService = new AssistantMetricsService();
