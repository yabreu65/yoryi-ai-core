import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import type { BuildingOSCanonicalIntentCode } from "./buildingos-intent-registry";
import type { BuildingOSReadOnlyQueryInput } from "./buildingos-readonly-query.gateway";

function resolveManifestPath(filename: string): string {
  const candidates = [
    join(process.cwd(), 'packages/ai-adapters/src/buildingos/contracts/manifests', filename),
    join(__dirname, 'contracts/manifests', filename),
    join(process.cwd(), filename),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`Manifest not found: ${filename}`);
}

const PROJECT_ROOT_FIXED = resolveManifestPath('buildingos.p1.json');

type BuildingOSP1IntentCode =
  | BuildingOSCanonicalIntentCode
  | "GET_REJECTED_TODAY"
  | "GET_PAYMENTS_WITHOUT_PROOF"
  | "GET_LAST_PAYMENT"
  | "GET_DEBT_AGING"
  | "GET_DEBT_BY_TOWER"
  | "GET_UNIT_BALANCE_BY_PERIOD"
  | "GET_URGENT_UNASSIGNED_TICKETS";

export type BuildingOSP1Route = {
  intentCode: BuildingOSP1IntentCode;
  toolName: NonNullable<BuildingOSReadOnlyQueryInput["toolName"]>;
  toolInput: Record<string, unknown>;
  score: number;
};

