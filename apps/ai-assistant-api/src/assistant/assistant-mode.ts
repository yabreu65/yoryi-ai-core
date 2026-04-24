export const BUILDINGOS_APP_ID = "buildingos";

export function isQueryOnlyModeForApp(appId?: string): boolean {
  const normalizedAppId = (appId ?? BUILDINGOS_APP_ID).toLowerCase();
  const configuredMode = process.env.ASSISTANT_MODE?.trim().toLowerCase();

  if (configuredMode === "actions_enabled") {
    return false;
  }

  if (configuredMode === "query_only") {
    return true;
  }

  return normalizedAppId === BUILDINGOS_APP_ID;
}

