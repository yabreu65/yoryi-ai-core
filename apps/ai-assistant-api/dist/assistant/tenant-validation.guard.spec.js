"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const assistant_auth_guard_1 = require("./assistant-auth.guard");
(0, vitest_1.describe)("TenantValidationGuard", () => {
    let guard;
    (0, vitest_1.beforeEach)(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [assistant_auth_guard_1.AssistantAuthGuard],
        }).compile();
        guard = module.get(assistant_auth_guard_1.AssistantAuthGuard);
    });
    (0, vitest_1.describe)("isTenantValidationEnabled", () => {
        (0, vitest_1.it)("returns false when TENANT_VALIDATION_ENABLED is not set", () => {
            delete process.env.TENANT_VALIDATION_ENABLED;
            (0, vitest_1.expect)(guard.isTenantValidationEnabled()).toBe(false);
        });
        (0, vitest_1.it)("returns true when TENANT_VALIDATION_ENABLED=true", () => {
            process.env.TENANT_VALIDATION_ENABLED = "true";
            (0, vitest_1.expect)(guard.isTenantValidationEnabled()).toBe(true);
        });
        (0, vitest_1.it)("returns false when TENANT_VALIDATION_ENABLED=false", () => {
            process.env.TENANT_VALIDATION_ENABLED = "false";
            (0, vitest_1.expect)(guard.isTenantValidationEnabled()).toBe(false);
        });
    });
    (0, vitest_1.describe)("validateTenantContext", () => {
        (0, vitest_1.beforeEach)(() => {
            process.env.TENANT_VALIDATION_ENABLED = "true";
        });
        (0, vitest_1.it)("throws when tenantId is missing", () => {
            (0, vitest_1.expect)(() => {
                guard.validateTenantContext({
                    appId: "buildingos",
                    userId: "user-1",
                });
            }).toThrow(common_1.UnauthorizedException);
        });
        (0, vitest_1.it)("throws when tenantId is empty", () => {
            (0, vitest_1.expect)(() => {
                guard.validateTenantContext({
                    tenantId: "",
                    appId: "buildingos",
                    userId: "user-1",
                });
            }).toThrow(common_1.UnauthorizedException);
        });
        (0, vitest_1.it)("throws when appId is missing", () => {
            (0, vitest_1.expect)(() => {
                guard.validateTenantContext({
                    tenantId: "tenant-1",
                    userId: "user-1",
                });
            }).toThrow(common_1.UnauthorizedException);
        });
        (0, vitest_1.it)("throws when appId is empty", () => {
            (0, vitest_1.expect)(() => {
                guard.validateTenantContext({
                    tenantId: "tenant-1",
                    appId: "",
                    userId: "user-1",
                });
            }).toThrow(common_1.UnauthorizedException);
        });
        (0, vitest_1.it)("passes when tenantId and appId are present", () => {
            (0, vitest_1.expect)(() => {
                guard.validateTenantContext({
                    tenantId: "tenant-1",
                    appId: "buildingos",
                    userId: "user-1",
                });
            }).not.toThrow();
        });
        (0, vitest_1.it)("passes when tenantId and appId have non-empty values", () => {
            (0, vitest_1.expect)(() => {
                guard.validateTenantContext({
                    tenantId: "  tenant-1  ",
                    appId: "  buildingos  ",
                    userId: "user-1",
                });
            }).not.toThrow();
        });
    });
});
