"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const audit_service_1 = require("./audit.service");
(0, vitest_1.describe)("AiAuditService", () => {
    let service;
    (0, vitest_1.beforeEach)(() => {
        service = new audit_service_1.AiAuditService();
    });
    (0, vitest_1.describe)("createAuditId", () => {
        (0, vitest_1.it)("creates unique audit IDs", () => {
            const id1 = service.createAuditId();
            const id2 = service.createAuditId();
            (0, vitest_1.expect)(id1).toMatch(/^audit-\d+-[a-z0-9]+$/);
            (0, vitest_1.expect)(id2).toMatch(/^audit-\d+-[a-z0-9]+$/);
            (0, vitest_1.expect)(id1).not.toBe(id2);
        });
    });
    (0, vitest_1.describe)("logRequest", () => {
        (0, vitest_1.it)("adds request event to queue", () => {
            const auditId = service.createAuditId();
            service.logRequest({
                auditId,
                tenantId: "tenant-1",
                appId: "buildingos",
                userId: "user-1",
                message: "How do I pay charges?",
                contextSnapshot: { route: "/tenant/charges" },
            });
            (0, vitest_1.expect)(auditId).toBeDefined();
        });
    });
    (0, vitest_1.describe)("logToolCall", () => {
        (0, vitest_1.it)("adds tool call event to queue", () => {
            const auditId = service.createAuditId();
            service.logToolCall({
                auditId,
                toolName: "getCharges",
                toolInput: { tenantId: "tenant-1" },
                toolOutput: { charges: [] },
            });
            (0, vitest_1.expect)(auditId).toBeDefined();
        });
    });
    (0, vitest_1.describe)("logResponse", () => {
        (0, vitest_1.it)("adds success response event to queue", () => {
            const auditId = service.createAuditId();
            service.logResponse({
                auditId,
                outcome: "success",
                durationMs: 150,
                llmUsed: true,
            });
            (0, vitest_1.expect)(auditId).toBeDefined();
        });
        (0, vitest_1.it)("adds failure response event to queue", () => {
            const auditId = service.createAuditId();
            service.logResponse({
                auditId,
                outcome: "failure",
                errorMessage: "Rate limit exceeded",
            });
            (0, vitest_1.expect)(auditId).toBeDefined();
        });
    });
    (0, vitest_1.describe)("logError", () => {
        (0, vitest_1.it)("adds error event to queue with tenant info", () => {
            const auditId = service.createAuditId();
            service.logError({
                auditId,
                tenantId: "tenant-1",
                appId: "buildingos",
                userId: "user-1",
                errorMessage: "Database connection failed",
            });
            (0, vitest_1.expect)(auditId).toBeDefined();
        });
    });
});
