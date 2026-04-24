export type AiAuditEventType = "request" | "tool_call" | "response" | "error";

export type AiAuditOutcome = "success" | "failure";

export type AiAuditEvent = {
  auditId: string;
  timestamp: string;
  tenantId: string;
  appId: string;
  userId: string;

  eventType: AiAuditEventType;

  message?: string;
  contextSnapshot?: Record<string, unknown>;

  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: Record<string, unknown>;

  outcome?: AiAuditOutcome;
  errorMessage?: string;

  durationMs?: number;
  llmUsed?: boolean;
};