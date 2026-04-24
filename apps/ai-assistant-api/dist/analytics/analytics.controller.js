"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const analytics_service_1 = require("./analytics.service");
const assistant_auth_guard_1 = require("../assistant/assistant-auth.guard");
class TrackEventDto {
    eventName;
    actionKey;
    actionLabel;
    tenantId;
    currentRoute;
    currentModule;
    targetPath;
    isMapped;
    sessionId;
    messageId;
    actionIndex;
    totalActions;
    timestamp;
}
class FeedbackDto {
    messageId;
    sessionId;
    tenantId;
    role;
    route;
    currentModule;
    rating;
    comment;
}
let AnalyticsController = class AnalyticsController {
    analyticsService;
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }
    trackEvent(dto, req) {
        const authContext = this.requireAuthoritativeContext(req, {
            requireTenantId: true,
            requireUserId: true,
        });
        const event = {
            eventName: dto.eventName,
            actionKey: dto.actionKey,
            actionLabel: dto.actionLabel,
            tenantId: authContext.tenantId,
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
        this.analyticsService.trackAssistantActionClick(event);
        return { success: true, eventId: `evt-${Date.now()}` };
    }
    getEvents(req, limit) {
        const authContext = this.requireAuthoritativeContext(req, {
            requireTenantId: true,
            requireUserId: true,
        });
        const safeLimit = this.parsePositiveInt(limit, 100);
        return this.analyticsService.getEventsByTenant(authContext.tenantId, safeLimit);
    }
    getOverallMetrics(req, fromDate, toDate, currentModule) {
        const authContext = this.requireAuthoritativeContext(req, {
            requireTenantId: true,
            requireUserId: true,
        });
        return this.analyticsService.getOverallMetrics(authContext.tenantId, fromDate, toDate, currentModule);
    }
    getActionMetrics(req, fromDate, toDate, currentModule) {
        const authContext = this.requireAuthoritativeContext(req, {
            requireTenantId: true,
            requireUserId: true,
        });
        return this.analyticsService.getActionMetrics(authContext.tenantId, fromDate, toDate, currentModule);
    }
    getActionIndexMetrics(req, fromDate, toDate) {
        const authContext = this.requireAuthoritativeContext(req, {
            requireTenantId: true,
            requireUserId: true,
        });
        return this.analyticsService.getActionIndexMetrics(authContext.tenantId, fromDate, toDate);
    }
    getTenantMetrics(req, fromDate, toDate) {
        const authContext = this.requireAuthoritativeContext(req, {
            requireTenantId: true,
            requireUserId: true,
        });
        return this.analyticsService.getTenantMetrics(authContext.tenantId, fromDate, toDate);
    }
    getDailyMetrics(req, fromDate, toDate) {
        const authContext = this.requireAuthoritativeContext(req, {
            requireTenantId: true,
            requireUserId: true,
        });
        return this.analyticsService.getDailyMetrics(authContext.tenantId, fromDate, toDate);
    }
    getTenantsList(req) {
        const authContext = this.requireAuthoritativeContext(req, {
            requireTenantId: true,
            requireUserId: true,
        });
        return this.analyticsService.getTenantMetrics(authContext.tenantId);
    }
    exportCsv(req, fromDate, toDate) {
        const authContext = this.requireAuthoritativeContext(req, {
            requireTenantId: true,
            requireUserId: true,
        });
        const csv = this.analyticsService.exportToCsv(authContext.tenantId, fromDate, toDate);
        return csv;
    }
    exportSummaryCsv(req, fromDate, toDate) {
        const authContext = this.requireAuthoritativeContext(req, {
            requireTenantId: true,
            requireUserId: true,
        });
        const csv = this.analyticsService.exportSummaryToCsv(authContext.tenantId, fromDate, toDate);
        return csv;
    }
    saveFeedback(dto, req) {
        const authContext = this.requireAuthoritativeContext(req, {
            requireTenantId: true,
            requireUserId: true,
        });
        this.analyticsService.saveFeedback({
            messageId: dto.messageId,
            sessionId: dto.sessionId,
            tenantId: authContext.tenantId,
            role: authContext.role ?? null,
            route: dto.route || null,
            currentModule: dto.currentModule || null,
            rating: dto.rating,
            comment: dto.comment || null,
        });
        return { success: true };
    }
    getFeedbackMetrics(req, fromDate, toDate, currentModule) {
        const authContext = this.requireAuthoritativeContext(req, {
            requireTenantId: true,
            requireUserId: true,
        });
        return this.analyticsService.getFeedbackMetrics(authContext.tenantId, fromDate, toDate, currentModule);
    }
    getRecentComments(req, limit, currentModule) {
        const authContext = this.requireAuthoritativeContext(req, {
            requireTenantId: true,
            requireUserId: true,
        });
        return this.analyticsService.getRecentComments(authContext.tenantId, this.parsePositiveInt(limit, 10), currentModule);
    }
    getFeedbackDaily(req, fromDate, toDate, currentModule) {
        const authContext = this.requireAuthoritativeContext(req, {
            requireTenantId: true,
            requireUserId: true,
        });
        return this.analyticsService.getFeedbackDaily(authContext.tenantId, fromDate, toDate, currentModule);
    }
    getModuleMetrics(req, fromDate, toDate) {
        const authContext = this.requireAuthoritativeContext(req, {
            requireTenantId: true,
            requireUserId: true,
        });
        return this.analyticsService.getModuleMetrics(authContext.tenantId, fromDate, toDate);
    }
    getDebtMetrics(req, fromDate, toDate) {
        const authContext = this.requireAuthoritativeContext(req, {
            requireTenantId: true,
            requireUserId: true,
        });
        return this.analyticsService.getDebtMetrics(authContext.tenantId, fromDate, toDate);
    }
    requireAuthoritativeContext(req, requirements) {
        const authContext = (req?.authContext ?? {});
        if (requirements.requireUserId && !authContext.userId) {
            throw new common_1.UnauthorizedException("Missing authoritative user context for analytics.");
        }
        if (requirements.requireTenantId && !authContext.tenantId) {
            throw new common_1.UnauthorizedException("Missing authoritative tenant context for analytics.");
        }
        return authContext;
    }
    parsePositiveInt(rawValue, fallback) {
        if (!rawValue) {
            return fallback;
        }
        const parsed = Number.parseInt(rawValue, 10);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            return fallback;
        }
        return parsed;
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Post)("events"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [TrackEventDto, Object]),
    __metadata("design:returntype", Object)
], AnalyticsController.prototype, "trackEvent", null);
__decorate([
    (0, common_1.Get)("events"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Array)
], AnalyticsController.prototype, "getEvents", null);
__decorate([
    (0, common_1.Get)("metrics/overview"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("fromDate")),
    __param(2, (0, common_1.Query)("toDate")),
    __param(3, (0, common_1.Query)("currentModule")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getOverallMetrics", null);
__decorate([
    (0, common_1.Get)("metrics/actions"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("fromDate")),
    __param(2, (0, common_1.Query)("toDate")),
    __param(3, (0, common_1.Query)("currentModule")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getActionMetrics", null);
__decorate([
    (0, common_1.Get)("metrics/positions"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("fromDate")),
    __param(2, (0, common_1.Query)("toDate")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getActionIndexMetrics", null);
__decorate([
    (0, common_1.Get)("metrics/tenants"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("fromDate")),
    __param(2, (0, common_1.Query)("toDate")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getTenantMetrics", null);
__decorate([
    (0, common_1.Get)("metrics/daily"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("fromDate")),
    __param(2, (0, common_1.Query)("toDate")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getDailyMetrics", null);
__decorate([
    (0, common_1.Get)("metrics/tenants/list"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getTenantsList", null);
__decorate([
    (0, common_1.Get)("export/csv"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("fromDate")),
    __param(2, (0, common_1.Query)("toDate")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "exportCsv", null);
__decorate([
    (0, common_1.Get)("export/summary-csv"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("fromDate")),
    __param(2, (0, common_1.Query)("toDate")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "exportSummaryCsv", null);
__decorate([
    (0, common_1.Post)("feedback"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [FeedbackDto, Object]),
    __metadata("design:returntype", Object)
], AnalyticsController.prototype, "saveFeedback", null);
__decorate([
    (0, common_1.Get)("metrics/feedback"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("fromDate")),
    __param(2, (0, common_1.Query)("toDate")),
    __param(3, (0, common_1.Query)("currentModule")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getFeedbackMetrics", null);
__decorate([
    (0, common_1.Get)("metrics/feedback/comments"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("limit")),
    __param(2, (0, common_1.Query)("currentModule")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getRecentComments", null);
__decorate([
    (0, common_1.Get)("metrics/feedback/daily"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("fromDate")),
    __param(2, (0, common_1.Query)("toDate")),
    __param(3, (0, common_1.Query)("currentModule")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getFeedbackDaily", null);
__decorate([
    (0, common_1.Get)("metrics/modules"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("fromDate")),
    __param(2, (0, common_1.Query)("toDate")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getModuleMetrics", null);
__decorate([
    (0, common_1.Get)("metrics/debt"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("fromDate")),
    __param(2, (0, common_1.Query)("toDate")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getDebtMetrics", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, common_1.Controller)("api/analytics"),
    (0, common_1.UseGuards)(assistant_auth_guard_1.AssistantAuthGuard),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], AnalyticsController);
