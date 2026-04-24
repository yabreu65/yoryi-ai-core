"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const buildingos_adapter_1 = require("./buildingos.adapter");
(0, vitest_1.describe)("BuildingOS Admin Chat Fallback - Debug", () => {
    let adapter;
    (0, vitest_1.beforeEach)(() => {
        adapter = new buildingos_adapter_1.BuildingOSAdapter({
            readOnlyQueryGateway: {
                query: vitest_1.vi.fn().mockResolvedValue({
                    answer: "Hay 12 unidades morosas en el edificio.",
                    actions: [],
                    metadata: { responseType: "list" },
                }),
            },
        });
    });
    (0, vitest_1.it)("should classify morosas question as GET_OVERDUE_UNITS", async () => {
        const result = await adapter.resolveDataBackedAnswer({
            question: "¿Cuántas unidades morosas hay?",
            context: {
                appId: "buildingos",
                tenantId: "test-tenant",
                userId: "test-user",
                role: "TENANT_ADMIN",
                permissions: ["buildings.read", "units.read", "charges.read"],
                route: "/charges",
            },
        });
        console.log("Result:", JSON.stringify(result, null, 2));
        (0, vitest_1.expect)(result?.metadata?.intentCode).toBe("GET_OVERDUE_UNITS");
        (0, vitest_1.expect)(result?.answer).toContain("unidades morosas");
    });
    (0, vitest_1.it)("should work with exact unit debt query", async () => {
        const result = await adapter.resolveDataBackedAnswer({
            question: "La unidad 123 cuánto debe",
            context: {
                appId: "buildingos",
                tenantId: "test-tenant",
                userId: "test-user",
                role: "TENANT_ADMIN",
                permissions: ["buildings.read", "units.read", "charges.read"],
                route: "/charges",
            },
        });
        console.log("Unit debt result:", JSON.stringify(result, null, 2));
    });
    (0, vitest_1.it)("should NOT return null for TENANT_ADMIN with correct permissions", async () => {
        const context = {
            appId: "buildingos",
            tenantId: "test-tenant",
            userId: "test-user",
            role: "TENANT_ADMIN",
            permissions: ["buildings.read", "units.read", "charges.read"],
            route: "/charges",
        };
        const result = await adapter.resolveDataBackedAnswer({
            question: "¿Cuántas unidades morosas hay?",
            context,
        });
        console.log("Full context test result:", JSON.stringify(result, null, 2));
        (0, vitest_1.expect)(result).not.toBeNull();
        (0, vitest_1.expect)(result?.answer).toBeDefined();
    });
});
