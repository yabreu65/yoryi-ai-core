import { describe, expect, it } from "vitest";
import { JurisManagerAdapter } from "./jurismanager.adapter";

describe("JurisManagerAdapter", () => {
  const adapter = new JurisManagerAdapter();

  it("resolves modules and permissions by role", async () => {
    const context = await adapter.getContext({
      appId: "jurismanager",
      tenantId: "tenant-1",
      userId: "lawyer-1",
      role: "ABOGADO",
      route: "/juris/expedientes",
    });

    expect(context.currentModule).toBe("expedientes");
    expect(context.permissions).toContain("expedientes.write");
    expect(context.permissions).toContain("audiencias.write");
  });

  it("returns role-filtered actions", async () => {
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
    expect(keys).toContain("open-expedientes");
    expect(keys).not.toContain("create-expediente");
  });

  it("validates permission on executeAction", async () => {
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
    expect(forbidden.status).toBe("forbidden");

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
    expect(executed.status).toBe("executed");
    expect(executed.execution?.targetPath).toBe("/juris/expedientes/new");
  });
});
