import { AnalyticsService, AssistantActionClickEvent } from "./analytics.service";
declare class TrackEventDto {
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
}
declare class FeedbackDto {
    messageId: string;
    sessionId: string;
    tenantId: string;
    role?: string;
    route?: string;
    currentModule?: string;
    rating: 'useful' | 'not_useful';
    comment?: string;
}
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    trackEvent(dto: TrackEventDto, req: any): {
        success: true;
        eventId: string;
    };
    getEvents(req: any, limit?: string): AssistantActionClickEvent[];
    getOverallMetrics(req: any, fromDate?: string, toDate?: string, currentModule?: string): {
        totalEvents: number;
        uniqueTenants: number;
        uniqueSessions: number;
        avgActionsPerMessage: number;
        mappedClicks: number;
        unmappedClicks: number;
    };
    getActionMetrics(req: any, fromDate?: string, toDate?: string, currentModule?: string): {
        actionKey: string;
        actionLabel: string;
        clicks: number;
    }[];
    getActionIndexMetrics(req: any, fromDate?: string, toDate?: string): {
        position: number;
        clicks: number;
        totalActions: number;
    }[];
    getTenantMetrics(req: any, fromDate?: string, toDate?: string): {
        tenantId: string;
        eventCount: number;
    }[];
    getDailyMetrics(req: any, fromDate?: string, toDate?: string): {
        date: string;
        eventCount: number;
    }[];
    getTenantsList(req: any): {
        tenantId: string;
        eventCount: number;
    }[];
    exportCsv(req: any, fromDate?: string, toDate?: string): string;
    exportSummaryCsv(req: any, fromDate?: string, toDate?: string): string;
    saveFeedback(dto: FeedbackDto, req: any): {
        success: true;
    };
    getFeedbackMetrics(req: any, fromDate?: string, toDate?: string, currentModule?: string): {
        totalFeedbacks: number;
        usefulCount: number;
        notUsefulCount: number;
        usefulRate: number;
    };
    getRecentComments(req: any, limit?: string, currentModule?: string): {
        comment: string;
        rating: string;
        tenantId: string;
        currentModule: string | null;
        createdAt: string;
    }[];
    getFeedbackDaily(req: any, fromDate?: string, toDate?: string, currentModule?: string): {
        date: string;
        usefulCount: number;
        notUsefulCount: number;
    }[];
    getModuleMetrics(req: any, fromDate?: string, toDate?: string): {
        currentModule: string;
        totalEvents: number;
        usefulCount: number;
        notUsefulCount: number;
        usefulRate: number;
    }[];
    getDebtMetrics(req: any, fromDate?: string, toDate?: string): import("./analytics.service").AssistantDebtMetrics;
    private requireAuthoritativeContext;
    private parsePositiveInt;
}
export {};
