import { existsSync } from "node:fs";
import { join } from "node:path";

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const PROJECT_ROOT_FIXED = resolveManifestPath('buildingos.p3.json');

export type BuildingOSP3IntentCode =
  | "EXECUTIVE_DASHBOARD"
  | "PENDING_ACTIONS"
  | "UNIT_DEBT_OCCUPANCY"
  | "DEBT_AGING_BY_BUILDING"
  | "COLLECTION_EFFICIENCY"
  | "UNIT_DEBT_TREND"
  | "GET_BUILDING_DEBT_TREND"
  | "GET_COLLECTIONS_TREND";

export type BuildingOSP3Route = {
  intentCode: BuildingOSP3IntentCode;
  toolName: "cross_query" | "get_unit_debt_trend" | "get_building_debt_trend" | "get_collections_trend";
  toolInput: Record<string, unknown>;
  score: number;
};

export type BuildingOSP3Clarification = {
  answer: string;
  options: Array<{ index: number; label: string }>;
};

type ManifestRoute = {
  intentCode: BuildingOSP3IntentCode;
  toolName: string;
  keywords: string[];
  toolInput?: Record<string, unknown>;
};

type ManifestFile = {
  contractVersion: string;
  defaults: {
    limit: number;
    maxLimit: number;
    topN: number;
    maxTopN: number;
    monthsBack: number;
    maxMonthsBack: number;
    requireBuildingWhenMultiBuilding: boolean;
    maxClarifications: number;
    ranking: number;
  };
  routes: ManifestRoute[];
};

const FALLBACK_MANIFEST: ManifestFile = {
  contractVersion: "2026-05-buildingos-p3-manifest-v1",
  defaults: {
    limit: 20,
    maxLimit: 50,
    topN: 5,
    maxTopN: 50,
    monthsBack: 6,
    maxMonthsBack: 24,
    requireBuildingWhenMultiBuilding: true,
    maxClarifications: 2,
    ranking: 5,
  },
  routes: [
    {
      intentCode: "EXECUTIVE_DASHBOARD",
      toolName: "cross_query",
      keywords: ["dashboard", "resumen", "panel", "overview"],
      toolInput: { templateId: "TPL-10", params: {} },
    },
    {
      intentCode: "PENDING_ACTIONS",
      toolName: "cross_query",
      keywords: ["pendientes", "cola", "workqueue", "acciones"],
      toolInput: { templateId: "TPL-05", params: {} },
    },
    {
      intentCode: "UNIT_DEBT_OCCUPANCY",
      toolName: "cross_query",
      keywords: ["deuda", "ocupacion", "unidad"],
      toolInput: { templateId: "TPL-01", params: {} },
    },
  ],
};

export class BuildingOSP3Router {
  private readonly manifest: ManifestFile;

  constructor() {
    this.manifest = this.loadManifest();
  }

  private loadManifest(): ManifestFile {
    try {
      const filePath = resolveManifestPath('buildingos.p3.json');
      const content = require(filePath);
      return content as ManifestFile;
    } catch {
      console.warn("[ROUTER-P3] Using fallback manifest");
      return FALLBACK_MANIFEST;
    }
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
  ): BuildingOSP3Route | BuildingOSP3Clarification | null {
    const normalized = normalize(question);
    if (!normalized) {
      return null;
    }

    console.log("[ROUTER-P3] Question:", question);
    console.log("[ROUTER-P3] Normalized:", normalized);

    const params = this.extractParams(normalized);

    const ranked = this.manifest.routes
      .map((route) => ({
        route,
        score: this.scoreRoute(route, normalized),
      }))
      .sort((a, b) => b.score - a.score);

    console.log(
      "[ROUTER-P3] Top scores:",
      ranked.slice(0, 3).map((r) => ({
        intent: r.route.intentCode,
        score: r.score,
      }))
    );

    const best = ranked[0];
    if (!best || best.score <= 0) {
      return null;
    }

    const toolInput = this.buildToolInput(best.route.toolName, best.route.toolInput ?? {}, params);

    const requiresBuilding =
      this.manifest.defaults.requireBuildingWhenMultiBuilding &&
      (options?.buildingCount ?? 0) > 1 &&
      best.route.toolName === "cross_query";

    if (requiresBuilding && !options?.buildingId) {
      return this.buildBuildingClarification(best.route.toolName);
    }

    return {
      intentCode: best.route.intentCode,
      toolName: best.route.toolName as BuildingOSP3Route["toolName"],
      toolInput,
      score: Number(best.score.toFixed(2)),
    };
  }

