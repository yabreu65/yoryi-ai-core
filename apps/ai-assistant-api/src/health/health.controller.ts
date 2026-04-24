import { Controller, Get } from "@nestjs/common";
import { AssistantAuthConfigService } from "../assistant/assistant-auth-config.service";
import type { HealthResponse, HealthCheckStatus } from "./health-response.dto";

@Controller("health")
export class HealthController {
  constructor(
    private readonly assistantAuthConfigService: AssistantAuthConfigService
  ) {}

  @Get()
  check(): HealthResponse {
    const startAdapter = Date.now();
    let adapterStatus: HealthCheckStatus = "ok";
    let adapterError: string | undefined;

    try {
      const isReady = this.assistantAuthConfigService.isReady();
      if (!isReady) {
        adapterStatus = "error";
        adapterError = "Auth config not ready";
      }
    } catch (e) {
      adapterStatus = "error";
      adapterError = e instanceof Error ? e.message : "Auth check failed";
    }

    const adapterLatencyMs = Date.now() - startAdapter;

    const isHealthy = adapterStatus === "ok";

    return {
      status: isHealthy ? "healthy" : "unhealthy",
      checks: {
        adapter: {
          status: adapterStatus,
          latencyMs: adapterLatencyMs,
          error: adapterError,
        },
        database: {
          status: "ok",
        },
      },
      timestamp: new Date().toISOString(),
    };
  }
}