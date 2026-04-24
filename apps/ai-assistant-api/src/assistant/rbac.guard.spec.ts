import { describe, it, expect, beforeEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { RbacGuard } from "./rbac.guard";

describe("RbacGuard", () => {
  let guard: RbacGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RbacGuard],
    }).compile();

    guard = module.get<RbacGuard>(RbacGuard);
  });

  const mockExecutionContext = (body: Record<string, unknown>, authContext: Record<string, unknown> = {}): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          body,
          authContext,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  describe("canActivate", () => {
    it("throws when actorContext has no permissions", () => {
      const ctx = mockExecutionContext(
        { actionKey: "charges.create" },
        { userId: "user-1", permissions: [] }
      );
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it("throws when actorContext.permissions is undefined", () => {
      const ctx = mockExecutionContext(
        { actionKey: "charges.create" },
        { userId: "user-1" }
      );
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it("throws when user lacks required permission", () => {
      const ctx = mockExecutionContext(
        { actionKey: "charges.create" },
        { userId: "user-1", permissions: ["buildings.read"] }
      );
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it("allows action when user has all required permissions", () => {
      const ctx = mockExecutionContext(
        { actionKey: "charges.create" },
        { userId: "user-1", permissions: ["charges.write"] }
      );
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it("allows action with multiple permissions when user has all", () => {
      const ctx = mockExecutionContext(
        { actionKey: "payments.approve" },
        { userId: "user-1", permissions: ["payments.approve", "charges.read"] }
      );
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it("throws with permission error message", () => {
      const ctx = mockExecutionContext(
        { actionKey: "charges.create" },
        { userId: "user-1", permissions: [] }
      );
      try {
        guard.canActivate(ctx);
      } catch (e) {
        expect((e as ForbiddenException).message).toContain("Permisos insuficientes");
      }
    });
  });
});