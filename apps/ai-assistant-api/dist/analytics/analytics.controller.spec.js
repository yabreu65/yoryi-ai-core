"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const analytics_controller_1 = require("./analytics.controller");
(0, vitest_1.describe)("AnalyticsController", () => {
    (0, vitest_1.it)("uses authoritative tenant context for debt metrics", () => {
        const getDebtMetrics = vitest_1.vi.fn().mockReturnValue({
            debtQueries: 10,
            exactAnswers: 8,
            exactAnswerRate: 80,
            fallbackDebtAnswers: 2,
            fallbackRate: 20,
            avgGatewayLatencyMs: 120.5,
            answerSourceBreakdown: {
                live_data: 8,
                knowledge: 0,
                fallback: 2,
            },
        });
        const controller = new analytics_controller_1.AnalyticsController({
            getDebtMetrics,
        });
        const result = controller.getDebtMetrics({
            authContext: {
                tenantId: "tenant-auth",
                userId: "admin-auth",
                role: "TENANT_ADMIN",
            },
        }, "2026-04-01", "2026-04-18");
        (0, vitest_1.expect)(getDebtMetrics).toHaveBeenCalledWith("tenant-auth", "2026-04-01", "2026-04-18");
        (0, vitest_1.expect)(result.exactAnswerRate).toBe(80);
    });
    (0, vitest_1.it)("overrides spoofed tenantId on trackEvent with auth tenant", () => {
        const trackAssistantActionClick = vitest_1.vi.fn();
        const controller = new analytics_controller_1.AnalyticsController({
            trackAssistantActionClick,
        });
        controller.trackEvent({
            eventName: "assistant_action_click",
            actionKey: "open-payments",
            actionLabel: "Open Payments",
            tenantId: "tenant-body",
            currentRoute: "/tenant/payments",
            isMapped: true,
            sessionId: "session-1",
            messageId: "msg-1",
            actionIndex: 0,
            totalActions: 2,
            timestamp: "2026-04-18T20:00:00.000Z",
        }, {
            authContext: {
                tenantId: "tenant-auth",
                userId: "user-auth",
                role: "TENANT_ADMIN",
            },
        });
        (0, vitest_1.expect)(trackAssistantActionClick).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(trackAssistantActionClick.mock.calls[0][0].tenantId).toBe("tenant-auth");
    });
    (0, vitest_1.it)("rejects analytics queries when authoritative tenant context is missing", () => {
        const controller = new analytics_controller_1.AnalyticsController({
            getDebtMetrics: vitest_1.vi.fn(),
        });
        (0, vitest_1.expect)(() => controller.getDebtMetrics({
            authContext: {
                userId: "user-auth",
                role: "TENANT_ADMIN",
            },
        }, "2026-04-01", "2026-04-18")).toThrow("authoritative tenant context");
    });
});
