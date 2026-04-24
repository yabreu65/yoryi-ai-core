import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { AssistantModule } from "../assistant/assistant.module";

@Module({
  imports: [AssistantModule],
  controllers: [HealthController],
})
export class HealthModule {}
