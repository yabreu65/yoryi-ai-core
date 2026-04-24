import type {
  ActionDefinition,
  ActionExecutionInput,
  ActionExecutionResult,
  AppModuleDefinition,
  KnowledgeScope,
  ResolvedAssistantContext,
  RoleDefinition,
  RuntimeContextInput,
  SaasAssistantAdapter,
} from "@yoryi/ai-types";

type JurisActionRegistryEntry = {
  targetPath: string;
  requiredPermission: string;
};

const JURIS_ACTION_REGISTRY: Record<string, JurisActionRegistryEntry> = {
  "open-expedientes": {
    targetPath: "/juris/expedientes",
    requiredPermission: "expedientes.read",
  },
  "open-clientes": {
    targetPath: "/juris/clientes",
    requiredPermission: "clientes.read",
  },
  "open-audiencias": {
    targetPath: "/juris/audiencias",
    requiredPermission: "audiencias.read",
  },
  "create-expediente": {
    targetPath: "/juris/expedientes/new",
    requiredPermission: "expedientes.write",
  },
  "schedule-audiencia": {
    targetPath: "/juris/audiencias/new",
    requiredPermission: "audiencias.write",
  },
};

export class JurisManagerAdapter implements SaasAssistantAdapter {
  readonly appId = "jurismanager";

  async getModules(): Promise<AppModuleDefinition[]> {
    return [
      { key: "expedientes", label: "Expedientes" },
      { key: "clientes", label: "Clientes" },
      { key: "audiencias", label: "Audiencias" },
    ];
  }

  async getRoles(): Promise<RoleDefinition[]> {
    return [
      { key: "SOCIO", label: "Socio" },
      { key: "ABOGADO", label: "Abogado" },
      { key: "ASISTENTE", label: "Asistente" },
    ];
  }

  async getContext(input: RuntimeContextInput): Promise<ResolvedAssistantContext> {
    return {
      ...input,
      currentModule: this.resolveModuleFromRoute(input.route),
      permissions: this.resolvePermissionsByRole(input.role),
    };
  }

  async getKnowledgeScopes(): Promise<KnowledgeScope[]> {
    return [
      {
        appId: this.appId,
        module: "expedientes",
        roleScope: ["SOCIO", "ABOGADO", "ASISTENTE"],
      },
      {
        appId: this.appId,
        module: "clientes",
        roleScope: ["SOCIO", "ABOGADO", "ASISTENTE"],
      },
      {
        appId: this.appId,
        module: "audiencias",
        roleScope: ["SOCIO", "ABOGADO", "ASISTENTE"],
      },
    ];
  }

  async getAvailableActions(
    context: ResolvedAssistantContext
  ): Promise<ActionDefinition[]> {
    const actions: ActionDefinition[] = [];
    const permissions = context.permissions;

    if (permissions.includes("expedientes.read")) {
      actions.push({
        key: "open-expedientes",
        label: "Open Expedientes",
        description: "Navigate to expedientes list",
        requiredPermission: "expedientes.read",
      });
    }

    if (permissions.includes("expedientes.write")) {
      actions.push({
        key: "create-expediente",
        label: "Create Expediente",
        description: "Create a new expediente",
        requiredPermission: "expedientes.write",
      });
    }

    if (permissions.includes("clientes.read")) {
      actions.push({
        key: "open-clientes",
        label: "Open Clientes",
        description: "Navigate to clientes module",
        requiredPermission: "clientes.read",
      });
    }

    if (permissions.includes("audiencias.read")) {
      actions.push({
        key: "open-audiencias",
        label: "Open Audiencias",
        description: "Navigate to audiencias calendar",
        requiredPermission: "audiencias.read",
      });
    }

    if (permissions.includes("audiencias.write")) {
      actions.push({
        key: "schedule-audiencia",
        label: "Schedule Audiencia",
        description: "Schedule a new audiencia",
        requiredPermission: "audiencias.write",
      });
    }

    return actions;
  }

  async canAnswer(
    _question: string,
    context: ResolvedAssistantContext
  ): Promise<boolean> {
    return ["SOCIO", "ABOGADO", "ASISTENTE"].includes(context.role);
  }

  async executeAction(input: ActionExecutionInput): Promise<ActionExecutionResult> {
    const definition = JURIS_ACTION_REGISTRY[input.actionKey];
    if (!definition) {
      return {
        status: "not_found",
        message: `La acción '${input.actionKey}' no está registrada en JurisManager.`,
        actionKey: input.actionKey,
      };
    }

    if (!input.context.permissions.includes(definition.requiredPermission)) {
      return {
        status: "forbidden",
        message: "No tenés permisos para ejecutar esta acción.",
        actionKey: input.actionKey,
        metadata: {
          requiredPermission: definition.requiredPermission,
        },
      };
    }

    return {
      status: "executed",
      message: "Acción validada y lista para ejecutarse.",
      actionKey: input.actionKey,
      execution: {
        type: "navigate",
        targetPath: definition.targetPath,
      },
    };
  }

  private resolveModuleFromRoute(route: string): string {
    const normalized = route.toLowerCase();
    if (normalized.includes("/expedientes")) return "expedientes";
    if (normalized.includes("/clientes")) return "clientes";
    if (normalized.includes("/audiencias")) return "audiencias";
    return "general";
  }

  private resolvePermissionsByRole(role: string): string[] {
    if (role === "SOCIO") {
      return [
        "expedientes.read",
        "expedientes.write",
        "clientes.read",
        "clientes.write",
        "audiencias.read",
        "audiencias.write",
      ];
    }

    if (role === "ABOGADO") {
      return [
        "expedientes.read",
        "expedientes.write",
        "clientes.read",
        "audiencias.read",
        "audiencias.write",
      ];
    }

    if (role === "ASISTENTE") {
      return [
        "expedientes.read",
        "clientes.read",
        "audiencias.read",
      ];
    }

    return [];
  }
}
