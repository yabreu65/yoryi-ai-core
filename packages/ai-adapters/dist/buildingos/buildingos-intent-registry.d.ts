export type BuildingOSCanonicalIntentCode = "GET_OVERDUE_UNITS" | "GET_PENDING_PAYMENTS" | "GET_OPEN_TICKETS" | "GET_VACANT_UNITS" | "GET_COLLECTIONS_SUMMARY" | "GET_UNIT_DEBT";
export type BuildingOSLegacyIntentAlias = "admin_arrears_by_building" | "admin_pending_payments_month" | "admin_open_tickets_by_building" | "admin_vacant_units" | "admin_collections_summary_month" | "admin_unit_debt";
export type BuildingOSReadOnlyResponseType = "list" | "summary" | "exact";
export type BuildingOSIntentDefinition = {
    code: BuildingOSCanonicalIntentCode;
    examples: string[];
    rolesAllowed: string[];
    resolverKey: "overdueUnitsResolver" | "pendingPaymentsResolver" | "openTicketsResolver" | "vacantUnitsResolver" | "collectionsSummaryResolver" | "unitDebtResolver";
    responseType: BuildingOSReadOnlyResponseType;
    answerSource: "live_data";
    classifierHints: string[];
    legacyAliases: BuildingOSLegacyIntentAlias[];
};
export declare const BUILDINGOS_INTENT_REGISTRY: readonly BuildingOSIntentDefinition[];
export declare function getBuildingOSIntentDefinition(code: BuildingOSCanonicalIntentCode): BuildingOSIntentDefinition;
export declare function getBuildingOSIntentDefinitions(): readonly BuildingOSIntentDefinition[];
export declare function resolveCanonicalIntentCode(rawIntentCode?: string | null, rawLegacyIntent?: string | null): BuildingOSCanonicalIntentCode | null;
