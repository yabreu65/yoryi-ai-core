"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const buildingos_readonly_query_gateway_1 = require("./buildingos-readonly-query.gateway");
(0, vitest_1.describe)("HttpBuildingOSReadOnlyQueryGateway", () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.it)("returns a data-backed answer when API responds with a valid payload", async () => {
        const fetchMock = vitest_1.vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                answer: "Hay 12 unidades morosas en Torre A.",
                answerSource: "live_data",
                responseType: "list",
                metadata: {
                    queryId: "q-1",
                    source: "buildingos-read-db",
                },
            }),
        });
        vitest_1.vi.stubGlobal("fetch", fetchMock);
        const gateway = new buildingos_readonly_query_gateway_1.HttpBuildingOSReadOnlyQueryGateway({
            baseUrl: "https://buildingos.example.com",
            apiKey: "secret-key",
            timeoutMs: 900,
        });
        const result = await gateway.query({
            intentCode: "GET_OVERDUE_UNITS",
            question: "¿Cuántas unidades morosas tiene Torre A?",
            context: {
                appId: "buildingos",
                tenantId: "tenant-auth",
                userId: "admin-auth",
                role: "TENANT_ADMIN",
                route: "/tenant/dashboard",
                currentModule: "charges",
                permissions: ["charges.read", "units.read"],
            },
        });
        (0, vitest_1.expect)(result).toEqual({
            answer: "Hay 12 unidades morosas en Torre A.",
            metadata: {
                queryId: "q-1",
                source: "buildingos-read-db",
                intent: "GET_OVERDUE_UNITS",
                intentCode: "GET_OVERDUE_UNITS",
                answerSource: "live_data",
                responseType: "list",
            },
        });
        (0, vitest_1.expect)(fetchMock).toHaveBeenCalledTimes(1);
        const [, init] = fetchMock.mock.calls[0];
        const headers = (init.headers ?? {});
        (0, vitest_1.expect)(headers["content-type"]).toBe("application/json");
        (0, vitest_1.expect)(headers["x-api-key"]).toBe("secret-key");
        (0, vitest_1.expect)(headers["x-tenant-id"]).toBe("tenant-auth");
        (0, vitest_1.expect)(headers["x-user-id"]).toBe("admin-auth");
        (0, vitest_1.expect)(headers["x-user-role"]).toBe("TENANT_ADMIN");
        const body = JSON.parse(String(init.body));
        (0, vitest_1.expect)(body.intentCode).toBe("GET_OVERDUE_UNITS");
        (0, vitest_1.expect)(body.context.tenantId).toBe("tenant-auth");
        (0, vitest_1.expect)(body.context.userId).toBe("admin-auth");
    });
    (0, vitest_1.it)("returns null when baseUrl is missing", async () => {
        const gateway = new buildingos_readonly_query_gateway_1.HttpBuildingOSReadOnlyQueryGateway();
        const result = await gateway.query({
            intentCode: "GET_COLLECTIONS_SUMMARY",
            question: "Dame un resumen de cobranzas del mes",
            context: {
                appId: "buildingos",
                tenantId: "tenant-1",
                userId: "user-1",
                role: "TENANT_ADMIN",
                route: "/tenant/charges",
                currentModule: "charges",
                permissions: ["charges.read"],
            },
        });
        (0, vitest_1.expect)(result).toBeNull();
    });
    (0, vitest_1.it)("returns null when tenant context is missing", async () => {
        const fetchMock = vitest_1.vi.fn();
        vitest_1.vi.stubGlobal("fetch", fetchMock);
        const gateway = new buildingos_readonly_query_gateway_1.HttpBuildingOSReadOnlyQueryGateway({
            baseUrl: "https://buildingos.example.com",
        });
        const result = await gateway.query({
            intentCode: "GET_COLLECTIONS_SUMMARY",
            question: "Dame un resumen de cobranzas del mes",
            context: {
                appId: "buildingos",
                userId: "user-1",
                role: "TENANT_ADMIN",
                route: "/tenant/charges",
                currentModule: "charges",
                permissions: ["charges.read"],
            },
        });
        (0, vitest_1.expect)(result).toBeNull();
        (0, vitest_1.expect)(fetchMock).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)("returns null on malformed API payload", async () => {
        const fetchMock = vitest_1.vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                answer: "",
            }),
        });
        vitest_1.vi.stubGlobal("fetch", fetchMock);
        const gateway = new buildingos_readonly_query_gateway_1.HttpBuildingOSReadOnlyQueryGateway({
            baseUrl: "https://buildingos.example.com",
        });
        const result = await gateway.query({
            intentCode: "GET_OPEN_TICKETS",
            question: "¿Cuántos tickets abiertos hay?",
            context: {
                appId: "buildingos",
                tenantId: "tenant-1",
                userId: "admin-1",
                role: "TENANT_ADMIN",
                route: "/tenant/tickets",
                currentModule: "tickets",
                permissions: ["tickets.read"],
            },
        });
        (0, vitest_1.expect)(result).toBeNull();
    });
    (0, vitest_1.it)("opens circuit breaker after repeated gateway failures", async () => {
        const fetchMock = vitest_1.vi.fn().mockRejectedValue(new Error("network error"));
        vitest_1.vi.stubGlobal("fetch", fetchMock);
        const gateway = new buildingos_readonly_query_gateway_1.HttpBuildingOSReadOnlyQueryGateway({
            baseUrl: "https://buildingos.example.com",
            circuitBreakerFailureThreshold: 2,
            circuitBreakerOpenMs: 5_000,
        });
        const input = {
            intentCode: "GET_COLLECTIONS_SUMMARY",
            question: "Dame un resumen de cobranzas del mes",
            context: {
                appId: "buildingos",
                tenantId: "tenant-1",
                userId: "user-1",
                role: "TENANT_ADMIN",
                route: "/tenant/charges",
                currentModule: "charges",
                permissions: ["charges.read"],
            },
        };
        await gateway.query(input);
        await gateway.query(input);
        await gateway.query(input);
        (0, vitest_1.expect)(fetchMock).toHaveBeenCalledTimes(2);
    });
});
