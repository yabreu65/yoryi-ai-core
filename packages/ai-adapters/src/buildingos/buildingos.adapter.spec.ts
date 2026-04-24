import { describe, it, expect, beforeEach } from "vitest";
import { BuildingOSAdapter } from "./buildingos.adapter";
import type { ResolvedAssistantContext, RuntimeContextInput } from "@yoryi/ai-types";
import type { BuildingOSFinancialGateway } from "./buildingos-financial.gateway";
import type { BuildingOSReadOnlyQueryGateway } from "./buildingos-readonly-query.gateway";

describe("BuildingOSAdapter", () => {
  let adapter: BuildingOSAdapter;

  beforeEach(() => {
    adapter = new BuildingOSAdapter();
  });

  describe("getModules()", () => {
    it("should return all supported modules", async () => {
      const modules = await adapter.getModules();
      const keys = modules.map(m => m.key);

      expect(keys).toContain("tickets");
      expect(keys).toContain("payments");
      expect(keys).toContain("communications");
      expect(keys).toContain("documents");
      expect(keys).toHaveLength(7);
    });
  });

  describe("getRoles()", () => {
    it("should return all supported roles", async () => {
      const roles = await adapter.getRoles();
      const keys = roles.map(r => r.key);

      expect(keys).toContain("SUPER_ADMIN");
      expect(keys).toContain("TENANT_OWNER");
      expect(keys).toContain("TENANT_ADMIN");
      expect(keys).toContain("OPERATOR");
      expect(keys).toContain("RESIDENT");
    });
  });

  describe("getContext - route resolution", () => {
    it("should resolve tickets from /support route", async () => {
      const input: RuntimeContextInput = {
        userId: "user-1",
        tenantId: "tenant-1",
        role: "TENANT_ADMIN",
        route: "/support",
        appId: "buildingos",
      };
      const context = await adapter.getContext(input);
      expect(context.currentModule).toBe("tickets");
    });

    it("should resolve payments from /finanzas route", async () => {
      const input: RuntimeContextInput = {
        userId: "user-1",
        tenantId: "tenant-1",
        role: "TENANT_ADMIN",
        route: "/finanzas",
        appId: "buildingos",
      };
      const context = await adapter.getContext(input);
      expect(context.currentModule).toBe("charges");
    });

    it("should resolve communications from /communications route", async () => {
      const input: RuntimeContextInput = {
        userId: "user-1",
        tenantId: "tenant-1",
        role: "TENANT_ADMIN",
        route: "/communications",
        appId: "buildingos",
      };
      const context = await adapter.getContext(input);
      expect(context.currentModule).toBe("communications");
    });

    it("should resolve documents from /documents route", async () => {
      const input: RuntimeContextInput = {
        userId: "user-1",
        tenantId: "tenant-1",
        role: "TENANT_ADMIN",
        route: "/documents",
        appId: "buildingos",
      };
      const context = await adapter.getContext(input);
      expect(context.currentModule).toBe("documents");
    });

    it("should resolve communications from /avisos route (spanish)", async () => {
      const input: RuntimeContextInput = {
        userId: "user-1",
        tenantId: "tenant-1",
        role: "RESIDENT",
        route: "/avisos",
        appId: "buildingos",
      };
      const context = await adapter.getContext(input);
      expect(context.currentModule).toBe("communications");
    });

    it("should resolve documents from /documentos route (spanish)", async () => {
      const input: RuntimeContextInput = {
        userId: "user-1",
        tenantId: "tenant-1",
        role: "RESIDENT",
        route: "/documentos",
        appId: "buildingos",
      };
      const context = await adapter.getContext(input);
      expect(context.currentModule).toBe("documents");
    });

    it("should return general for unknown routes", async () => {
      const input: RuntimeContextInput = {
        userId: "user-1",
        tenantId: "tenant-1",
        role: "TENANT_ADMIN",
        route: "/unknown",
        appId: "buildingos",
      };
      const context = await adapter.getContext(input);
      expect(context.currentModule).toBe("general");
    });
  });

  describe("getContext - permissions by role", () => {
    it("TENANT_ADMIN should have full permissions", async () => {
      const input: RuntimeContextInput = {
        userId: "user-1",
        tenantId: "tenant-1",
        role: "TENANT_ADMIN",
        route: "/support",
        appId: "buildingos",
      };
      const context = await adapter.getContext(input);
      
      expect(context.permissions).toContain("tickets.read");
      expect(context.permissions).toContain("tickets.write");
      expect(context.permissions).toContain("payments.approve");
      expect(context.permissions).toContain("communications.read");
      expect(context.permissions).toContain("communications.write");
      expect(context.permissions).toContain("documents.read");
      expect(context.permissions).toContain("documents.write");
    });

    it("OPERATOR should have limited permissions", async () => {
      const input: RuntimeContextInput = {
        userId: "user-1",
        tenantId: "tenant-1",
        role: "OPERATOR",
        route: "/support",
        appId: "buildingos",
      };
      const context = await adapter.getContext(input);
      
      expect(context.permissions).toContain("tickets.read");
      expect(context.permissions).toContain("tickets.write");
      expect(context.permissions).toContain("payments.approve");
      expect(context.permissions).toContain("communications.read");
      expect(context.permissions).toContain("communications.write");
    });

    it("RESIDENT should have read-only permissions", async () => {
      const input: RuntimeContextInput = {
        userId: "user-1",
        tenantId: "tenant-1",
        role: "RESIDENT",
        route: "/resident/tickets",
        appId: "buildingos",
      };
      const context = await adapter.getContext(input);
      
      expect(context.permissions).toContain("tickets.read");
      expect(context.permissions).not.toContain("tickets.write");
      expect(context.permissions).not.toContain("payments.approve");
    });
  });

  describe("getAvailableActions - role filtering", () => {
    const makeContext = (role: string, permissions: string[]): ResolvedAssistantContext => ({
      appId: "buildingos",
      userId: "u_1",
      role,
      route: "/tenant",
      currentModule: "general",
      permissions,
    });

    it("TENANT_ADMIN should see all actions", async () => {
      const context = makeContext("TENANT_ADMIN", [
        "buildings.read", "buildings.write",
        "units.read", "units.write",
        "charges.read", "charges.write", "charges.publish",
        "payments.read", "payments.write", "payments.approve",
        "tickets.read", "tickets.write",
        "communications.read", "communications.write",
        "documents.read", "documents.write",
      ]);
      const actions = await adapter.getAvailableActions(context);
      const keys = actions.map(a => a.key);

      expect(keys).toContain("create-ticket");
      expect(keys).toContain("view-all-payments");
      expect(keys).toContain("create-communication");
      expect(keys).toContain("upload-document");
    });

    it("RESIDENT should be filtered", async () => {
      const context = makeContext("RESIDENT", [
        "charges.read",
        "payments.read", "payments.write",
        "tickets.read",
        "communications.read",
        "documents.read",
      ]);
      const actions = await adapter.getAvailableActions(context);
      const keys = actions.map(a => a.key);

      expect(keys).not.toContain("create-ticket");
      expect(keys).not.toContain("view-all-payments");
      expect(keys).not.toContain("create-communication");
      expect(keys).not.toContain("upload-document");
      expect(keys).toContain("view-my-tickets");
      expect(keys).toContain("open-communications");
    });

    it("RESIDENT role filtering blocks admin actions even with elevated permissions", async () => {
      const context = makeContext("RESIDENT", [
        "buildings.read", "buildings.write",
        "charges.read", "charges.write", "charges.publish",
        "payments.read", "payments.approve",
        "tickets.read", "tickets.write",
        "communications.read", "communications.write",
        "documents.read", "documents.write",
      ]);
      const actions = await adapter.getAvailableActions(context);
      const keys = actions.map(a => a.key);

      expect(keys).not.toContain("create-ticket");
      expect(keys).not.toContain("view-all-payments");
      expect(keys).not.toContain("open-buildings");
      expect(keys).not.toContain("create-communication");
      expect(keys).not.toContain("upload-document");
    });
  });

  describe("getKnowledgeScopes", () => {
    it("should include all modules", async () => {
      const scopes = await adapter.getKnowledgeScopes();
      
      expect(scopes).toHaveLength(7);
      expect(scopes.find(s => s.module === "tickets")).toBeDefined();
      expect(scopes.find(s => s.module === "payments")).toBeDefined();
      expect(scopes.find(s => s.module === "communications")).toBeDefined();
      expect(scopes.find(s => s.module === "documents")).toBeDefined();
    });
  });

  describe("canAnswer", () => {
    it("should return true for allowed roles", async () => {
      const roles = ["SUPER_ADMIN", "TENANT_ADMIN", "OPERATOR", "RESIDENT"];
      for (const role of roles) {
        const context = { appId: "buildingos", userId: "u_1", role, route: "/test" } as any;
        expect(await adapter.canAnswer("test", context)).toBe(true);
      }
    });

    it("should return false for unknown role", async () => {
      const context = { appId: "buildingos", userId: "u_1", role: "UNKNOWN", route: "/test" } as any;
      expect(await adapter.canAnswer("test", context)).toBe(false);
    });
  });

  describe("resolveDataBackedAnswer", () => {
    it("returns exact debt answer for resident debt question", async () => {
      const financialGateway: BuildingOSFinancialGateway = {
        getResidentDebtSummary: async () => ({
          amount: 1500.5,
          currency: "ARS",
          asOf: "2026-04-18",
        }),
      };
      const adapterWithGateway = new BuildingOSAdapter({ financialGateway });

      const result = await adapterWithGateway.resolveDataBackedAnswer({
        question: "¿Cuánto debo hoy?",
        context: {
          appId: "buildingos",
          tenantId: "tenant-1",
          userId: "resident-1",
          role: "RESIDENT",
          route: "/resident/finanzas",
          currentModule: "charges",
          permissions: ["charges.read", "payments.read"],
        },
      });

      expect(result).not.toBeNull();
      expect(result?.answer).toContain("deuda actual");
      expect(result?.actions).toHaveLength(2);
      expect(result?.metadata?.debtAnswerExact).toBe(true);
    });

    it("returns null for non-resident roles", async () => {
      const financialGateway: BuildingOSFinancialGateway = {
        getResidentDebtSummary: async () => ({
          amount: 100,
          currency: "ARS",
          asOf: "2026-04-18",
        }),
      };
      const adapterWithGateway = new BuildingOSAdapter({ financialGateway });

      const result = await adapterWithGateway.resolveDataBackedAnswer({
        question: "cuánto debo",
        context: {
          appId: "buildingos",
          tenantId: "tenant-1",
          userId: "admin-1",
          role: "TENANT_ADMIN",
          route: "/tenant/charges",
          currentModule: "charges",
          permissions: ["charges.read", "payments.read"],
        },
      });

      expect(result).toBeNull();
    });

    it("returns null on gateway errors", async () => {
      const financialGateway: BuildingOSFinancialGateway = {
        getResidentDebtSummary: async () => {
          throw new Error("timeout");
        },
      };
      const adapterWithGateway = new BuildingOSAdapter({ financialGateway });

      const result = await adapterWithGateway.resolveDataBackedAnswer({
        question: "deuda pendiente",
        context: {
          appId: "buildingos",
          tenantId: "tenant-1",
          userId: "resident-1",
          role: "RESIDENT",
          route: "/resident/finanzas",
          currentModule: "charges",
          permissions: ["charges.read", "payments.read"],
        },
      });

      expect(result).toBeNull();
    });

    it("returns admin read-only live data answer through query gateway", async () => {
      let capturedIntentCode: string | null = null;
      const readOnlyQueryGateway: BuildingOSReadOnlyQueryGateway = {
        query: async (input) => {
          capturedIntentCode = input.intentCode;
          return {
            answer: "Resumen mensual: cobranzas ARS 1.250.000, morosidad 6.8%.",
          };
        },
      };
      const adapterWithGateway = new BuildingOSAdapter({ readOnlyQueryGateway });

      const result = await adapterWithGateway.resolveDataBackedAnswer({
        question: "Dame un resumen de cobranzas del mes",
        context: {
          appId: "buildingos",
          tenantId: "tenant-1",
          userId: "admin-1",
          role: "TENANT_ADMIN",
          route: "/tenant/charges",
          currentModule: "charges",
          permissions: ["charges.read"],
        },
      });

      expect(result).not.toBeNull();
      expect(result?.answer).toContain("Resumen mensual");
      expect(result?.metadata?.intent).toBe("GET_COLLECTIONS_SUMMARY");
      expect(result?.metadata?.intentCode).toBe("GET_COLLECTIONS_SUMMARY");
      expect(capturedIntentCode).toBe("GET_COLLECTIONS_SUMMARY");
      expect(result?.actions?.map((action) => action.key)).toEqual(["open-charges"]);
    });

    it("maps many overdue paraphrases to one canonical intent", async () => {
      const capturedIntentCodes: string[] = [];
      const readOnlyQueryGateway: BuildingOSReadOnlyQueryGateway = {
        query: async (input) => {
          capturedIntentCodes.push(input.intentCode);
          return {
            answer: "Hay 4 unidades morosas.",
          };
        },
      };
      const adapterWithGateway = new BuildingOSAdapter({ readOnlyQueryGateway });

      const context = {
        appId: "buildingos",
        tenantId: "tenant-1",
        userId: "admin-1",
        role: "TENANT_ADMIN",
        route: "/tenant/charges",
        currentModule: "charges",
        permissions: ["charges.read", "units.read", "payments.read"] as string[],
      };

      const paraphrases = [
        "¿Cuántas unidades morosas hay?",
        "¿Qué departamentos deben expensas?",
        "Mostrame los morosos",
        "¿Quiénes deben este mes?",
        "¿Qué unidades tienen deuda?",
      ];

      for (const question of paraphrases) {
        const result = await adapterWithGateway.resolveDataBackedAnswer({
          question,
          context: { ...context },
        });
        expect(result).not.toBeNull();
        expect(result?.metadata?.intentCode).toBe("GET_OVERDUE_UNITS");
      }

      expect(capturedIntentCodes).toEqual(
        Array(paraphrases.length).fill("GET_OVERDUE_UNITS")
      );
    });

    it("returns null for read-only intents when permissions are insufficient", async () => {
      let queryCalls = 0;
      const readOnlyQueryGateway: BuildingOSReadOnlyQueryGateway = {
        query: async () => {
          queryCalls += 1;
          return {
            answer: "No debería ejecutarse",
          };
        },
      };
      const adapterWithGateway = new BuildingOSAdapter({ readOnlyQueryGateway });

      const result = await adapterWithGateway.resolveDataBackedAnswer({
        question: "Dame un resumen de cobranzas del mes",
        context: {
          appId: "buildingos",
          tenantId: "tenant-1",
          userId: "admin-1",
          role: "TENANT_ADMIN",
          route: "/tenant/dashboard",
          currentModule: "general",
          permissions: ["payments.read"],
        },
      });

      expect(result).toBeNull();
      expect(queryCalls).toBe(0);
    });

    it("returns null when classifier has no clear match", async () => {
      let queryCalls = 0;
      const readOnlyQueryGateway: BuildingOSReadOnlyQueryGateway = {
        query: async () => {
          queryCalls += 1;
          return {
            answer: "No debería ejecutarse",
          };
        },
      };
      const adapterWithGateway = new BuildingOSAdapter({ readOnlyQueryGateway });

      const result = await adapterWithGateway.resolveDataBackedAnswer({
        question: "¿Qué onda?",
        context: {
          appId: "buildingos",
          tenantId: "tenant-1",
          userId: "admin-1",
          role: "TENANT_ADMIN",
          route: "/tenant/dashboard",
          currentModule: "general",
          permissions: ["charges.read", "payments.read", "tickets.read", "units.read"],
        },
      });

      expect(result).toBeNull();
      expect(queryCalls).toBe(0);
    });

    it("returns clarification when read-only query gateway fails in p0", async () => {
      const readOnlyQueryGateway: BuildingOSReadOnlyQueryGateway = {
        query: async () => {
          throw new Error("timeout");
        },
      };
      const adapterWithGateway = new BuildingOSAdapter({ readOnlyQueryGateway });

      const result = await adapterWithGateway.resolveDataBackedAnswer({
        question: "¿Cuántos pagos pendientes hay?",
        context: {
          appId: "buildingos",
          tenantId: "tenant-1",
          userId: "admin-1",
          role: "TENANT_ADMIN",
          route: "/tenant/payments",
          currentModule: "payments",
          permissions: ["payments.read"],
        },
      });

      expect(result).not.toBeNull();
      expect(result?.metadata?.responseType).toBe("clarification");
      expect(result?.metadata?.gatewayUnavailable).toBe(true);
    });
  });

  describe("executeAction", () => {
    it("executes navigate action when permission is valid", async () => {
      const result = await adapter.executeAction({
        actionKey: "open-payments",
        context: {
          appId: "buildingos",
          tenantId: "tenant-1",
          userId: "resident-1",
          role: "RESIDENT",
          route: "/resident/finanzas",
          currentModule: "payments",
          permissions: ["payments.read"],
        },
      });

      expect(result.status).toBe("executed");
      expect(result.execution?.type).toBe("navigate");
      expect(result.execution?.targetPath).toBe("/tenant/payments");
    });

    it("returns forbidden when action permission is missing", async () => {
      const result = await adapter.executeAction({
        actionKey: "open-documents",
        context: {
          appId: "buildingos",
          tenantId: "tenant-1",
          userId: "resident-1",
          role: "RESIDENT",
          route: "/resident/documents",
          currentModule: "documents",
          permissions: ["charges.read"],
        },
      });

      expect(result.status).toBe("forbidden");
      expect(result.metadata?.requiredPermission).toBe("documents.read");
    });

    it("requires confirmation for destructive actions", async () => {
      const result = await adapter.executeAction({
        actionKey: "publish-charges",
        context: {
          appId: "buildingos",
          tenantId: "tenant-1",
          userId: "admin-1",
          role: "TENANT_ADMIN",
          route: "/tenant/charges",
          currentModule: "charges",
          permissions: ["charges.publish"],
        },
      });

      expect(result.status).toBe("confirmation_required");
      expect(result.requiresConfirmation).toBe(true);
      expect(result.metadata?.destructive).toBe(true);
    });

    it("executes destructive action when confirmed", async () => {
      const result = await adapter.executeAction({
        actionKey: "publish-charges",
        confirmed: true,
        context: {
          appId: "buildingos",
          tenantId: "tenant-1",
          userId: "admin-1",
          role: "TENANT_ADMIN",
          route: "/tenant/charges",
          currentModule: "charges",
          permissions: ["charges.publish"],
        },
      });

      expect(result.status).toBe("executed");
      expect(result.execution?.type).toBe("workflow");
      expect(result.execution?.workflowKey).toBe("charges.publish");
    });

    it("supports open-entity action with strict permission validation", async () => {
      const result = await adapter.executeAction({
        actionKey: "open-entity",
        params: {
          entityType: "unit",
          entityId: "unit-42",
        },
        context: {
          appId: "buildingos",
          tenantId: "tenant-1",
          userId: "operator-1",
          role: "OPERATOR",
          route: "/tenant/units",
          currentModule: "units",
          permissions: ["units.read"],
        },
      });

      expect(result.status).toBe("executed");
      expect(result.execution?.type).toBe("open_entity");
      expect(result.execution?.targetPath).toBe("/tenant/units/unit-42");
    });
  });
});
