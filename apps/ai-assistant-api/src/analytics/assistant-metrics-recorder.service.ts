import { Injectable } from "@nestjs/common";
import { metricsService } from "@yoryi/ai-core";
import { AnalyticsService } from "./analytics.service";

@Injectable()
export class AssistantMetricsRecorderService {
  constructor(private readonly analyticsService: AnalyticsService) {
    metricsService.setRecorder({
      record: (metric) => {
        try {
          this.analyticsService.trackAssistantChatMetric(metric);
        } catch {
          // analytics must never break request flow
        }
      },
    });
  }
}
