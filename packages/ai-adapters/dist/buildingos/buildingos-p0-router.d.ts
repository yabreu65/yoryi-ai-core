import type { BuildingOSCanonicalIntentCode } from "./buildingos-intent-registry";
export type BuildingOSP0Route = {
    intentCode: BuildingOSCanonicalIntentCode;
    toolName: string;
    toolInput: Record<string, unknown>;
    score: number;
};
export type BuildingOSP0Clarification = {
    answer: string;
    options: Array<{
        index: number;
        label: string;
    }>;
};
type ManifestRoute = {
    intentCode: BuildingOSCanonicalIntentCode;
    toolName: string;
    keywords: string[];
    toolInput?: Record<string, unknown>;
};
type ManifestFile = {
    contractVersion: string;
    defaults: {
        debtStatus: string;
        ranking: number;
        requireBuildingWhenMultiBuilding: boolean;
        maxClarifications: number;
    };
    routes: ManifestRoute[];
};
export declare class BuildingOSP0Router {
    private readonly manifest;
    constructor();
    getDefaults(): ManifestFile["defaults"];
    route(question: string): BuildingOSP0Route | null;
    buildClarification(question: string): BuildingOSP0Clarification;
    private scoreRoute;
    private isUnitDebtWithoutReference;
    private labelForIntent;
    private loadManifest;
}
export {};
