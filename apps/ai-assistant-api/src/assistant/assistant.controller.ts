import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Inject,
  Req,
  ForbiddenException,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AssistantService } from "./assistant.service";
import type { AssistantRuntimeContext, TenantContext } from "@yoryi/ai-types";
import { AssistantAuthGuard } from "./assistant-auth.guard";
import { RbacGuard } from "./rbac.guard";
import { isQueryOnlyModeForApp } from "./assistant-mode";

class ChatRequestDto {
  message!: string;
  context!: TenantContext | undefined;
  useLlm?: boolean;
  sessionId?: string;
}

class ExecuteActionRequestDto {
  actionKey!: string;
  context?: Partial<AssistantRuntimeContext>;
  confirmed?: boolean;
  params?: Record<string, unknown>;
}

class RagReindexRequestDto {
  apps?: string[];
}

@Controller("assistant")
export class AssistantController {
  constructor(
    @Inject(AssistantService)
    private readonly assistantService: AssistantService
  ) {}

  @Post("chat")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AssistantAuthGuard)
  async chat(@Body() dto: ChatRequestDto, @Req() req: any) {
    const request = {
      message: dto.message,
      context: dto.context,
      authContext: (req?.authContext ?? {}) as Partial<AssistantRuntimeContext>,
      sessionId: dto.sessionId,
    };
    if (dto.useLlm !== undefined) {
      (request as any).useLlm = dto.useLlm;
    }
    return this.assistantService.handleChat(request);
  }

  @Post("rollout/status")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AssistantAuthGuard)
  getRolloutStatus(@Body() dto: { context?: Partial<AssistantRuntimeContext> }, @Req() req: any) {
    return this.assistantService.getRolloutStatus({
      context: dto?.context,
      authContext: (req?.authContext ?? {}) as Partial<AssistantRuntimeContext>,
    });
  }

  @Post("actions/execute")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AssistantAuthGuard, RbacGuard)
  async executeAction(@Body() dto: ExecuteActionRequestDto, @Req() req: any) {
    const authContext = (req?.authContext ?? {}) as Partial<AssistantRuntimeContext>;
    const appId = authContext.appId ?? dto.context?.appId ?? "buildingos";

    if (isQueryOnlyModeForApp(appId)) {
      throw new ForbiddenException(
        "El asistente está en modo solo consulta y no puede ejecutar acciones."
      );
    }

    return this.assistantService.executeAction({
      actionKey: dto.actionKey,
      context: dto.context,
      confirmed: dto.confirmed,
      params: dto.params,
      authContext,
    });
  }

  @Post("rag/reindex")
  @HttpCode(HttpStatus.OK)
  async reindexRag(@Body() dto: RagReindexRequestDto, @Req() req: any) {
    const token = this.extractReindexToken(req);
    this.assertReindexToken(token);

    return this.assistantService.reindexRagKnowledge({
      apps: dto.apps,
      token,
    });
  }

  private extractReindexToken(req: any): string | undefined {
    const headerToken =
      req?.headers?.["x-internal-token"] ??
      req?.headers?.["X-Internal-Token"] ??
      req?.headers?.["x-internal-token".toUpperCase()];

    if (typeof headerToken === "string" && headerToken.trim().length > 0) {
      return headerToken;
    }

    const authHeader =
      req?.headers?.authorization ?? req?.headers?.Authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      return authHeader.slice("Bearer ".length).trim();
    }

    return undefined;
  }

  private assertReindexToken(token?: string): void {
    const expectedToken = process.env.RAG_REINDEX_TOKEN;
    if (!expectedToken) {
      return;
    }

    if (!token || token !== expectedToken) {
      throw new UnauthorizedException("Invalid token for rag reindex operation.");
    }
  }
}