  extractParams(normalized: string): {
    limit?: number;
    topN?: number;
    monthsBack?: number;
    period?: string;
    cursor?: string;
  } {
    const params: Record<string, unknown> = {};
    const defaults = this.manifest.defaults;

    const monthsMatch = normalized.match(/(\d+)\s*(mes|meses|meses?)/i);
    if (monthsMatch && monthsMatch[1]) {
      params.monthsBack = clamp(parseInt(monthsMatch[1], 10), 1, defaults.maxMonthsBack);
    } else if (
      normalized.includes("último año") ||
      normalized.includes("ultimo año") ||
      normalized.includes("12 meses")
    ) {
      params.monthsBack = 12;
    } else if (
      normalized.includes("últimos") ||
      normalized.includes("ultimos")
    ) {
      params.monthsBack = defaults.monthsBack;
    }

    const limitMatch = normalized.match(/(\d+)\s*(items|registros|resultados|filas)/i);
    if (limitMatch && limitMatch[1]) {
      params.limit = clamp(parseInt(limitMatch[1], 10), 1, defaults.maxLimit);
    } else {
      params.limit = defaults.limit;
    }

    const topNMatch = normalized.match(/top\s*(\d+)|primeros\s*(\d+)/i);
    if (topNMatch && (topNMatch[1] || topNMatch[2])) {
      params.topN = clamp(parseInt(topNMatch[1] || topNMatch[2], 10), 1, defaults.maxTopN);
    } else {
      params.topN = defaults.topN;
    }

    if (normalized.includes("dame mas") || normalized.includes("dame más") || normalized.includes("siguiente") || normalized.includes("mas resultados")) {
      params.cursor = "next";
    }

    return params as { limit?: number; topN?: number; monthsBack?: number; period?: string; cursor?: string };
  }

  buildToolInput(
    toolName: string,
    routeDefaults: Record<string, unknown>,
    extracted: { limit?: number; topN?: number; monthsBack?: number; period?: string; cursor?: string }
  ): Record<string, unknown> {
    if (toolName === "cross_query") {
      const base = (routeDefaults.params as Record<string, unknown>) ?? {};
      return {
        templateId: routeDefaults.templateId,
        params: {
          ...base,
          limit: extracted.limit ?? 20,
          topN: extracted.topN ?? 5,
          monthsBack: extracted.monthsBack ?? 6,
          ...(extracted.period ? { period: extracted.period } : {}),
          ...(extracted.cursor ? { cursor: extracted.cursor } : {}),
        },
      };
    }
    return {
      ...routeDefaults,
      ...extracted,
    };
  }

  scoreRoute(route: ManifestRoute, normalized: string): number {
    const keywords = route.keywords;
    let score = 0;

    for (const keyword of keywords) {
      const kwNormalized = normalize(keyword);
      if (normalized.includes(kwNormalized)) {
        score += kwNormalized.length;
      }
    }

    return score;
  }

  buildBuildingClarification(toolName: string): BuildingOSP3Clarification {
    return {
      answer: "Necesito saber el edificio. ¿Podrías indicármelo? (Torre A, Torre B, etc.)",
      options: [
        { index: 1, label: "Torre A" },
        { index: 2, label: "Torre B" },
      ],
    };
  }

  private labelForIntent(intentCode: string): string {
    const labels: Record<string, string> = {
      EXECUTIVE_DASHBOARD: "Dashboard Ejecutivo",
      PENDING_ACTIONS: "Pendientes / Workqueue",
      UNIT_DEBT_OCCUPANCY: "Deuda por Unidad y Ocupación",
      DEBT_AGING_BY_BUILDING: "Antigüedad de Deuda por Edificio",
      COLLECTION_EFFICIENCY: "Eficiencia de Cobranza",
      UNIT_DEBT_TREND: "Tendencia Deuda Unitaria",
      GET_BUILDING_DEBT_TREND: "Tendencia Deuda por Edificio",
      GET_COLLECTIONS_TREND: "Tendencia de Cobros",
    };
    return labels[intentCode] ?? intentCode;
  }
}