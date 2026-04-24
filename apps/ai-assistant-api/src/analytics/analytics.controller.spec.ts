import { describe, it, expect, vi } from "vitest";
import { AnalyticsController } from "./analytics.controller";

describe("AnalyticsController", () => {
  it("uses authoritative tenant context for debt metrics", () => {
    const getDebtMetrics = vi.fn().mockReturnValue({
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

    const controller = new AnalyticsController({
      getDebtMetrics,
    } as any);

    const result = controller.getDebtMetrics(
      {
        authContext: {
          tenantId: "tenant-auth",
          userId: "admin-auth",
          role: "TENANT_ADMIN",
        },
      } as any,
      "2026-04-01",
      "2026-04-18"
    );

    expect(getDebtMetrics).toHaveBeenCalledWith(
      "tenant-auth",
      "2026-04-01",
      "2026-04-18"
    );
    expect(result.exactAnswerRate).toBe(80);
  });

  it("overrides spoofed tenantId on trackEvent with auth tenant", () => {
    const trackAssistantActionClick = vi.fn();
    const controller = new AnalyticsController({
      trackAssistantActionClick,
    } as any);

    controller.trackEvent(
      {
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
      } as any,
      {
        authContext: {
          tenantId: "tenant-auth",
          userId: "user-auth",
          role: "TENANT_ADMIN",
        },
      } as any
    );

    expect(trackAssistantActionClick).toHaveBeenCalledTimes(1);
    expect(trackAssistantActionClick.mock.calls[0][0].tenantId).toBe("tenant-auth");
  });

  it("rejects analytics queries when authoritative tenant context is missing", () => {
    const controller = new AnalyticsController({
      getDebtMetrics: vi.fn(),
    } as any);

    expect(() =>
      controller.getDebtMetrics(
        {
          authContext: {
            userId: "user-auth",
            role: "TENANT_ADMIN",
          },
        } as any,
        "2026-04-01",
        "2026-04-18"
      )
    ).toThrow("authoritative tenant context");
  });
});
