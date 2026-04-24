import { describe, it, expect, beforeEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { AssistantAuthGuard } from "./assistant-auth.guard";

describe("TenantValidationGuard", () => {
  let guard: AssistantAuthGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssistantAuthGuard],
    }).compile();

    guard = module.get<AssistantAuthGuard>(AssistantAuthGuard);
  });

  describe("isTenantValidationEnabled", () => {
    it("returns false when TENANT_VALIDATION_ENABLED is not set", () => {
      delete process.env.TENANT_VALIDATION_ENABLED;
      expect(guard.isTenantValidationEnabled()).toBe(false);
    });

    it("returns true when TENANT_VALIDATION_ENABLED=true", () => {
      process.env.TENANT_VALIDATION_ENABLED = "true";
      expect(guard.isTenantValidationEnabled()).toBe(true);
    });

    it("returns false when TENANT_VALIDATION_ENABLED=false", () => {
      process.env.TENANT_VALIDATION_ENABLED = "false";
      expect(guard.isTenantValidationEnabled()).toBe(false);
    });
  });

  describe("validateTenantContext", () => {
    beforeEach(() => {
      process.env.TENANT_VALIDATION_ENABLED = "true";
    });

    it("throws when tenantId is missing", () => {
      expect(() => {
        guard.validateTenantContext({
          appId: "buildingos",
          userId: "user-1",
        });
      }).toThrow(UnauthorizedException);
    });

    it("throws when tenantId is empty", () => {
      expect(() => {
        guard.validateTenantContext({
          tenantId: "",
          appId: "buildingos",
          userId: "user-1",
        });
      }).toThrow(UnauthorizedException);
    });

    it("throws when appId is missing", () => {
      expect(() => {
        guard.validateTenantContext({
          tenantId: "tenant-1",
          userId: "user-1",
        });
      }).toThrow(UnauthorizedException);
    });

    it("throws when appId is empty", () => {
      expect(() => {
        guard.validateTenantContext({
          tenantId: "tenant-1",
          appId: "",
          userId: "user-1",
        });
      }).toThrow(UnauthorizedException);
    });

    it("passes when tenantId and appId are present", () => {
      expect(() => {
        guard.validateTenantContext({
          tenantId: "tenant-1",
          appId: "buildingos",
          userId: "user-1",
        });
      }).not.toThrow();
    });

    it("passes when tenantId and appId have non-empty values", () => {
      expect(() => {
        guard.validateTenantContext({
          tenantId: "  tenant-1  ",
          appId: "  buildingos  ",
          userId: "user-1",
        });
      }).not.toThrow();
    });
  });
});