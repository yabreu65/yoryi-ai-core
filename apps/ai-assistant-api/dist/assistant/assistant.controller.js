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
exports.AssistantController = void 0;
const common_1 = require("@nestjs/common");
const assistant_service_1 = require("./assistant.service");
const assistant_auth_guard_1 = require("./assistant-auth.guard");
const rbac_guard_1 = require("./rbac.guard");
const assistant_mode_1 = require("./assistant-mode");
class ChatRequestDto {
    message;
    context;
    useLlm;
    sessionId;
}
class ExecuteActionRequestDto {
    actionKey;
    context;
    confirmed;
    params;
}
class RagReindexRequestDto {
    apps;
}
let AssistantController = class AssistantController {
    assistantService;
    constructor(assistantService) {
        this.assistantService = assistantService;
    }
    async chat(dto, req) {
        const request = {
            message: dto.message,
            context: dto.context,
            authContext: (req?.authContext ?? {}),
            sessionId: dto.sessionId,
        };
        if (dto.useLlm !== undefined) {
            request.useLlm = dto.useLlm;
        }
        return this.assistantService.handleChat(request);
    }
    getRolloutStatus(dto, req) {
        return this.assistantService.getRolloutStatus({
            context: dto?.context,
            authContext: (req?.authContext ?? {}),
        });
    }
    async executeAction(dto, req) {
        const authContext = (req?.authContext ?? {});
        const appId = authContext.appId ?? dto.context?.appId ?? "buildingos";
        if ((0, assistant_mode_1.isQueryOnlyModeForApp)(appId)) {
            throw new common_1.ForbiddenException("El asistente está en modo solo consulta y no puede ejecutar acciones.");
        }
        return this.assistantService.executeAction({
            actionKey: dto.actionKey,
            context: dto.context,
            confirmed: dto.confirmed,
            params: dto.params,
            authContext,
        });
    }
    async reindexRag(dto, req) {
        const token = this.extractReindexToken(req);
        this.assertReindexToken(token);
        return this.assistantService.reindexRagKnowledge({
            apps: dto.apps,
            token,
        });
    }
    extractReindexToken(req) {
        const headerToken = req?.headers?.["x-internal-token"] ??
            req?.headers?.["X-Internal-Token"] ??
            req?.headers?.["x-internal-token".toUpperCase()];
        if (typeof headerToken === "string" && headerToken.trim().length > 0) {
            return headerToken;
        }
        const authHeader = req?.headers?.authorization ?? req?.headers?.Authorization;
        if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
            return authHeader.slice("Bearer ".length).trim();
        }
        return undefined;
    }
    assertReindexToken(token) {
        const expectedToken = process.env.RAG_REINDEX_TOKEN;
        if (!expectedToken) {
            return;
        }
        if (!token || token !== expectedToken) {
            throw new common_1.UnauthorizedException("Invalid token for rag reindex operation.");
        }
    }
};
exports.AssistantController = AssistantController;
__decorate([
    (0, common_1.Post)("chat"),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(assistant_auth_guard_1.AssistantAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ChatRequestDto, Object]),
    __metadata("design:returntype", Promise)
], AssistantController.prototype, "chat", null);
__decorate([
    (0, common_1.Post)("rollout/status"),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(assistant_auth_guard_1.AssistantAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AssistantController.prototype, "getRolloutStatus", null);
__decorate([
    (0, common_1.Post)("actions/execute"),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(assistant_auth_guard_1.AssistantAuthGuard, rbac_guard_1.RbacGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ExecuteActionRequestDto, Object]),
    __metadata("design:returntype", Promise)
], AssistantController.prototype, "executeAction", null);
__decorate([
    (0, common_1.Post)("rag/reindex"),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RagReindexRequestDto, Object]),
    __metadata("design:returntype", Promise)
], AssistantController.prototype, "reindexRag", null);
exports.AssistantController = AssistantController = __decorate([
    (0, common_1.Controller)("assistant"),
    __param(0, (0, common_1.Inject)(assistant_service_1.AssistantService)),
    __metadata("design:paramtypes", [assistant_service_1.AssistantService])
], AssistantController);
