import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { AssistantRuntimeContext } from "@yoryi/ai-types";
import { AnalyticsService, AssistantActionClickEvent } from "./analytics.service";
import { AssistantAuthGuard } from "../assistant/assistant-auth.guard";

class TrackEventDto {
  eventName!: string;
  actionKey!: string;
  actionLabel!: string;
  tenantId!: string;
  currentRoute!: string;
  currentModule?: string;
  targetPath?: string | null;
  isMapped!: boolean;
  sessionId!: string;
  messageId!: string;
  actionIndex!: number;
  totalActions!: number;
  timestamp!: string;
}

class FeedbackDto {
  messageId!: string;
  sessionId!: string;
  tenantId!: string;
  role?: string;
  route?: string;
  currentModule?: string;
  rating!: 'useful' | 'not_useful';
  comment?: string;
}

@Controller("api/analytics")
@UseGuards(AssistantAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post("events")
  trackEvent(
    @Body() dto: TrackEventDto,
    @Req() req: any
  ): { success: true; eventId: string } {
    const authContext = this.requireAuthoritativeContext(req, {
      requireTenantId: true,
      requireUserId: true,
    });
    const event = {
      eventName: dto.eventName,
      actionKey: dto.actionKey,
      actionLabel: dto.actionLabel,
      tenantId: authContext.tenantId!,
      currentRoute: dto.currentRoute,
      currentModule: dto.currentModule,
      targetPath: dto.targetPath,
      isMapped: dto.isMapped,
      sessionId: dto.sessionId,
      messageId: dto.messageId,
      actionIndex: dto.actionIndex,
      totalActions: dto.totalActions,
      timestamp: dto.timestamp,
    };

    this.analyticsService.trackAssistantActionClick(event as AssistantActionClickEvent);

    return { success: true, eventId: `evt-${Date.now()}` };
  }

  @Get("events")
  getEvents(
    @Req() req: any,
    @Query("limit") limit?: string
  ): AssistantActionClickEvent[] {
    const authContext = this.requireAuthoritativeContext(req, {
      requireTenantId: true,
      requireUserId: true,
    });
    const safeLimit = this.parsePositiveInt(limit, 100);
    return this.analyticsService.getEventsByTenant(authContext.tenantId!, safeLimit);
  }

  @Get("metrics/overview")
  getOverallMetrics(
    @Req() req: any,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Query("currentModule") currentModule?: string,
  ) {
    const authContext = this.requireAuthoritativeContext(req, {
      requireTenantId: true,
      requireUserId: true,
    });
    return this.analyticsService.getOverallMetrics(
      authContext.tenantId!,
      fromDate,
      toDate,
      currentModule
    );
  }

  @Get("metrics/actions")
  getActionMetrics(
    @Req() req: any,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Query("currentModule") currentModule?: string,
  ) {
    const authContext = this.requireAuthoritativeContext(req, {
      requireTenantId: true,
      requireUserId: true,
    });
    return this.analyticsService.getActionMetrics(
      authContext.tenantId!,
      fromDate,
      toDate,
      currentModule
    );
  }

  @Get("metrics/positions")
  getActionIndexMetrics(
    @Req() req: any,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
  ) {
    const authContext = this.requireAuthoritativeContext(req, {
      requireTenantId: true,
      requireUserId: true,
    });
    return this.analyticsService.getActionIndexMetrics(
      authContext.tenantId!,
      fromDate,
      toDate
    );
  }

  @Get("metrics/tenants")
  getTenantMetrics(
    @Req() req: any,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
  ) {
    const authContext = this.requireAuthoritativeContext(req, {
      requireTenantId: true,
      requireUserId: true,
    });
    return this.analyticsService.getTenantMetrics(
      authContext.tenantId!,
      fromDate,
      toDate
    );
  }

  @Get("metrics/daily")
  getDailyMetrics(
    @Req() req: any,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
  ) {
    const authContext = this.requireAuthoritativeContext(req, {
      requireTenantId: true,
      requireUserId: true,
    });
    return this.analyticsService.getDailyMetrics(
      authContext.tenantId!,
      fromDate,
      toDate
    );
  }

  @Get("metrics/tenants/list")
  getTenantsList(@Req() req: any) {
    const authContext = this.requireAuthoritativeContext(req, {
      requireTenantId: true,
      requireUserId: true,
    });
    return this.analyticsService.getTenantMetrics(authContext.tenantId!);
  }

  @Get("export/csv")
  exportCsv(
    @Req() req: any,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
  ) {
    const authContext = this.requireAuthoritativeContext(req, {
      requireTenantId: true,
      requireUserId: true,
    });
    const csv = this.analyticsService.exportToCsv(
      authContext.tenantId!,
      fromDate,
      toDate
    );
    return csv;
  }

  @Get("export/summary-csv")
  exportSummaryCsv(
    @Req() req: any,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
  ) {
    const authContext = this.requireAuthoritativeContext(req, {
      requireTenantId: true,
      requireUserId: true,
    });
    const csv = this.analyticsService.exportSummaryToCsv(
      authContext.tenantId!,
      fromDate,
      toDate
    );
    return csv;
  }

  @Post("feedback")
  saveFeedback(@Body() dto: FeedbackDto, @Req() req: any): { success: true } {
    const authContext = this.requireAuthoritativeContext(req, {
      requireTenantId: true,
      requireUserId: true,
    });
    this.analyticsService.saveFeedback({
      messageId: dto.messageId,
      sessionId: dto.sessionId,
      tenantId: authContext.tenantId!,
      role: authContext.role ?? null,
      route: dto.route || null,
      currentModule: dto.currentModule || null,
      rating: dto.rating,
      comment: dto.comment || null,
    });
    return { success: true };
  }

  @Get("metrics/feedback")
  getFeedbackMetrics(
    @Req() req: any,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Query("currentModule") currentModule?: string,
  ) {
    const authContext = this.requireAuthoritativeContext(req, {
      requireTenantId: true,
      requireUserId: true,
    });
    return this.analyticsService.getFeedbackMetrics(
      authContext.tenantId!,
      fromDate,
      toDate,
      currentModule
    );
  }

  @Get("metrics/feedback/comments")
  getRecentComments(
    @Req() req: any,
    @Query("limit") limit?: string,
    @Query("currentModule") currentModule?: string,
  ) {
    const authContext = this.requireAuthoritativeContext(req, {
      requireTenantId: true,
      requireUserId: true,
    });
    return this.analyticsService.getRecentComments(
      authContext.tenantId!,
      this.parsePositiveInt(limit, 10),
      currentModule
    );
  }

  @Get("metrics/feedback/daily")
  getFeedbackDaily(
    @Req() req: any,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Query("currentModule") currentModule?: string,
  ) {
    const authContext = this.requireAuthoritativeContext(req, {
      requireTenantId: true,
      requireUserId: true,
    });
    return this.analyticsService.getFeedbackDaily(
      authContext.tenantId!,
      fromDate,
      toDate,
      currentModule
    );
  }

  @Get("metrics/modules")
  getModuleMetrics(
    @Req() req: any,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
  ) {
    const authContext = this.requireAuthoritativeContext(req, {
      requireTenantId: true,
      requireUserId: true,
    });
    return this.analyticsService.getModuleMetrics(
      authContext.tenantId!,
      fromDate,
      toDate
    );
  }

  @Get("metrics/debt")
  getDebtMetrics(
    @Req() req: any,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
  ) {
    const authContext = this.requireAuthoritativeContext(req, {
      requireTenantId: true,
      requireUserId: true,
    });
    return this.analyticsService.getDebtMetrics(
      authContext.tenantId!,
      fromDate,
      toDate
    );
  }

  private requireAuthoritativeContext(
    req: any,
    requirements: { requireTenantId: boolean; requireUserId: boolean }
  ): Partial<AssistantRuntimeContext> {
    const authContext = (req?.authContext ?? {}) as Partial<AssistantRuntimeContext>;

    if (requirements.requireUserId && !authContext.userId) {
      throw new UnauthorizedException(
        "Missing authoritative user context for analytics."
      );
    }

    if (requirements.requireTenantId && !authContext.tenantId) {
      throw new UnauthorizedException(
        "Missing authoritative tenant context for analytics."
      );
    }

    return authContext;
  }

  private parsePositiveInt(rawValue: string | undefined, fallback: number): number {
    if (!rawValue) {
      return fallback;
    }

    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }

    return parsed;
  }
}
