import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";

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

const PROJECT_ROOT_FIXED = resolveManifestPath('buildingos.p2b.json');

export type BuildingOSP2BIntentCode =
  | "SEARCH_PROCESSES"
  | "GET_PROCESS_SUMMARY"
  | "SEARCH_CLAIMS"
  | "SEARCH_LIQUIDATIONS"
  | "SEARCH_EXPENSE_VALIDATIONS"
  | "GET_PENDING_PROCESSES"
  | "GET_APPROVED_PROCESSES"
  | "GET_REJECTED_PROCESSES"
  | "GET_OVERDUE_PROCESSES"
  | "GET_UNASSIGNED_PROCESSES"
  | "GET_HIGH_PRIORITY_PROCESSES"
  | "GET_PROCESSES_BY_PERIOD";

export type BuildingOSP2BRoute = {
  intentCode: BuildingOSP2BIntentCode;
  toolName: "search_processes" | "get_process_summary" | "search_claims";
  toolInput: Record<string, unknown>;
  score: number;
};

export type BuildingOSP2BClarification = {
  answer: string;
  options: Array<{ index: number; label: string }>;
};

type ManifestRoute = {
  intentCode: BuildingOSP2BIntentCode;
  toolName: "search_processes" | "get_process_summary" | "search_claims";
  keywords: string[];
  toolInput?: Record<string, unknown>;
};

type ManifestFile = {
  contractVersion: string;
  defaults: {
    limit: number;
    maxLimit: number;
    maxClarifications: number;
    requireBuildingWhenMultiBuilding: boolean;
    statuses: string[];
    processTypes: string[];
    sortBy: string;
    sortDir: string;
  };
  routes: ManifestRoute[];
};

