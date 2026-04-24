import { Module } from "@nestjs/common";
import { AssistantModule } from "./assistant/assistant.module";
import { HealthModule } from "./health/health.module";
import { AnalyticsModule } from "./analytics/analytics.module";

@Module({
  imports: [AssistantModule, HealthModule, AnalyticsModule],
})
export class AppModule {}