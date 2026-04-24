import type { AssistantMetrics } from "@yoryi/ai-core";
export type AssistantActionClickEvent = {
    id?: number;
    eventName: string;
    actionKey: string;
    actionLabel: string;
    tenantId: string;
    currentRoute: string;
    currentModule?: string;
    targetPath?: string | null;
    isMapped: boolean;
    sessionId: string;
    messageId: string;
    actionIndex: number;
    totalActions: number;
    timestamp: string;
    createdAt?: string;
};
export type AssistantDebtMetrics = {
    debtQueries: number;
    exactAnswers: number;
    exactAnswerRate: number;
    fallbackDebtAnswers: number;
    fallbackRate: number;
    avgGatewayLatencyMs: number | null;
    answerSourceBreakdown: {
        live_data: number;
        knowledge: number;
        fallback: number;
    };
};
export declare class AnalyticsService {
    private db;
    constructor();
    private initSchema;
    trackAssistantActionClick(event: AssistantActionClickEvent): number;
    trackAssistantChatMetric(metric: AssistantMetrics): number;
    private trackAssistantQueryAudit;
    getDebtMetrics(tenantId?: string, fromDate?: string, toDate?: string): AssistantDebtMetrics;
    getEvents(limit?: number): AssistantActionClickEvent[];
    getEventsByTenant(tenantId: string, limit?: number): AssistantActionClickEvent[];
    getEventsBySession(sessionId: string, limit?: number): AssistantActionClickEvent[];
    private mapRows;
    onModuleDestroy(): void;
    getActionMetrics(tenantId?: string, fromDate?: string, toDate?: string, currentModule?: string): {
        actionKey: string;
        actionLabel: string;
        clicks: number;
    }[];
    getActionIndexMetrics(tenantId?: string, fromDate?: string, toDate?: string): {
        position: number;
        clicks: number;
        totalActions: number;
    }[];
    getTenantMetrics(tenantId?: string, fromDate?: string, toDate?: string): {
        tenantId: string;
        eventCount: number;
    }[];
    getDailyMetrics(tenantId?: string, fromDate?: string, toDate?: string): {
        date: string;
        eventCount: number;
    }[];
    getOverallMetrics(tenantId?: string, fromDate?: string, toDate?: string, currentModule?: string): {
        totalEvents: number;
        uniqueTenants: number;
        uniqueSessions: number;
        avgActionsPerMessage: number;
        mappedClicks: number;
        unmappedClicks: number;
    };
    getTenantsList(): {
        tenantId: string;
        eventCount: number;
    }[];
    exportToCsv(tenantId?: string, fromDate?: string, toDate?: string): string;
    exportSummaryToCsv(tenantId?: string, fromDate?: string, toDate?: string): string;
    saveFeedback(feedback: {
        messageId: string;
        sessionId: string;
        tenantId: string;
        role?: string | null;
        route?: string | null;
        currentModule?: string | null;
        rating: 'useful' | 'not_useful';
        comment?: string | null;
    }): void;
    getFeedbackMetrics(tenantId?: string, fromDate?: string, toDate?: string, currentModule?: string): {
        totalFeedbacks: number;
        usefulCount: number;
        notUsefulCount: number;
        usefulRate: number;
    };
    getRecentComments(tenantId?: string, limit?: number, currentModule?: string): {
        comment: string;
        rating: string;
        tenantId: string;
        currentModule: string | null;
        createdAt: string;
    }[];
    getFeedbackDaily(tenantId?: string, fromDate?: string, toDate?: string, currentModule?: string): {
        date: string;
        usefulCount: number;
        notUsefulCount: number;
    }[];
    getModuleMetrics(tenantId?: string, fromDate?: string, toDate?: string): {
        currentModule: string;
        totalEvents: number;
        usefulCount: number;
        notUsefulCount: number;
        usefulRate: number;
    }[];
}
