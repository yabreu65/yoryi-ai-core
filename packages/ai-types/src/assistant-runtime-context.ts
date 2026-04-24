export type AssistantRuntimeContext = {
  appId: string;
  tenantId?: string;
  userId: string;
  role: string;
  route: string;

  currentModule?: string;
  entityType?: string;
  entityId?: string;
  screenTitle?: string;

  unitOccupantRole?: "OWNER" | "RESIDENT";

  permissions?: string[];
  locale?: string;

  extra?: Record<string, unknown>;
};