export type BuildingOSP1Clarification = {
  answer: string;
  options: Array<{ index: number; label: string }>;
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

const FALLBACK_MANIFEST: ManifestFile = {
  contractVersion: "2026-04-buildingos-p1-manifest-v1",
  defaults: {
    debtStatus: "OVERDUE",
    ranking: 5,
    requireBuildingWhenMultiBuilding: true,
    maxClarifications: 2,
    periodsBack: 3,
    maxPeriodsBack: 12,
    includeCurrent: false,
    debtBuckets: ["current", "1_30", "31_60", "61_90", "90_plus"],
  },
  routes: [
    {
      intentCode: "GET_OVERDUE_UNITS",
      toolName: "search_payments",
      keywords: ["moroso", "morosos", "mora", "deuda", "vencida", "expensas"],
      toolInput: { status: ["OVERDUE"] },
    },
    {
      intentCode: "GET_PENDING_PAYMENTS",
      toolName: "search_payments",
      keywords: ["pagos pendientes", "por aprobar", "submitted", "sin revisar"],
      toolInput: { status: ["SUBMITTED"] },
    },
    {
      intentCode: "GET_DEBT_AGING",
      toolName: "analytics_debt_aging",
      keywords: ["antigüedad", "aging", "mora", "días de mora"],
      toolInput: { asOf: "{today}" },
    },
    {
      intentCode: "GET_DEBT_BY_TOWER",
      toolName: "analytics_debt_by_tower",
      keywords: ["deuda por torre", "deuda por edificio", "cobranza por edificio", "ranking de deuda por torre", "ranking por torre", "top torres", "top edificios"],
      toolInput: { asOf: "{today}" },
    },
    {
      intentCode: "GET_UNIT_DEBT",
      toolName: "get_unit_balance",
      keywords: ["cuanto debe", "cuánto debe", "deuda de la unidad"],
      toolInput: { debtStatus: "OVERDUE" },
    },
    {
      intentCode: "GET_UNIT_BALANCE_BY_PERIOD",
      toolName: "get_unit_balance_by_period",
      keywords: ["historial", "evolución", "serie histórica", "deuda por período", "saldo por período", "saldo por periodo", "balance por período"],
      toolInput: { periodsBack: 3, includeCurrent: false },
    },
    {
      intentCode: "GET_UNIT_PRIMARY_RESIDENT",
      toolName: "get_unit_profile",
      keywords: ["residente", "quien vive", "quién vive", "nombre del residente"],
      toolInput: { fields: ["occupants", "primaryResident", "building", "unit"] },
    },
    {
      intentCode: "GET_OPEN_TICKETS",
      toolName: "search_tickets",
      keywords: ["tickets", "reclamos", "incidencias", "abiertos", "en progreso"],
      toolInput: { status: ["OPEN", "IN_PROGRESS"] },
    },
    {
      intentCode: "GET_URGENT_UNASSIGNED_TICKETS",
      toolName: "search_tickets",
      keywords: ["urgente sin asignar", "urgentes pendientes", "alta prioridad sin asignar"],
      toolInput: { priority: ["HIGH"], assigned: false, status: ["OPEN"] },
    },
  ],
};

export class BuildingOSP1Router {
  private readonly manifest: ManifestFile;

  constructor() {
    this.manifest = this.loadManifest();
  }

  getDefaults(): ManifestFile["defaults"] {
    return this.manifest.defaults;
  }

  getManifestVersion(): string {
    return this.manifest.contractVersion;
  }

  route(question: string): BuildingOSP1Route | null {
    const normalized = normalize(question);
    if (!normalized) {
      return null;
    }

    const hasUnitAndBuilding = this.hasUnitAndBuildingTokens(normalized);
    if (hasUnitAndBuilding && this.isUnitDebtQuery(normalized)) {
      const unitDebtRoute = this.findRouteByIntent("GET_UNIT_DEBT");
      if (unitDebtRoute) {
        const baseInput = { ...(unitDebtRoute.toolInput ?? {}) };
        if (baseInput.ranking === undefined) {
          baseInput.ranking = this.manifest.defaults.ranking;
        }
        return {
          intentCode: unitDebtRoute.intentCode,
          toolName: unitDebtRoute.toolName,
          toolInput: baseInput,
          score: 1,
        };
      }
    }

    if (!hasUnitAndBuilding && this.isAggregateDebtQuery(normalized)) {
      const aggregateIntent = this.resolveAggregateIntent(normalized);
      const aggregateRoute = aggregateIntent
        ? this.findRouteByIntent(aggregateIntent)
        : null;
      if (aggregateRoute) {
        const baseInput = { ...(aggregateRoute.toolInput ?? {}) };
        if (baseInput.ranking === undefined) {
          baseInput.ranking = this.manifest.defaults.ranking;
        }
        return {
          intentCode: aggregateRoute.intentCode,
          toolName: aggregateRoute.toolName,
          toolInput: baseInput,
          score: 1,
        };
      }
    }

    console.log('[ROUTER-P1] Question:', question);
    console.log('[ROUTER-P1] Normalized:', normalized);
    console.log('[ROUTER-P1] Manifest version:', this.manifest.contractVersion);
    console.log('[ROUTER-P1] Routes count:', this.manifest.routes.length);

    const ranked = this.manifest.routes
      .map((route) => ({
        route,
        score: this.scoreRoute(route, normalized),
      }))
      .sort((a, b) => b.score - a.score);

    console.log('[ROUTER-P1] Top 3 scores:', ranked.slice(0, 3).map(r => ({ intent: r.route.intentCode, score: r.score })));

    const best = ranked[0];
    if (!best || best.score <= 0) {
      if (this.isUnitDebtWithoutReference(normalized)) {
        return {
          intentCode: "GET_OVERDUE_UNITS",
          toolName: "search_payments",
          toolInput: {
            status: [this.manifest.defaults.debtStatus],
            ranking: this.manifest.defaults.ranking,
          },
          score: 0.9,
        };
      }
      return null;
    }

    const tied = ranked.filter((r) => r.score === best.score);
    if (tied.length > 1) {
      const disambiguated = this.disambiguate(tied.map((t) => t.route), normalized);
      if (disambiguated) {
        const baseInput = { ...(disambiguated.toolInput ?? {}) };
        if (baseInput.ranking === undefined) {
          baseInput.ranking = this.manifest.defaults.ranking;
        }
        return {
          intentCode: disambiguated.intentCode,
          toolName: disambiguated.toolName,
          toolInput: baseInput,
          score: best.score,
        };
      }
    }

    const baseInput = { ...(best.route.toolInput ?? {}) };
    if (baseInput.ranking === undefined) {
      baseInput.ranking = this.manifest.defaults.ranking;
    }

    return {
      intentCode: best.route.intentCode,
      toolName: best.route.toolName,
      toolInput: baseInput,
      score: Number(best.score.toFixed(2)),
    };
  }

  private disambiguate(
    routes: ManifestRoute[],
    normalized: string
  ): ManifestRoute | null {
    const agingScore =
      normalized.includes("antiguedad") ||
      normalized.includes("aging") ||
      normalized.includes("dias");
    const byTowerScore =
      normalized.includes("torre") ||
      normalized.includes("edificio") ||
      normalized.includes("ranking");
    const urgentScore =
      normalized.includes("urgente") ||
      normalized.includes("sin asignar") ||
      normalized.includes("alta prioridad");
    const balancePeriodScore =
      (normalized.includes("saldo") || normalized.includes("balance")) &&
      (normalized.includes("periodo") || normalized.includes("historial"));

    for (const route of routes) {
      if (route.intentCode === "GET_DEBT_AGING" && agingScore) return route;
      if (route.intentCode === "GET_DEBT_BY_TOWER" && byTowerScore) return route;
      if (route.intentCode === "GET_URGENT_UNASSIGNED_TICKETS" && urgentScore) return route;
      if (route.intentCode === "GET_UNIT_BALANCE_BY_PERIOD" && balancePeriodScore) return route;
    }

    return null;
  }

  buildClarification(question: string): BuildingOSP1Clarification {
    const normalized = normalize(question);
    const candidates = this.manifest.routes
      .map((route) => ({
        label: this.labelForIntent(route.intentCode),
        score: this.scoreRoute(route, normalized),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, this.manifest.defaults.maxClarifications)
      .map((item, index) => ({
        index: index + 1,
        label: item.label,
      }));

    return {
      answer:
        "Necesito una aclaracion para responder en modo operativo. Elegi una opcion:\n" +
        candidates.map((option) => `${option.index}) ${option.label}`).join("\n"),
      options: candidates,
    };
  }

  buildClarificationWithOptions(question: string): BuildingOSP1Clarification & {
    fullOptions: Array<{
      index: number;
      label: string;
      intentCode: string;
      toolName: string;
      toolInput: Record<string, unknown>;
    }>;
  } {
    const normalized = normalize(question);
    const ranked = this.manifest.routes
      .map((route) => ({
        route,
        score: this.scoreRoute(route, normalized),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, this.manifest.defaults.maxClarifications);

    const defaultToolInput = { ranking: this.manifest.defaults.ranking };

    const fullOptions = ranked.map((item, index) => ({
      index: index + 1,
      label: this.labelForIntent(item.route.intentCode),
      intentCode: item.route.intentCode,
      toolName: item.route.toolName,
      toolInput: { ...defaultToolInput, ...item.route.toolInput },
    }));

    const answer =
      "Necesito una aclaracion para responder en modo operativo. Elegi una opcion:\n" +
      fullOptions.map((opt) => `${opt.index}) ${opt.label}`).join("\n");

    return {
      answer,
      options: fullOptions.map((opt) => ({ index: opt.index, label: opt.label })),
      fullOptions,
    };
  }

  private scoreRoute(route: ManifestRoute, normalizedQuestion: string): number {
    let score = 0;
    for (const keyword of route.keywords) {
      const normalizedKeyword = normalize(keyword);
      if (normalizedKeyword.length === 0) {
        continue;
      }
      if (normalizedQuestion.includes(normalizedKeyword)) {
        score += 2;
      }
    }

    return score;
  }

  private findRouteByIntent(intentCode: BuildingOSP1IntentCode): ManifestRoute | null {
    return this.manifest.routes.find((route) => route.intentCode === intentCode) ?? null;
  }

  private hasUnitAndBuildingTokens(normalizedQuestion: string): boolean {
    const hasUnit = /(?:unidad|apartamento|depto|departamento|apto|uf)\s+[a-z0-9-]+/.test(
      normalizedQuestion
    );
    const hasBuilding = /(?:torre|edificio|bloque)\s+[a-z0-9]+/.test(
      normalizedQuestion
    );
    return hasUnit && hasBuilding;
  }

  private isUnitDebtQuery(normalizedQuestion: string): boolean {
    const isHistoricalBalanceQuery =
      normalizedQuestion.includes("periodo") ||
      normalizedQuestion.includes("período") ||
      normalizedQuestion.includes("historial") ||
      normalizedQuestion.includes("evolucion") ||
      normalizedQuestion.includes("evolución");
    if (isHistoricalBalanceQuery) {
      return false;
    }

    return (
      normalizedQuestion.includes("deuda") ||
      normalizedQuestion.includes("debe") ||
      normalizedQuestion.includes("saldo") ||
      normalizedQuestion.includes("adeuda") ||
      normalizedQuestion.includes("expensa") ||
      normalizedQuestion.includes("al dia")
    );
  }

  private isAggregateDebtQuery(normalizedQuestion: string): boolean {
    return (
      normalizedQuestion.includes("top") ||
      normalizedQuestion.includes("ranking") ||
      normalizedQuestion.includes("moroso") ||
      normalizedQuestion.includes("morosidad") ||
      normalizedQuestion.includes("aging") ||
      normalizedQuestion.includes("antiguedad") ||
      normalizedQuestion.includes("resumen") ||
      normalizedQuestion.includes("que torres") ||
      normalizedQuestion.includes("deuda por torre") ||
      normalizedQuestion.includes("deuda por edificio") ||
      normalizedQuestion.includes("unidades con deuda") ||
      normalizedQuestion.includes("listame unidades con deuda") ||
      normalizedQuestion.includes("cargos pendientes")
    );
  }

  private resolveAggregateIntent(
    normalizedQuestion: string
  ): BuildingOSP1IntentCode | null {
    if (
      normalizedQuestion.includes("aging") ||
      normalizedQuestion.includes("antiguedad")
    ) {
      return "GET_DEBT_AGING";
    }

    if (
      normalizedQuestion.includes("cargos pendientes") ||
      normalizedQuestion.includes("pagos pendientes")
    ) {
      return "GET_PENDING_PAYMENTS";
    }

    if (
      normalizedQuestion.includes("unidades con deuda") ||
      normalizedQuestion.includes("listame unidades con deuda")
    ) {
      return "GET_OVERDUE_UNITS";
    }

    if (
      normalizedQuestion.includes("top") ||
      normalizedQuestion.includes("ranking") ||
      normalizedQuestion.includes("que torres") ||
      normalizedQuestion.includes("torres deben") ||
      normalizedQuestion.includes("deuda por torre") ||
      normalizedQuestion.includes("deuda por edificio") ||
      normalizedQuestion.includes("resumen de deuda")
    ) {
      return "GET_DEBT_BY_TOWER";
    }

    return null;
  }

  private isUnitDebtWithoutReference(normalizedQuestion: string): boolean {
    const mentionsDebt =
      normalizedQuestion.includes("deuda") ||
      normalizedQuestion.includes("cuanto debe") ||
      normalizedQuestion.includes("cuánto debe") ||
      normalizedQuestion.includes("saldo");
    const mentionsUnit =
      normalizedQuestion.includes("unidad") ||
      normalizedQuestion.includes("departamento") ||
      normalizedQuestion.includes("apto");

    return mentionsDebt && !mentionsUnit;
  }

  private labelForIntent(intentCode: BuildingOSP1IntentCode): string {
    switch (intentCode) {
      case "GET_OVERDUE_UNITS":
        return "Ver unidades con deuda vencida";
      case "GET_REJECTED_TODAY":
        return "Ver pagos rechazados hoy";
      case "GET_PAYMENTS_WITHOUT_PROOF":
        return "Ver pagos sin comprobante";
      case "GET_LAST_PAYMENT":
        return "Ver ultimo pago de unidad";
      case "GET_PENDING_PAYMENTS":
        return "Ver pagos pendientes de aprobacion";
      case "GET_DEBT_AGING":
        return "Ver antiguedad de la deuda";
      case "GET_DEBT_BY_TOWER":
        return "Ver deuda por edificio/torre";
      case "GET_UNIT_DEBT":
        return "Consultar saldo de una unidad especifica";
      case "GET_UNIT_BALANCE_BY_PERIOD":
        return "Ver evolucion de saldo por periodo";
      case "GET_UNIT_PRIMARY_RESIDENT":
        return "Consultar ocupante principal de una unidad";
      case "GET_OPEN_TICKETS":
        return "Ver tickets abiertos o en progreso";
      case "GET_URGENT_UNASSIGNED_TICKETS":
        return "Ver tickets urgentes sin asignar";
      case "GET_COLLECTIONS_SUMMARY":
        return "Ver resumen general de cobranzas";
      case "GET_VACANT_UNITS":
        return "Ver unidades vacantes";
      default:
        return "Consulta operativa";
    }
  }

  private loadManifest(): ManifestFile {
    try {
      const manifestPath = join(dirname(PROJECT_ROOT_FIXED), 'buildingos.p1.json');
      const raw = readFileSync(manifestPath, "utf8");
      const parsed = JSON.parse(raw) as ManifestFile;
      if (!parsed.routes || !Array.isArray(parsed.routes) || parsed.routes.length === 0) {
        return FALLBACK_MANIFEST;
      }
      return parsed;
    } catch {
      return FALLBACK_MANIFEST;
    }
  }

  isRankingQuery(normalized: string): boolean {
    return (
      normalized.includes("ranking") ||
      normalized.includes("torre") ||
      normalized.includes("edificio") ||
      normalized.includes("deuda por")
    );
  }

  routeForMultiBuilding(
    question: string,
    buildingId?: string
  ): BuildingOSP1Route | BuildingOSP1Clarification | null {
    const normalized = normalize(question);
    if (!normalized) {
      return null;
    }

    const isRanking = this.isRankingQuery(normalized);
    const requiresBuilding = this.manifest.defaults.requireBuildingWhenMultiBuilding;

    if (isRanking && requiresBuilding && !buildingId) {
      const clarification = this.buildClarification(question);
      return {
        ...clarification,
        answer:
          "Para mostrar el ranking necesito saber el edificio. Indicá el nombre o número de torre/edificio:",
      };
    }

    return this.route(question);
  }
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return value.split(" ").filter(Boolean);
}

function stemEsToken(token: string): string {
  let out = token;
  if (out.endsWith("es") && out.length > 4) out = out.slice(0, -2);
  else if (out.endsWith("s") && out.length > 3) out = out.slice(0, -1);
  if (out.endsWith("a") && out.length > 4) out = `${out.slice(0, -1)}o`;
  return out;
}
