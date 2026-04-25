import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
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

const PROJECT_ROOT_FIXED = resolveManifestPath('buildingos.p2.json');

export type BuildingOSP2IntentCode =
  | "GET_UNIT_DEBT_TREND"
  | "GET_BUILDING_DEBT_TREND"
  | "GET_COLLECTIONS_TREND"
  | "GET_UNIT_OVERDUE_TREND"
  | "GET_UNIT_CHARGED_TREND"
  | "GET_UNIT_COLLECTED_TREND"
  | "GET_BUILDING_OVERDUE_TREND"
  | "GET_COLLECTION_RATE_TREND"
  | "GET_12MONTH_TREND"
  | "GET_BUILDING_TREND_LAST_YEAR";

export type BuildingOSP2Route = {
  intentCode: BuildingOSP2IntentCode;
  toolName: "get_unit_debt_trend" | "get_building_debt_trend" | "get_collections_trend";
  toolInput: Record<string, unknown>;
  score: number;
};

export type BuildingOSP2Clarification = {
  answer: string;
  options: Array<{ index: number; label: string }>;
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

const FALLBACK_MANIFEST: ManifestFile = {
  contractVersion: "2026-05-buildingos-p2-manifest-v1",
  defaults: {
    months: 6,
    maxMonths: 24,
    requireBuildingWhenMultiBuilding: true,
    maxClarifications: 2,
    metric: "outstanding",
    metrics: ["outstanding", "overdue", "charged", "collected", "collection_rate"],
    ranking: 5,
  },
  routes: [
    {
      intentCode: "GET_UNIT_DEBT_TREND",
      toolName: "get_unit_debt_trend",
      keywords: ["tendencia", "deuda", "historial", "evolución"],
      toolInput: { months: 6, metric: "outstanding" },
    },
    {
      intentCode: "GET_BUILDING_DEBT_TREND",
      toolName: "get_building_debt_trend",
      keywords: ["torre", "edificio", "deuda"],
      toolInput: { months: 6, metric: "outstanding" },
    },
    {
      intentCode: "GET_COLLECTIONS_TREND",
      toolName: "get_collections_trend",
      keywords: ["cobros", "recaudación", "cobranza"],
      toolInput: { months: 6 },
    },
  ],
};

export class BuildingOSP2Router {
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
  ): BuildingOSP2Route | BuildingOSP2Clarification | null {
    const normalized = normalize(question);
    if (!normalized) {
      return null;
    }

    console.log("[ROUTER-P2] Question:", question);
    console.log("[ROUTER-P2] Normalized:", normalized);

    const { months, metric } = this.extractTrendParams(normalized);
    const toolInput = { months, metric };

    const ranked = this.manifest.routes
      .map((route) => ({
        route,
        score: this.scoreRoute(route, normalized),
      }))
      .sort((a, b) => b.score - a.score);

    console.log(
      "[ROUTER-P2] Top scores:",
      ranked.slice(0, 3).map((r) => ({
        intent: r.route.intentCode,
        score: r.score,
      }))
    );

    const best = ranked[0];
    if (!best || best.score <= 0) {
      return null;
    }

    const requiresBuilding =
      this.manifest.defaults.requireBuildingWhenMultiBuilding &&
      (options?.buildingCount ?? 0) > 1 &&
      best.route.toolName !== "get_collections_trend";

    if (requiresBuilding && !options?.buildingId) {
      return this.buildBuildingClarification(best.route.toolName);
    }

    const finalToolInput = this.mergeToolInput(
      best.route.toolInput ?? {},
      toolInput
    );

    return {
      intentCode: best.route.intentCode,
      toolName: best.route.toolName,
      toolInput: finalToolInput,
      score: Number(best.score.toFixed(2)),
    };
  }

  extractTrendParams(normalized: string): {
    months: number;
    metric: string;
  } {
    let months = this.manifest.defaults.months;
    let metric = this.manifest.defaults.metric;

    const monthMatch = normalized.match(/(\d+)\s*(mes|meses|meses?)/i);
    if (monthMatch && monthMatch[1]) {
      months = Math.min(this.manifest.defaults.maxMonths, parseInt(monthMatch[1], 10));
    } else if (
      normalized.includes("último año") ||
      normalized.includes("ultimo año") ||
      normalized.includes("12 meses")
    ) {
      months = 12;
    } else if (normalized.includes("últimos 6 meses") || normalized.includes("6 meses")) {
      months = 6;
    }

    if (
      normalized.includes("vencida") ||
      normalized.includes("mora") ||
      normalized.includes("vencido")
    ) {
      metric = "overdue";
    } else if (normalized.includes("cobrado") || normalized.includes("pagos")) {
      metric = "collected";
    } else if (normalized.includes("cargo") || normalized.includes("generado")) {
      metric = "charged";
    } else if (
      normalized.includes("cobranza") ||
      normalized.includes("porcentaje") ||
      normalized.includes("tasa") ||
      normalized.includes("effectividad")
    ) {
      metric = "collection_rate";
    }

    return { months: Math.max(1, months), metric };
  }

  buildClarification(question: string): BuildingOSP2Clarification {
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
        "Para tendencias necesito más contexto. Elegí una opción:\n" +
        candidates.map((option) => `${option.index}) ${option.label}`).join("\n"),
      options: candidates,
    };
  }

  private buildBuildingClarification(
    toolName: string
  ): BuildingOSP2Clarification {
    return {
      answer:
        "Tenés más de un edificio. Por favor indicá cuál:",
      options: [{ index: 1, label: "Indicar edificio" }],
    };
  }

  private mergeToolInput(
    routeInput: Record<string, unknown>,
    extracted: { months: number; metric: string }
  ): Record<string, unknown> {
    return {
      ...routeInput,
      months: extracted.months,
      metric: extracted.metric,
    };
  }

  private scoreRoute(route: ManifestRoute, normalizedQuestion: string): number {
    let score = 0;
    for (const keyword of route.keywords) {
      const normalizedKeyword = normalize(keyword);
      if (normalizedKeyword.length === 0) continue;
      if (normalizedQuestion.includes(normalizedKeyword)) {
        score += 2;
      }
    }
    return score;
  }

  private labelForIntent(intentCode: BuildingOSP2IntentCode): string {
    const labels: Record<BuildingOSP2IntentCode, string> = {
      GET_UNIT_DEBT_TREND: "Tendencia de deuda por unidad",
      GET_BUILDING_DEBT_TREND: "Tendencia de deuda por edificio",
      GET_COLLECTIONS_TREND: "Tendencia de cobros/recaudación",
      GET_UNIT_OVERDUE_TREND: "Tendencia de deuda vencida (unidad)",
      GET_UNIT_CHARGED_TREND: "Tendencia de cargos (unidad)",
      GET_UNIT_COLLECTED_TREND: "Tendencia de cobros (unidad)",
      GET_BUILDING_OVERDUE_TREND: "Tendencia de deuda vencida (edificio)",
      GET_COLLECTION_RATE_TREND: "Tendencia de porcentaje de cobranza",
      GET_12MONTH_TREND: "Tendencia anual de deuda (unidad)",
      GET_BUILDING_TREND_LAST_YEAR: "Tendencia anual de deuda (edificio)",
    };
    return labels[intentCode] ?? "Consulta de tendencias";
  }

  private loadManifest(): ManifestFile {
    try {
      const manifestPath = join(dirname(PROJECT_ROOT_FIXED), "buildingos.p2.json");
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