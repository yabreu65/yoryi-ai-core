"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = exports.AiAuditService = void 0;
const node_crypto_1 = require("node:crypto");
class AiAuditService {
    asyncQueue = [];
    flushIntervalMs = 1000;
    isProcessing = false;
    constructor() {
        this.startFlushLoop();
    }
    startFlushLoop() {
        setInterval(() => {
            this.flushPendingEvents();
        }, this.flushIntervalMs);
    }
    async flushPendingEvents() {
        if (this.isProcessing || this.asyncQueue.length === 0) {
            return;
        }
        this.isProcessing = true;
        const events = this.asyncQueue.splice(0);
        for (const event of events) {
            try {
                await this.persistEvent(event);
            }
            catch (error) {
                console.error("[AiAuditService] Failed to persist event:", error);
            }
        }
        this.isProcessing = false;
    }
    async persistEvent(event) {
        console.log("[AiAuditService]", JSON.stringify(event));
    }
    createAuditId() {
        return `audit-${Date.now()}-${(0, node_crypto_1.randomUUID)().slice(0, 8)}`;
    }
    logRequest(params) {
        const event = {
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
    logToolCall(params) {
        const event = {
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
    logResponse(params) {
        const event = {
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
    logError(params) {
        const event = {
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
exports.AiAuditService = AiAuditService;
exports.auditService = new AiAuditService();
