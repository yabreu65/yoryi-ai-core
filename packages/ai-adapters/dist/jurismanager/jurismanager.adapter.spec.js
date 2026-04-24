"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const jurismanager_adapter_1 = require("./jurismanager.adapter");
(0, vitest_1.describe)("JurisManagerAdapter", () => {
    const adapter = new jurismanager_adapter_1.JurisManagerAdapter();
    (0, vitest_1.it)("resolves modules and permissions by role", async () => {
        const context = await adapter.getContext({
            appId: "jurismanager",
            tenantId: "tenant-1",
            userId: "lawyer-1",
            role: "ABOGADO",
            route: "/juris/expedientes",
        });
        (0, vitest_1.expect)(context.currentModule).toBe("expedientes");
        (0, vitest_1.expect)(context.permissions).toContain("expedientes.write");
        (0, vitest_1.expect)(context.permissions).toContain("audiencias.write");
    });
    (0, vitest_1.it)("returns role-filtered actions", async () => {
        const actions = await adapter.getAvailableActions({
            appId: "jurismanager",
            tenantId: "tenant-1",
            userId: "assistant-1",
            role: "ASISTENTE",
            route: "/juris/clientes",
            currentModule: "clientes",
            permissions: ["expedientes.read", "clientes.read", "audiencias.read"],
        });
        const keys = actions.map((action) => action.key);
        (0, vitest_1.expect)(keys).toContain("open-expedientes");
        (0, vitest_1.expect)(keys).not.toContain("create-expediente");
    });
    (0, vitest_1.it)("validates permission on executeAction", async () => {
        const forbidden = await adapter.executeAction({
            actionKey: "create-expediente",
            context: {
                appId: "jurismanager",
                tenantId: "tenant-1",
                userId: "assistant-1",
                role: "ASISTENTE",
                route: "/juris/expedientes",
                currentModule: "expedientes",
                permissions: ["expedientes.read"],
            },
        });
        (0, vitest_1.expect)(forbidden.status).toBe("forbidden");
        const executed = await adapter.executeAction({
            actionKey: "create-expediente",
            context: {
                appId: "jurismanager",
                tenantId: "tenant-1",
                userId: "lawyer-1",
                role: "ABOGADO",
                route: "/juris/expedientes",
                currentModule: "expedientes",
                permissions: ["expedientes.read", "expedientes.write"],
            },
        });
        (0, vitest_1.expect)(executed.status).toBe("executed");
        (0, vitest_1.expect)(executed.execution?.targetPath).toBe("/juris/expedientes/new");
    });
});
