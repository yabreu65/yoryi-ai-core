export type HealthCheckStatus = "ok" | "error";

export type HealthResponse = {
  status: "healthy" | "unhealthy";
  checks: {
    adapter: {
      status: HealthCheckStatus;
      latencyMs?: number;
      error?: string;
    };
    database: {
      status: HealthCheckStatus;
      error?: string;
    };
  };
  timestamp: string;
};