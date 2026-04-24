"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsService = exports.AssistantMetricsService = void 0;
class NoopMetricsRecorder {
    record(_metrics) {
        // No-op in development, replace with actual implementation in production
    }
}
class AssistantMetricsService {
    recorder;
    constructor(recorder) {
        this.recorder = recorder || new NoopMetricsRecorder();
    }
    setRecorder(recorder) {
        this.recorder = recorder;
    }
    record(question, appId, options) {
        const metrics = {
            timestamp: Date.now(),
            question: question.slice(0, 500),
            appId,
            actionCount: options.actionCount,
            hasActions: options.hasActions,
            llmUsed: options.llmUsed,
            knowledgeFound: options.knowledgeFound,
            fallback: options.fallback,
        };
        if (options.auditId)
            metrics.auditId = options.auditId;
        if (options.tenantId)
            metrics.tenantId = options.tenantId;
        if (options.userId)
            metrics.userId = options.userId;
        if (options.module)
            metrics.module = options.module;
        if (options.route)
            metrics.route = options.route;
        if (options.role)
            metrics.role = options.role;
        if (options.answerSource)
            metrics.answerSource = options.answerSource;
        if (options.responseType)
            metrics.responseType = options.responseType;
        if (options.dataScope)
            metrics.dataScope = options.dataScope;
        if (options.debtQueryDetected !== undefined)
            metrics.debtQueryDetected = options.debtQueryDetected;
        if (options.debtAnswerExact !== undefined)
            metrics.debtAnswerExact = options.debtAnswerExact;
        if (options.financialGatewayLatencyMs !== undefined)
            metrics.financialGatewayLatencyMs = options.financialGatewayLatencyMs;
        this.recorder.record(metrics);
    }
}
exports.AssistantMetricsService = AssistantMetricsService;
exports.metricsService = new AssistantMetricsService();
