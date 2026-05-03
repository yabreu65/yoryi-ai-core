export type BuildingOSP2IntentCode = "GET_UNIT_DEBT_TREND" | "GET_BUILDING_DEBT_TREND" | "GET_COLLECTIONS_TREND" | "GET_UNIT_OVERDUE_TREND" | "GET_UNIT_CHARGED_TREND" | "GET_UNIT_COLLECTED_TREND" | "GET_BUILDING_OVERDUE_TREND" | "GET_COLLECTION_RATE_TREND" | "GET_12MONTH_TREND" | "GET_BUILDING_TREND_LAST_YEAR";
export type BuildingOSP2Route = {
    intentCode: BuildingOSP2IntentCode;
    toolName: "get_unit_debt_trend" | "get_building_debt_trend" | "get_collections_trend";
    toolInput: Record<string, unknown>;
    score: number;
};
export type BuildingOSP2Clarification = {
    answer: string;
    options: Array<{
        index: number;
        label: string;
    }>;
};
type ManifestRoute = {
    intentCode: BuildingOSP2IntentCode;
    toolName: "get_unit_debt_trend" | "get_building_debt_trend" | "get_collections_trend";
    keywords: string[];
    toolInput?: Record<string, unknown>;
};
type ManifestFile = {
    contractVersion: string;
    defaults: {
        months: number;
        maxMonths: number;
        requireBuildingWhenMultiBuilding: boolean;
        maxClarifications: number;
        metric: string;
        metrics: string[];
        ranking: number;
    };
    routes: ManifestRoute[];
};
export declare class BuildingOSP2Router {
    private readonly manifest;
    constructor();
    getDefaults(): ManifestFile["defaults"];
    getManifestVersion(): string;
    route(question: string, options?: {
        buildingId?: string;
        unitId?: string;
        buildingCount?: number;
    }): BuildingOSP2Route | BuildingOSP2Clarification | null;
    extractTrendParams(normalized: string): {
        months: number;
        metric: string;
    };
    buildClarification(question: string): BuildingOSP2Clarification;
    private buildBuildingClarification;
    private mergeToolInput;
    private scoreRoute;
    private labelForIntent;
    private loadManifest;
}
export {};
