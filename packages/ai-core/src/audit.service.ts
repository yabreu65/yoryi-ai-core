import { randomUUID } from "node:crypto";
import type { AiAuditEvent, AiAuditEventType, AiAuditOutcome } from "@yoryi/ai-types";

export class AiAuditService {
  private asyncQueue: Array<AiAuditEvent> = [];
  private flushIntervalMs = 1000;
  private isProcessing = false;

  constructor() {
    this.startFlushLoop();
  }

  private startFlushLoop(): void {
    setInterval(() => {
      this.flushPendingEvents();
    }, this.flushIntervalMs);
  }

  private async flushPendingEvents(): Promise<void> {
    if (this.isProcessing || this.asyncQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const events = this.asyncQueue.splice(0);

    for (const event of events) {
      try {
        await this.persistEvent(event);
      } catch (error) {
        console.error("[AiAuditService] Failed to persist event:", error);
      }
    }

    this.isProcessing = false;
  }

  private async persistEvent(event: AiAuditEvent): Promise<void> {
    console.log("[AiAuditService]", JSON.stringify(event));
  }

  createAuditId(): string {
    return `audit-${Date.now()}-${randomUUID().slice(0, 8)}`;
  }

  logRequest(params: {
    auditId: string;
    tenantId: string;
    appId: string;
    userId: string;
    message: string;
    contextSnapshot?: Record<string, unknown>;
  }): void {
    const event: AiAuditEvent = {
      auditId: params.auditId,
      timestamp: new Date().toISOString(),
      tenantId: params.tenantId,
      appId: params.appId,
      userId: params.userId,
      eventType: "request",
      message: params.message,
      contextSnapshot: params.contextSnapshot,
    };

    this.asyncQueue.push(event);
  }

  logToolCall(params: {
    auditId: string;
    toolName: string;
    toolInput?: Record<string, unknown>;
    toolOutput?: Record<string, unknown>;
  }): void {
    const event: AiAuditEvent = {
      auditId: params.auditId,
      timestamp: new Date().toISOString(),
      tenantId: "",
      appId: "",
      userId: "",
      eventType: "tool_call",
      toolName: params.toolName,
      toolInput: params.toolInput,
      toolOutput: params.toolOutput,
    };

    this.asyncQueue.push(event);
  }

  logResponse(params: {
    auditId: string;
    outcome: AiAuditOutcome;
    errorMessage?: string;
    durationMs?: number;
    llmUsed?: boolean;
  }): void {
    const event: AiAuditEvent = {
      auditId: params.auditId,
      timestamp: new Date().toISOString(),
      tenantId: "",
      appId: "",
      userId: "",
      eventType: "response",
      outcome: params.outcome,
      errorMessage: params.errorMessage,
      durationMs: params.durationMs,
      llmUsed: params.llmUsed,
    };

    this.asyncQueue.push(event);
  }

  logError(params: {
    auditId: string;
    tenantId: string;
    appId: string;
    userId: string;
    errorMessage: string;
  }): void {
    const event: AiAuditEvent = {
      auditId: params.auditId,
      timestamp: new Date().toISOString(),
      tenantId: params.tenantId,
      appId: params.appId,
      userId: params.userId,
      eventType: "error",
      outcome: "failure",
      errorMessage: params.errorMessage,
    };

    this.asyncQueue.push(event);
  }
}

export const auditService = new AiAuditService();