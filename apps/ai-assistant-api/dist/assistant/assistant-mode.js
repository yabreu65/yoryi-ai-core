"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUILDINGOS_APP_ID = void 0;
exports.isQueryOnlyModeForApp = isQueryOnlyModeForApp;
exports.BUILDINGOS_APP_ID = "buildingos";
function isQueryOnlyModeForApp(appId) {
    const normalizedAppId = (appId ?? exports.BUILDINGOS_APP_ID).toLowerCase();
    const configuredMode = process.env.ASSISTANT_MODE?.trim().toLowerCase();
    if (configuredMode === "actions_enabled") {
        return false;
    }
    if (configuredMode === "query_only") {
        return true;
    }
    return normalizedAppId === exports.BUILDINGOS_APP_ID;
}
