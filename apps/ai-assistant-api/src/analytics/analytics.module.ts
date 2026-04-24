import { Module } from "@nestjs/common";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { AssistantMetricsRecorderService } from "./assistant-metrics-recorder.service";
import { AssistantAuthGuard } from "../assistant/assistant-auth.guard";

@Module({
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AssistantMetricsRecorderService,
    AssistantAuthGuard,
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
