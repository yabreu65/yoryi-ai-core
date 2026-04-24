"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const buildingos_financial_gateway_1 = require("./buildingos-financial.gateway");
(0, vitest_1.describe)("HttpBuildingOSFinancialGateway", () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.it)("returns debt summary when API responds with valid payload", async () => {
        const fetchMock = vitest_1.vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                amount: 123.45,
                currency: "ARS",
                asOf: "2026-04-18",
            }),
        });
        vitest_1.vi.stubGlobal("fetch", fetchMock);
        const gateway = new buildingos_financial_gateway_1.HttpBuildingOSFinancialGateway({
            baseUrl: "https://finance.example.com",
            timeoutMs: 800,
            apiKey: "secret",
        });
        const result = await gateway.getResidentDebtSummary({
            tenantId: "tenant-1",
            userId: "user-1",
        });
        (0, vitest_1.expect)(result).toEqual({
            amount: 123.45,
            currency: "ARS",
            asOf: "2026-04-18",
        });
        (0, vitest_1.expect)(fetchMock).toHaveBeenCalledTimes(1);
    });
    (0, vitest_1.it)("returns null on gateway errors", async () => {
        vitest_1.vi.stubGlobal("fetch", vitest_1.vi.fn().mockRejectedValue(new Error("network error")));
        const gateway = new buildingos_financial_gateway_1.HttpBuildingOSFinancialGateway({
            baseUrl: "https://finance.example.com",
            timeoutMs: 800,
        });
        const result = await gateway.getResidentDebtSummary({
            tenantId: "tenant-1",
            userId: "user-1",
        });
        (0, vitest_1.expect)(result).toBeNull();
    });
    (0, vitest_1.it)("returns null when baseUrl is missing", async () => {
        const gateway = new buildingos_financial_gateway_1.HttpBuildingOSFinancialGateway();
        const result = await gateway.getResidentDebtSummary({
            tenantId: "tenant-1",
            userId: "user-1",
        });
        (0, vitest_1.expect)(result).toBeNull();
    });
    (0, vitest_1.it)("opens circuit breaker after consecutive failures", async () => {
        const fetchMock = vitest_1.vi.fn().mockRejectedValue(new Error("network error"));
        vitest_1.vi.stubGlobal("fetch", fetchMock);
        const gateway = new buildingos_financial_gateway_1.HttpBuildingOSFinancialGateway({
            baseUrl: "https://finance.example.com",
            timeoutMs: 800,
            circuitBreakerFailureThreshold: 2,
            circuitBreakerOpenMs: 5_000,
        });
        await gateway.getResidentDebtSummary({
            tenantId: "tenant-1",
            userId: "user-1",
        });
        await gateway.getResidentDebtSummary({
            tenantId: "tenant-1",
            userId: "user-1",
        });
        await gateway.getResidentDebtSummary({
            tenantId: "tenant-1",
            userId: "user-1",
        });
        (0, vitest_1.expect)(fetchMock).toHaveBeenCalledTimes(2);
    });
});
