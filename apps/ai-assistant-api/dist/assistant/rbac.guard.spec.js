"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const rbac_guard_1 = require("./rbac.guard");
(0, vitest_1.describe)("RbacGuard", () => {
    let guard;
    (0, vitest_1.beforeEach)(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [rbac_guard_1.RbacGuard],
        }).compile();
        guard = module.get(rbac_guard_1.RbacGuard);
    });
    const mockExecutionContext = (body, authContext = {}) => {
        return {
            switchToHttp: () => ({
                getRequest: () => ({
                    body,
                    authContext,
                }),
            }),
        };
    };
    (0, vitest_1.describe)("canActivate", () => {
        (0, vitest_1.it)("throws when actorContext has no permissions", () => {
            const ctx = mockExecutionContext({ actionKey: "charges.create" }, { userId: "user-1", permissions: [] });
            (0, vitest_1.expect)(() => guard.canActivate(ctx)).toThrow(common_1.ForbiddenException);
        });
        (0, vitest_1.it)("throws when actorContext.permissions is undefined", () => {
            const ctx = mockExecutionContext({ actionKey: "charges.create" }, { userId: "user-1" });
            (0, vitest_1.expect)(() => guard.canActivate(ctx)).toThrow(common_1.ForbiddenException);
        });
        (0, vitest_1.it)("throws when user lacks required permission", () => {
            const ctx = mockExecutionContext({ actionKey: "charges.create" }, { userId: "user-1", permissions: ["buildings.read"] });
            (0, vitest_1.expect)(() => guard.canActivate(ctx)).toThrow(common_1.ForbiddenException);
        });
        (0, vitest_1.it)("allows action when user has all required permissions", () => {
            const ctx = mockExecutionContext({ actionKey: "charges.create" }, { userId: "user-1", permissions: ["charges.write"] });
            (0, vitest_1.expect)(guard.canActivate(ctx)).toBe(true);
        });
        (0, vitest_1.it)("allows action with multiple permissions when user has all", () => {
            const ctx = mockExecutionContext({ actionKey: "payments.approve" }, { userId: "user-1", permissions: ["payments.approve", "charges.read"] });
            (0, vitest_1.expect)(guard.canActivate(ctx)).toBe(true);
        });
        (0, vitest_1.it)("throws with permission error message", () => {
            const ctx = mockExecutionContext({ actionKey: "charges.create" }, { userId: "user-1", permissions: [] });
            try {
                guard.canActivate(ctx);
            }
            catch (e) {
                (0, vitest_1.expect)(e.message).toContain("Permisos insuficientes");
            }
        });
    });
});
