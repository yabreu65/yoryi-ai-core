import { Module } from "@nestjs/common";
import { AssistantController } from "./assistant.controller";
import { AssistantService } from "./assistant.service";
import { AssistantAuthGuard } from "./assistant-auth.guard";
import { AssistantAuthConfigService } from "./assistant-auth-config.service";

@Module({
  controllers: [AssistantController],
  providers: [AssistantService, AssistantAuthGuard, AssistantAuthConfigService],
  exports: [AssistantAuthConfigService],
})
export class AssistantModule {}
