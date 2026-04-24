export type BuildingOSCanonicalIntentCode =
  | "GET_OVERDUE_UNITS"
  | "GET_PENDING_PAYMENTS"
  | "GET_OPEN_TICKETS"
  | "GET_VACANT_UNITS"
  | "GET_COLLECTIONS_SUMMARY"
  | "GET_UNIT_DEBT"
  | "GET_UNIT_PRIMARY_RESIDENT";

export type BuildingOSLegacyIntentAlias =
  | "admin_arrears_by_building"
  | "admin_pending_payments_month"
  | "admin_open_tickets_by_building"
  | "admin_vacant_units"
  | "admin_collections_summary_month"
  | "admin_unit_debt"
  | "admin_unit_primary_resident";

export type BuildingOSReadOnlyResponseType = "list" | "summary" | "exact";

export type BuildingOSIntentDefinition = {
  code: BuildingOSCanonicalIntentCode;
  examples: string[];
  rolesAllowed: string[];
  resolverKey:
    | "overdueUnitsResolver"
    | "pendingPaymentsResolver"
    | "openTicketsResolver"
    | "vacantUnitsResolver"
    | "collectionsSummaryResolver"
    | "unitDebtResolver"
    | "unitPrimaryResidentResolver";
  responseType: BuildingOSReadOnlyResponseType;
  answerSource: "live_data";
  classifierHints: string[];
  legacyAliases: BuildingOSLegacyIntentAlias[];
};

const ADMIN_ONLY_ROLES = ["SUPER_ADMIN", "TENANT_OWNER", "TENANT_ADMIN", "OPERATOR"];