const FALLBACK_MANIFEST: ManifestFile = {
  contractVersion: "2026-05-buildingos-p2b-manifest-v1",
  defaults: {
    limit: 20,
    maxLimit: 50,
    maxClarifications: 2,
    requireBuildingWhenMultiBuilding: true,
    statuses: ["PENDING", "IN_PROGRESS", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"],
    processTypes: ["LIQUIDATION", "EXPENSE_VALIDATION", "CLAIM"],
    sortBy: "createdAt",
    sortDir: "desc",
  },
  routes: [
    {
      intentCode: "SEARCH_PROCESSES",
      toolName: "search_processes",
      keywords: ["liquidaciones", "procesos", "expedientes", "aprobaciones"],
      toolInput: {},
    },
    {
      intentCode: "GET_PROCESS_SUMMARY",
      toolName: "get_process_summary",
      keywords: ["resumen", "estadisticas", "dashboard"],
      toolInput: { groupBy: "status" },
    },
    {
      intentCode: "SEARCH_CLAIMS",
      toolName: "search_claims",
      keywords: ["reclamos", "claims", "quejas"],
      toolInput: {},
    },
  ],
};

export class BuildingOSP2BRouter {
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

  route(
    question: string,
    options?: {
      buildingId?: string;
      unitId?: string;
      buildingCount?: number;
    }
  ): BuildingOSP2BRoute | BuildingOSP2BClarification | null {
    const normalized = normalize(question);
    if (!normalized) {
      return null;
    }

    console.log("[ROUTER-P2B] Question:", question);
    console.log("[ROUTER-P2B] Normalized:", normalized);

    const filters = this.extractFilters(normalized);
    console.log("[ROUTER-P2B] Extracted filters:", JSON.stringify(filters));

    const ranked = this.manifest.routes
      .map((route) => ({
        route,
        score: this.scoreRoute(route, normalized),
      }))
      .sort((a, b) => b.score - a.score);

    console.log(
      "[ROUTER-P2B] Top scores:",
      ranked.slice(0, 3).map((r) => ({
        intent: r.route.intentCode,
        score: r.score,
      }))
    );

    const best = ranked[0];
    if (!best || best.score <= 0) {
      return null;
    }

    const toolName = this.resolveToolName(best.route.toolName, (filters.statuses ?? []) as string[]);

    const requiresBuilding =
      this.manifest.defaults.requireBuildingWhenMultiBuilding &&
      (options?.buildingCount ?? 0) > 1 &&
      !options?.buildingId &&
      toolName !== "search_claims";

    if (requiresBuilding) {
      return this.buildBuildingClarification();
    }

    const requiresPeriod = this.requiresPeriod(best.route.intentCode, filters);
    if (requiresPeriod && !filters.period) {
      return this.buildPeriodClarification();
    }

    const finalToolInput = this.mergeToolInput(
      best.route.toolInput ?? {},
      filters
    );

    return {
      intentCode: best.route.intentCode,
      toolName,
      toolInput: finalToolInput,
      score: Number(best.score.toFixed(2)),
    };
  }

  extractFilters(normalized: string): Record<string, unknown> {
    const defaults = this.manifest.defaults;
    const filters: Record<string, unknown> = {
      limit: defaults.limit,
      sortBy: defaults.sortBy,
      sortDir: defaults.sortDir,
    };

    const extractedStatus = this.extractStatus(normalized);
    if (extractedStatus.length > 0) {
      filters.statuses = extractedStatus;
    }

    const extractedType = this.extractProcessType(normalized);
    if (extractedType) {
      filters.processTypes = [extractedType];
    }

    const extractedPeriod = this.extractPeriod(normalized);
    if (extractedPeriod) {
      filters.period = extractedPeriod;
    }

    const createdAfter = this.extractCreatedAfter(normalized);
    if (createdAfter) {
      filters.createdAfter = createdAfter;
    }

    if (normalized.includes("vencido") || normalized.includes("sla") || normalized.includes("overdue") || normalized.includes("fuera de")) {
      filters.overdueSla = true;
    }

    if (normalized.includes("sin asignar") || normalized.includes("unassigned") || normalized.includes("sin responsable")) {
      filters.assigned = false;
    }

    if (normalized.includes("urgente") || normalized.includes("alta prioridad") || normalized.includes("critico") || normalized.includes("importante")) {
      filters.priority = 3;
    }

    if (filters.limit && typeof filters.limit === "number") {
      filters.limit = Math.min(defaults.maxLimit, filters.limit);
    }

    return filters;
  }

  resolveToolName(manifestToolName: string, statuses: string[]): "search_processes" | "get_process_summary" | "search_claims" {
    if (manifestToolName === "get_process_summary") {
      return "get_process_summary";
    }
    if (manifestToolName === "search_claims") {
      return "search_claims";
    }
    if (statuses.length === 1 && statuses[0] === "CLAIM") {
      return "search_claims";
    }
    return "search_processes";
  }

  private requiresPeriod(intentCode: string, filters: Record<string, unknown>): boolean {
    return (
      intentCode === "SEARCH_LIQUIDATIONS" ||
      intentCode === "SEARCH_EXPENSE_VALIDATIONS" ||
      intentCode === "GET_PROCESSES_BY_PERIOD"
    ) && !filters.period;
  }

  private extractStatus(normalized: string): string[] {
    const results: string[] = [];
    const defaults = this.manifest.defaults.statuses;

    if (normalized.includes("pendiente") || normalized.includes("pending") || normalized.includes("sin resolver") || normalized.includes("en espera")) {
      if (!results.includes("PENDING")) results.push("PENDING");
      if (!results.includes("IN_PROGRESS") && !results.includes("PENDING")) results.push("IN_PROGRESS");
    }
    if (normalized.includes("aprobado") || normalized.includes("aceptado") || normalized.includes("approved")) {
      if (!results.includes("APPROVED")) results.push("APPROVED");
    }
    if (normalized.includes("rechazado") || normalized.includes("denegado") || normalized.includes("rechazo") || normalized.includes("rejected")) {
      if (!results.includes("REJECTED")) results.push("REJECTED");
    }
    if (normalized.includes("completado") || normalized.includes("finalizado") || normalized.includes("completed")) {
      if (!results.includes("COMPLETED")) results.push("COMPLETED");
    }
    if (normalized.includes("cancelado") || normalized.includes("cancelado") || normalized.includes("cancelled")) {
      if (!results.includes("CANCELLED")) results.push("CANCELLED");
    }

    return results;
  }

  private extractProcessType(normalized: string): string | null {
    if (normalized.includes("liquidacion") || normalized.includes("liq")) {
      return "LIQUIDATION";
    }
    if (normalized.includes("aprobacion") || normalized.includes("validacion") || normalized.includes("gasto")) {
      return "EXPENSE_VALIDATION";
    }
    if (normalized.includes("reclamo") || normalized.includes("claim") || normalized.includes("queja")) {
      return "CLAIM";
    }
    return null;
  }

  private extractPeriod(normalized: string): string | null {
    const months: Record<string, string> = {
      "enero": "01",
      "febrero": "02",
      "marzo": "03",
      "abril": "04",
      "mayo": "05",
      "junio": "06",
      "julio": "07",
      "agosto": "08",
      "septiembre": "09",
      "octubre": "10",
      "noviembre": "11",
      "diciembre": "12",
    };

    const currentYear = new Date().getFullYear();

    const monthMatch = normalized.match(
      /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i
    );
    if (monthMatch) {
      const month = months[monthMatch[1].toLowerCase()];
      if (month) {
        const yearMatch = normalized.match(/\b(20\d{2})\b/);
        const year = yearMatch ? yearMatch[1] : String(currentYear);
        return `${year}-${month}`;
      }
    }

    const periodMatch = normalized.match(/\b(20\d{2})-(\d{2})\b/);
    if (periodMatch) {
      return periodMatch[0];
    }

    const yearMonthMatch = normalized.match(/\b(202[0-9])[\s-]?(0[1-9]|1[0-2])\b/);
    if (yearMonthMatch) {
      const month = yearMonthMatch[2].padStart(2, "0");
      return `${yearMonthMatch[1]}-${month}`;
    }

    return null;
  }

  private extractCreatedAfter(normalized: string): string | null {
    const daysMatch = normalized.match(/hace\s+(\d+)\s*d[ií]as?/i);
    if (daysMatch && daysMatch[1]) {
      const days = parseInt(daysMatch[1], 10);
      const date = new Date();
      date.setDate(date.getDate() - days);
      return date.toISOString().split("T")[0];
    }

    if (normalized.includes("última semana") || normalized.includes("ultima semana")) {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      return date.toISOString().split("T")[0];
    }

    if (normalized.includes("último mes") || normalized.includes("ultimo mes")) {
      const date = new Date();
      date.setMonth(date.getMonth() - 1);
      return date.toISOString().split("T")[0];
    }

    return null;
  }

  private buildClarification(question: string): BuildingOSP2BClarification {
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
        "Para ayudarte mejor necesito más contexto. Elegí una opción:\n" +
        candidates.map((option) => `${option.index}) ${option.label}`).join("\n"),
      options: candidates,
    };
  }

  private buildBuildingClarification(): BuildingOSP2BClarification {
    return {
      answer:
        "Tenés más de un edificio. Por favor indicá cuál:",
      options: [{ index: 1, label: "Indicar edificio" }],
    };
  }

  private buildPeriodClarification(): BuildingOSP2BClarification {
    return {
      answer:
        "Necesito el período. Por favor indicá en formato YYYY-MM (ej: 2026-03) o mes (ej: marzo 2026):",
      options: [{ index: 1, label: "Indicar período" }],
    };
  }

  private mergeToolInput(
    routeInput: Record<string, unknown>,
    filters: Record<string, unknown>
  ): Record<string, unknown> {
    return {
      ...routeInput,
      ...filters,
    };
  }

  private scoreRoute(route: ManifestRoute, normalizedQuestion: string): number {
    let score = 0;
    const strongKeywords = ["resumen", "estadisticas", "dashboard", "overview", "cantidad", "total"];
    
    for (const keyword of route.keywords) {
      const normalizedKeyword = normalize(keyword);
      if (normalizedKeyword.length === 0) continue;
      if (normalizedQuestion.includes(normalizedKeyword)) {
        const isStrong = strongKeywords.some(s => normalizedKeyword.includes(s));
        score += isStrong ? 5 : 2;
      }
    }
    return score;
  }

  private labelForIntent(intentCode: BuildingOSP2BIntentCode): string {
    const labels: Record<BuildingOSP2BIntentCode, string> = {
      SEARCH_PROCESSES: "Buscar procesos",
      GET_PROCESS_SUMMARY: "Resumen de procesos",
      SEARCH_CLAIMS: "Buscar reclamos",
      SEARCH_LIQUIDATIONS: "Buscar liquidaciones",
      SEARCH_EXPENSE_VALIDATIONS: "Buscar aprobaciones de gasto",
      GET_PENDING_PROCESSES: "Procesos pendientes",
      GET_APPROVED_PROCESSES: "Procesos aprobados",
      GET_REJECTED_PROCESSES: "Procesos rechazados",
      GET_OVERDUE_PROCESSES: "Procesos vencidos",
      GET_UNASSIGNED_PROCESSES: "Procesos sin asignar",
      GET_HIGH_PRIORITY_PROCESSES: "Procesos urgentes",
      GET_PROCESSES_BY_PERIOD: "Procesos por período",
    };
    return labels[intentCode] ?? "Consulta de procesos";
  }

  private loadManifest(): ManifestFile {
    try {
      const manifestPath = join(dirname(PROJECT_ROOT_FIXED), "buildingos.p2b.json");
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