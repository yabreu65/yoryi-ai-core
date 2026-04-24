"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const buildingos_adapter_1 = require("./buildingos.adapter");
(0, vitest_1.describe)("BuildingOSAdapter", () => {
    let adapter;
    (0, vitest_1.beforeEach)(() => {
        adapter = new buildingos_adapter_1.BuildingOSAdapter();
    });
    (0, vitest_1.describe)("getModules()", () => {
        (0, vitest_1.it)("should return all supported modules", async () => {
            const modules = await adapter.getModules();
            const keys = modules.map(m => m.key);
            (0, vitest_1.expect)(keys).toContain("tickets");
            (0, vitest_1.expect)(keys).toContain("payments");
            (0, vitest_1.expect)(keys).toContain("communications");
            (0, vitest_1.expect)(keys).toContain("documents");
            (0, vitest_1.expect)(keys).toHaveLength(7);
        });
    });
    (0, vitest_1.describe)("getRoles()", () => {
        (0, vitest_1.it)("should return all supported roles", async () => {
            const roles = await adapter.getRoles();
            const keys = roles.map(r => r.key);
            (0, vitest_1.expect)(keys).toContain("SUPER_ADMIN");
            (0, vitest_1.expect)(keys).toContain("TENANT_OWNER");
            (0, vitest_1.expect)(keys).toContain("TENANT_ADMIN");
            (0, vitest_1.expect)(keys).toContain("OPERATOR");
            (0, vitest_1.expect)(keys).toContain("RESIDENT");
        });
    });
    (0, vitest_1.describe)("getContext - route resolution", () => {
        (0, vitest_1.it)("should resolve tickets from /support route", async () => {
            const input = {
                userId: "user-1",
                tenantId: "tenant-1",
                role: "TENANT_ADMIN",
                route: "/support",
                appId: "buildingos",
            };
            const context = await adapter.getContext(input);
            (0, vitest_1.expect)(context.currentModule).toBe("tickets");
        });
        (0, vitest_1.it)("should resolve payments from /finanzas route", async () => {
            const input = {
                userId: "user-1",
                tenantId: "tenant-1",
                role: "TENANT_ADMIN",
                route: "/finanzas",
                appId: "buildingos",
            };
            const context = await adapter.getContext(input);
            (0, vitest_1.expect)(context.currentModule).toBe("charges");
        });
        (0, vitest_1.it)("should resolve communications from /communications route", async () => {
            const input = {
                userId: "user-1",
                tenantId: "tenant-1",
                role: "TENANT_ADMIN",
                route: "/communications",
                appId: "buildingos",
            };
            const context = await adapter.getContext(input);
            (0, vitest_1.expect)(context.currentModule).toBe("communications");
        });
        (0, vitest_1.it)("should resolve documents from /documents route", async () => {
            const input = {
                userId: "user-1",
                tenantId: "tenant-1",
                role: "TENANT_ADMIN",
                route: "/documents",
                appId: "buildingos",
            };
            const context = await adapter.getContext(input);
            (0, vitest_1.expect)(context.currentModule).toBe("documents");
        });
        (0, vitest_1.it)("should resolve communications from /avisos route (spanish)", async () => {
            const input = {
                userId: "user-1",
                tenantId: "tenant-1",
                role: "RESIDENT",
                route: "/avisos",
                appId: "buildingos",
            };
            const context = await adapter.getContext(input);
            (0, vitest_1.expect)(context.currentModule).toBe("communications");
        });
        (0, vitest_1.it)("should resolve documents from /documentos route (spanish)", async () => {
            const input = {
                userId: "user-1",
                tenantId: "tenant-1",
                role: "RESIDENT",
                route: "/documentos",
                appId: "buildingos",
            };
            const context = await adapter.getContext(input);
            (0, vitest_1.expect)(context.currentModule).toBe("documents");
        });
        (0, vitest_1.it)("should return general for unknown routes", async () => {
            const input = {
                userId: "user-1",
                tenantId: "tenant-1",
                role: "TENANT_ADMIN",
                route: "/unknown",
                appId: "buildingos",
            };
            const context = await adapter.getContext(input);
            (0, vitest_1.expect)(context.currentModule).toBe("general");
        });
    });
    (0, vitest_1.describe)("getContext - permissions by role", () => {
        (0, vitest_1.it)("TENANT_ADMIN should have full permissions", async () => {
            const input = {
                userId: "user-1",
                tenantId: "tenant-1",
                role: "TENANT_ADMIN",
                route: "/support",
                appId: "buildingos",
            };
            const context = await adapter.getContext(input);
            (0, vitest_1.expect)(context.permissions).toContain("tickets.read");
            (0, vitest_1.expect)(context.permissions).toContain("tickets.write");
            (0, vitest_1.expect)(context.permissions).toContain("payments.approve");
            (0, vitest_1.expect)(context.permissions).toContain("communications.read");
            (0, vitest_1.expect)(context.permissions).toContain("communications.write");
            (0, vitest_1.expect)(context.permissions).toContain("documents.read");
            (0, vitest_1.expect)(context.permissions).toContain("documents.write");
        });
        (0, vitest_1.it)("OPERATOR should have limited permissions", async () => {
            const input = {
                userId: "user-1",
                tenantId: "tenant-1",
                role: "OPERATOR",
                route: "/support",
                appId: "buildingos",
            };
            const context = await adapter.getContext(input);
            (0, vitest_1.expect)(context.permissions).toContain("tickets.read");
            (0, vitest_1.expect)(context.permissions).toContain("tickets.write");
            (0, vitest_1.expect)(context.permissions).toContain("payments.approve");
            (0, vitest_1.expect)(context.permissions).toContain("communications.read");
            (0, vitest_1.expect)(context.permissions).toContain("communications.write");
        });
        (0, vitest_1.it)("RESIDENT should have read-only permissions", async () => {
            const input = {
                userId: "user-1",
                tenantId: "tenant-1",
                role: "RESIDENT",
                route: "/resident/tickets",
                appId: "buildingos",
            };
            const context = await adapter.getContext(input);
            (0, vitest_1.expect)(context.permissions).toContain("tickets.read");
            (0, vitest_1.expect)(context.permissions).not.toContain("tickets.write");
            (0, vitest_1.expect)(context.permissions).not.toContain("payments.approve");
        });
    });
    (0, vitest_1.describe)("getAvailableActions - role filtering", () => {
        const makeContext = (role, permissions) => ({
            appId: "buildingos",
            userId: "u_1",
            role,
            route: "/tenant",
            currentModule: "general",
            permissions,
        });
        (0, vitest_1.it)("TENANT_ADMIN should see all actions", async () => {
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
            (0, vitest_1.expect)(keys).toContain("create-ticket");
            (0, vitest_1.expect)(keys).toContain("view-all-payments");
            (0, vitest_1.expect)(keys).toContain("create-communication");
            (0, vitest_1.expect)(keys).toContain("upload-document");
        });
        (0, vitest_1.it)("RESIDENT should be filtered", async () => {
            const context = makeContext("RESIDENT", [
                "charges.read",
                "payments.read", "payments.write",
                "tickets.read",
                "communications.read",
                "documents.read",
            ]);
            const actions = await adapter.getAvailableActions(context);
            const keys = actions.map(a => a.key);
            (0, vitest_1.expect)(keys).not.toContain("create-ticket");
            (0, vitest_1.expect)(keys).not.toContain("view-all-payments");
            (0, vitest_1.expect)(keys).not.toContain("create-communication");
            (0, vitest_1.expect)(keys).not.toContain("upload-document");
            (0, vitest_1.expect)(keys).toContain("view-my-tickets");
            (0, vitest_1.expect)(keys).toContain("open-communications");
        });
        (0, vitest_1.it)("RESIDENT role filtering blocks admin actions even with elevated permissions", async () => {
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
            (0, vitest_1.expect)(keys).not.toContain("create-ticket");
            (0, vitest_1.expect)(keys).not.toContain("view-all-payments");
            (0, vitest_1.expect)(keys).not.toContain("open-buildings");
            (0, vitest_1.expect)(keys).not.toContain("create-communication");
            (0, vitest_1.expect)(keys).not.toContain("upload-document");
        });
    });
    (0, vitest_1.describe)("getKnowledgeScopes", () => {
        (0, vitest_1.it)("should include all modules", async () => {
            const scopes = await adapter.getKnowledgeScopes();
            (0, vitest_1.expect)(scopes).toHaveLength(7);
            (0, vitest_1.expect)(scopes.find(s => s.module === "tickets")).toBeDefined();
            (0, vitest_1.expect)(scopes.find(s => s.module === "payments")).toBeDefined();
            (0, vitest_1.expect)(scopes.find(s => s.module === "communications")).toBeDefined();
            (0, vitest_1.expect)(scopes.find(s => s.module === "documents")).toBeDefined();
        });
    });
    (0, vitest_1.describe)("canAnswer", () => {
        (0, vitest_1.it)("should return true for allowed roles", async () => {
            const roles = ["SUPER_ADMIN", "TENANT_ADMIN", "OPERATOR", "RESIDENT"];
            for (const role of roles) {
                const context = { appId: "buildingos", userId: "u_1", role, route: "/test" };
                (0, vitest_1.expect)(await adapter.canAnswer("test", context)).toBe(true);
            }
        });
        (0, vitest_1.it)("should return false for unknown role", async () => {
            const context = { appId: "buildingos", userId: "u_1", role: "UNKNOWN", route: "/test" };
            (0, vitest_1.expect)(await adapter.canAnswer("test", context)).toBe(false);
        });
    });
    (0, vitest_1.describe)("resolveDataBackedAnswer", () => {
        (0, vitest_1.it)("returns exact debt answer for resident debt question", async () => {
            const financialGateway = {
                getResidentDebtSummary: async () => ({
                    amount: 1500.5,
                    currency: "ARS",
                    asOf: "2026-04-18",
                }),
            };
            const adapterWithGateway = new buildingos_adapter_1.BuildingOSAdapter({ financialGateway });
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
            (0, vitest_1.expect)(result).not.toBeNull();
            (0, vitest_1.expect)(result?.answer).toContain("deuda actual");
            (0, vitest_1.expect)(result?.actions).toHaveLength(2);
            (0, vitest_1.expect)(result?.metadata?.debtAnswerExact).toBe(true);
        });
        (0, vitest_1.it)("returns null for non-resident roles", async () => {
            const financialGateway = {
                getResidentDebtSummary: async () => ({
                    amount: 100,
                    currency: "ARS",
                    asOf: "2026-04-18",
                }),
            };
            const adapterWithGateway = new buildingos_adapter_1.BuildingOSAdapter({ financialGateway });
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
            (0, vitest_1.expect)(result).toBeNull();
        });
        (0, vitest_1.it)("returns null on gateway errors", async () => {
            const financialGateway = {
                getResidentDebtSummary: async () => {
                    throw new Error("timeout");
                },
            };
            const adapterWithGateway = new buildingos_adapter_1.BuildingOSAdapter({ financialGateway });
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
            (0, vitest_1.expect)(result).toBeNull();
        });
        (0, vitest_1.it)("returns admin read-only live data answer through query gateway", async () => {
            let capturedIntentCode = null;
            const readOnlyQueryGateway = {
                query: async (input) => {
                    capturedIntentCode = input.intentCode;
                    return {
                        answer: "Resumen mensual: cobranzas ARS 1.250.000, morosidad 6.8%.",
                    };
                },
            };
            const adapterWithGateway = new buildingos_adapter_1.BuildingOSAdapter({ readOnlyQueryGateway });
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
            (0, vitest_1.expect)(result).not.toBeNull();
            (0, vitest_1.expect)(result?.answer).toContain("Resumen mensual");
            (0, vitest_1.expect)(result?.metadata?.intent).toBe("GET_COLLECTIONS_SUMMARY");
            (0, vitest_1.expect)(result?.metadata?.intentCode).toBe("GET_COLLECTIONS_SUMMARY");
            (0, vitest_1.expect)(capturedIntentCode).toBe("GET_COLLECTIONS_SUMMARY");
            (0, vitest_1.expect)(result?.actions?.map((action) => action.key)).toEqual(["open-charges"]);
        });
        (0, vitest_1.it)("maps many overdue paraphrases to one canonical intent", async () => {
            const capturedIntentCodes = [];
            const readOnlyQueryGateway = {
                query: async (input) => {
                    capturedIntentCodes.push(input.intentCode);
                    return {
                        answer: "Hay 4 unidades morosas.",
                    };
                },
            };
            const adapterWithGateway = new buildingos_adapter_1.BuildingOSAdapter({ readOnlyQueryGateway });
            const context = {
                appId: "buildingos",
                tenantId: "tenant-1",
                userId: "admin-1",
                role: "TENANT_ADMIN",
                route: "/tenant/charges",
                currentModule: "charges",
                permissions: ["charges.read", "units.read", "payments.read"],
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
                (0, vitest_1.expect)(result).not.toBeNull();
                (0, vitest_1.expect)(result?.metadata?.intentCode).toBe("GET_OVERDUE_UNITS");
            }
            (0, vitest_1.expect)(capturedIntentCodes).toEqual(Array(paraphrases.length).fill("GET_OVERDUE_UNITS"));
        });
        (0, vitest_1.it)("returns null for read-only intents when permissions are insufficient", async () => {
            let queryCalls = 0;
            const readOnlyQueryGateway = {
                query: async () => {
                    queryCalls += 1;
                    return {
                        answer: "No debería ejecutarse",
                    };
                },
            };
            const adapterWithGateway = new buildingos_adapter_1.BuildingOSAdapter({ readOnlyQueryGateway });
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
            (0, vitest_1.expect)(result).toBeNull();
            (0, vitest_1.expect)(queryCalls).toBe(0);
        });
        (0, vitest_1.it)("returns null when classifier has no clear match", async () => {
            let queryCalls = 0;
            const readOnlyQueryGateway = {
                query: async () => {
                    queryCalls += 1;
                    return {
                        answer: "No debería ejecutarse",
                    };
                },
            };
            const adapterWithGateway = new buildingos_adapter_1.BuildingOSAdapter({ readOnlyQueryGateway });
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
            (0, vitest_1.expect)(result).toBeNull();
            (0, vitest_1.expect)(queryCalls).toBe(0);
        });
        (0, vitest_1.it)("returns null when read-only query gateway fails", async () => {
            const readOnlyQueryGateway = {
                query: async () => {
                    throw new Error("timeout");
                },
            };
            const adapterWithGateway = new buildingos_adapter_1.BuildingOSAdapter({ readOnlyQueryGateway });
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
            (0, vitest_1.expect)(result).toBeNull();
        });
    });
    (0, vitest_1.describe)("executeAction", () => {
        (0, vitest_1.it)("executes navigate action when permission is valid", async () => {
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
            (0, vitest_1.expect)(result.status).toBe("executed");
            (0, vitest_1.expect)(result.execution?.type).toBe("navigate");
            (0, vitest_1.expect)(result.execution?.targetPath).toBe("/tenant/payments");
        });
        (0, vitest_1.it)("returns forbidden when action permission is missing", async () => {
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
            (0, vitest_1.expect)(result.status).toBe("forbidden");
            (0, vitest_1.expect)(result.metadata?.requiredPermission).toBe("documents.read");
        });
        (0, vitest_1.it)("requires confirmation for destructive actions", async () => {
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
            (0, vitest_1.expect)(result.status).toBe("confirmation_required");
            (0, vitest_1.expect)(result.requiresConfirmation).toBe(true);
            (0, vitest_1.expect)(result.metadata?.destructive).toBe(true);
        });
        (0, vitest_1.it)("executes destructive action when confirmed", async () => {
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
            (0, vitest_1.expect)(result.status).toBe("executed");
            (0, vitest_1.expect)(result.execution?.type).toBe("workflow");
            (0, vitest_1.expect)(result.execution?.workflowKey).toBe("charges.publish");
        });
        (0, vitest_1.it)("supports open-entity action with strict permission validation", async () => {
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
            (0, vitest_1.expect)(result.status).toBe("executed");
            (0, vitest_1.expect)(result.execution?.type).toBe("open_entity");
            (0, vitest_1.expect)(result.execution?.targetPath).toBe("/tenant/units/unit-42");
        });
    });
});
