import type { BuildingOSCanonicalIntentCode } from "./buildingos-intent-registry";
import type { BuildingOSReadOnlyQueryInput } from "./buildingos-readonly-query.gateway";
type BuildingOSP1IntentCode = BuildingOSCanonicalIntentCode | "GET_REJECTED_TODAY" | "GET_PAYMENTS_WITHOUT_PROOF" | "GET_LAST_PAYMENT" | "GET_DEBT_AGING" | "GET_DEBT_BY_TOWER" | "GET_UNIT_BALANCE_BY_PERIOD" | "GET_URGENT_UNASSIGNED_TICKETS";
export type BuildingOSP1Route = {
    intentCode: BuildingOSP1IntentCode;
    toolName: NonNullable<BuildingOSReadOnlyQueryInput["toolName"]>;
    toolInput: Record<string, unknown>;
    score: number;
};
export type BuildingOSP1Clarification = {
    answer: string;
    options: Array<{
        index: number;
        label: string;
    }>;
};
type ManifestRoute = {
    intentCode: BuildingOSP1IntentCode;
    toolName: NonNullable<BuildingOSReadOnlyQueryInput["toolName"]>;
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
        periodsBack: number;
        maxPeriodsBack: number;
        includeCurrent: boolean;
        debtBuckets: string[];
    };
    routes: ManifestRoute[];
};
export declare class BuildingOSP1Router {
    private readonly manifest;
    constructor();
    getDefaults(): ManifestFile["defaults"];
    getManifestVersion(): string;
    route(question: string): BuildingOSP1Route | null;
    private disambiguate;
    buildClarification(question: string): BuildingOSP1Clarification;
    buildClarificationWithOptions(question: string): BuildingOSP1Clarification & {
        fullOptions: Array<{
            index: number;
            label: string;
            intentCode: string;
            toolName: string;
            toolInput: Record<string, unknown>;
        }>;
    };
    private scoreRoute;
    private isUnitDebtWithoutReference;
    private labelForIntent;
    private loadManifest;
    isRankingQuery(normalized: string): boolean;
    routeForMultiBuilding(question: string, buildingId?: string): BuildingOSP1Route | BuildingOSP1Clarification | null;
}
export {};
