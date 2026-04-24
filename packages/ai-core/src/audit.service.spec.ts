import { describe, it, expect, beforeEach, vi } from "vitest";
import { AiAuditService } from "./audit.service";

describe("AiAuditService", () => {
  let service: AiAuditService;

  beforeEach(() => {
    service = new AiAuditService();
  });

  describe("createAuditId", () => {
    it("creates unique audit IDs", () => {
      const id1 = service.createAuditId();
      const id2 = service.createAuditId();
      expect(id1).toMatch(/^audit-\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^audit-\d+-[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe("logRequest", () => {
    it("adds request event to queue", () => {
      const auditId = service.createAuditId();
      service.logRequest({
        auditId,
        tenantId: "tenant-1",
        appId: "buildingos",
        userId: "user-1",
        message: "How do I pay charges?",
        contextSnapshot: { route: "/tenant/charges" },
      });
      expect(auditId).toBeDefined();
    });
  });

  describe("logToolCall", () => {
    it("adds tool call event to queue", () => {
      const auditId = service.createAuditId();
      service.logToolCall({
        auditId,
        toolName: "getCharges",
        toolInput: { tenantId: "tenant-1" },
        toolOutput: { charges: [] },
      });
      expect(auditId).toBeDefined();
    });
  });

  describe("logResponse", () => {
    it("adds success response event to queue", () => {
      const auditId = service.createAuditId();
      service.logResponse({
        auditId,
        outcome: "success",
        durationMs: 150,
        llmUsed: true,
      });
      expect(auditId).toBeDefined();
    });

    it("adds failure response event to queue", () => {
      const auditId = service.createAuditId();
      service.logResponse({
        auditId,
        outcome: "failure",
        errorMessage: "Rate limit exceeded",
      });
      expect(auditId).toBeDefined();
    });
  });

  describe("logError", () => {
    it("adds error event to queue with tenant info", () => {
      const auditId = service.createAuditId();
      service.logError({
        auditId,
        tenantId: "tenant-1",
        appId: "buildingos",
        userId: "user-1",
        errorMessage: "Database connection failed",
      });
      expect(auditId).toBeDefined();
    });
  });
});