export const BUILDINGOS_INTENT_REGISTRY: readonly BuildingOSIntentDefinition[] = [
  {
    code: "GET_OVERDUE_UNITS",
    examples: [
      "¿Cuántas unidades morosas hay?",
      "¿Qué departamentos deben expensas?",
      "Mostrame los morosos",
      "¿Quiénes deben este mes?",
      "¿Qué unidades tienen deuda?",
      "Quiero ver unidades con deuda vencida",
      "Dame el listado de unidades morosas",
      "¿Cuántas unidades están en mora?",
      "Mostrame las unidades en mora",
      "Necesito ver deuda por unidad vencida",
      "Qué departamentos tienen pagos vencidos",
      "Listado de unidades con expensas impagas",
    ],
    rolesAllowed: ADMIN_ONLY_ROLES,
    resolverKey: "overdueUnitsResolver",
    responseType: "list",
    answerSource: "live_data",
    classifierHints: [
      "moroso",
      "morosos",
      "morosa",
      "mora",
      "deuda",
      "deben",
      "expensas",
      "impagas",
      "vencida",
      "unidades",
      "departamentos",
    ],
    legacyAliases: ["admin_arrears_by_building"],
  },
  {
    code: "GET_PENDING_PAYMENTS",
    examples: [
      "¿Cuántos pagos pendientes hay?",
      "Mostrame pagos pendientes de aprobación",
      "¿Qué pagos están sin revisar?",
      "Listado de pagos por aprobar",
      "Pagos en revisión",
      "¿Cuántos pagos están pendientes este mes?",
      "Quiero ver transferencias pendientes",
      "Dame pagos pendientes",
      "Qué pagos faltan aprobar",
      "Mostrame pagos reportados sin validar",
      "Pagos SUBMITTED",
      "¿Qué cobranzas están pendientes de aprobación?",
    ],
    rolesAllowed: ADMIN_ONLY_ROLES,
    resolverKey: "pendingPaymentsResolver",
    responseType: "list",
    answerSource: "live_data",
    classifierHints: [
      "pagos",
      "pago",
      "pendiente",
      "pendientes",
      "aprobar",
      "aprobacion",
      "validar",
      "revision",
      "submitted",
      "transferencias",
    ],
    legacyAliases: ["admin_pending_payments_month"],
  },
  {
    code: "GET_OPEN_TICKETS",
    examples: [
      "¿Cuántos tickets abiertos hay?",
      "Mostrame los tickets abiertos",
      "Qué reclamos están abiertos",
      "Listado de incidencias abiertas",
      "Tickets en progreso",
      "Dame tickets pendientes",
      "Quiero ver soporte abierto",
      "¿Hay tickets sin resolver?",
      "Mostrame los casos abiertos",
      "Cuál es el backlog de tickets",
      "Necesito tickets OPEN e IN_PROGRESS",
      "Qué tickets siguen activos",
    ],
    rolesAllowed: ADMIN_ONLY_ROLES,
    resolverKey: "openTicketsResolver",
    responseType: "list",
    answerSource: "live_data",
    classifierHints: [
      "ticket",
      "tickets",
      "reclamos",
      "incidencias",
      "abiertos",
      "abierto",
      "backlog",
      "soporte",
      "activos",
      "resolver",
    ],
    legacyAliases: ["admin_open_tickets_by_building"],
  },
  {
    code: "GET_VACANT_UNITS",
    examples: [
      "¿Cuántas unidades vacías hay?",
      "Mostrame unidades vacantes",
      "Qué departamentos están vacíos",
      "Listado de unidades sin ocupantes",
      "Unidades VACANT",
      "Quiero ver departamentos desocupados",
      "Qué unidades están libres",
      "Dame las unidades disponibles",
      "Mostrame unidades sin residente",
      "Cuántos departamentos están sin habitar",
      "Necesito ver vacancia",
      "Unidades con occupancy VACANT",
    ],
    rolesAllowed: ADMIN_ONLY_ROLES,
    resolverKey: "vacantUnitsResolver",
    responseType: "list",
    answerSource: "live_data",
    classifierHints: [
      "vacias",
      "vacias",
      "vacantes",
      "vacante",
      "desocupadas",
      "desocupados",
      "sin ocupantes",
      "sin residente",
      "libres",
      "unidades",
      "departamentos",
      "vacant",
    ],
    legacyAliases: ["admin_vacant_units"],
  },
  {
    code: "GET_COLLECTIONS_SUMMARY",
    examples: [
      "Dame un resumen de cobranzas",
      "Resumen de cobranzas del mes",
      "¿Cómo va la cobranza este mes?",
      "Mostrame el cierre de cobranzas",
      "Cuál es el resumen de recaudación",
      "Necesito el estado de cobranzas",
      "Cómo está la tasa de cobranza",
      "Dame métricas de cobranzas",
      "Resumen mensual de cobros",
      "Cuánto se cobró versus emitido",
      "Estado general de cobranzas",
      "Quiero ver resumen financiero mensual",
    ],
    rolesAllowed: ADMIN_ONLY_ROLES,
    resolverKey: "collectionsSummaryResolver",
    responseType: "summary",
    answerSource: "live_data",
    classifierHints: [
      "resumen",
      "cobranzas",
      "cobranza",
      "recaudacion",
      "recaudación",
      "cobros",
      "mensual",
      "mes",
      "tasa",
      "emitido",
      "cobrado",
      "financiero",
    ],
    legacyAliases: ["admin_collections_summary_month"],
  },
  {
    code: "GET_UNIT_DEBT",
    examples: [
      "¿Cuánto debe la unidad 123?",
      "La unidad 456 cuánto debe",
      "Deuda de la unidad 789",
      "¿Qué debe la unidad 101?",
      "Saldo de la unidad 202",
      "La unidad 303 tiene deuda?",
      "¿Cuánto se debe en la unidad 404?",
      "Deuda pendiente de la unidad 505",
      "Cuánto debe el departamento 606",
      "El departamento 707 cuánto debe",
    ],
    rolesAllowed: ADMIN_ONLY_ROLES,
    resolverKey: "unitDebtResolver",
    responseType: "exact",
    answerSource: "live_data",
    classifierHints: [
      "unidad",
      "departamento",
      "debe",
      "deuda",
      "cuánto",
      "saldo",
      "pendiente",
      "moroso",
    ],
    legacyAliases: ["admin_unit_debt"],
  },
  {
    code: "GET_UNIT_PRIMARY_RESIDENT",
    examples: [
      "Como se llama el residente de la unidad 101",
      "Quién vive en la unidad 202",
      "Necesito el ocupante principal del apartamento 303",
      "Nombre del residente de la unidad 404",
      "Quién es el residente de la torre A unidad 12-8",
      "Decime el residente de la unidad 505",
      "Ocupante principal de la unidad 606",
      "Residente actual de la unidad 707",
      "Nombre del ocupante en unidad 808",
      "Quien vive en el depto 909",
    ],
    rolesAllowed: ADMIN_ONLY_ROLES,
    resolverKey: "unitPrimaryResidentResolver",
    responseType: "exact",
    answerSource: "live_data",
    classifierHints: [
      "residente",
      "ocupante",
      "quien vive",
      "quién vive",
      "nombre",
      "unidad",
      "departamento",
      "torre",
    ],
    legacyAliases: ["admin_unit_primary_resident"],
  },
] as const;

const intentByCode = new Map(
  BUILDINGOS_INTENT_REGISTRY.map((definition) => [definition.code, definition])
);

const aliasToCanonical = new Map<BuildingOSLegacyIntentAlias, BuildingOSCanonicalIntentCode>(
  BUILDINGOS_INTENT_REGISTRY.flatMap((definition) =>
    definition.legacyAliases.map((alias) => [alias, definition.code] as const)
  )
);

export function getBuildingOSIntentDefinition(
  code: BuildingOSCanonicalIntentCode
): BuildingOSIntentDefinition {
  return intentByCode.get(code)!;
}

export function getBuildingOSIntentDefinitions(): readonly BuildingOSIntentDefinition[] {
  return BUILDINGOS_INTENT_REGISTRY;
}

export function resolveCanonicalIntentCode(
  rawIntentCode?: string | null,
  rawLegacyIntent?: string | null
): BuildingOSCanonicalIntentCode | null {
  const candidateCode = normalizeIntentCode(rawIntentCode);
  if (candidateCode && intentByCode.has(candidateCode as BuildingOSCanonicalIntentCode)) {
    return candidateCode as BuildingOSCanonicalIntentCode;
  }

  const candidateAlias = normalizeLegacyIntent(rawLegacyIntent);
  if (!candidateAlias) {
    return null;
  }

  return aliasToCanonical.get(candidateAlias as BuildingOSLegacyIntentAlias) ?? null;
}

function normalizeIntentCode(value?: string | null): string | null {
  if (!value || typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLegacyIntent(value?: string | null): string | null {
  if (!value || typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}
