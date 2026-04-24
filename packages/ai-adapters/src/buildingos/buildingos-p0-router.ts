import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BuildingOSCanonicalIntentCode } from "./buildingos-intent-registry";

export type BuildingOSP0Route = {
  intentCode: BuildingOSCanonicalIntentCode;
  toolName: string;
  toolInput: Record<string, unknown>;
  score: number;
};

export type BuildingOSP0Clarification = {
  answer: string;
  options: Array<{ index: number; label: string }>;
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

const FALLBACK_MANIFEST: ManifestFile = {
  contractVersion: "2026-04-buildingos-p0-manifest-v1",
  defaults: {
    debtStatus: "OVERDUE",
    ranking: 5,
    requireBuildingWhenMultiBuilding: true,
    maxClarifications: 2,
  },
  routes: [
    {
      intentCode: "GET_OVERDUE_UNITS",
      toolName: "search_payments",
      keywords: ["moroso", "morosos", "mora", "deuda", "vencida", "expensas"],
      toolInput: { mode: "overdue_units", status: "OVERDUE" },
    },
    {
      intentCode: "GET_PENDING_PAYMENTS",
      toolName: "search_payments",
      keywords: ["pagos pendientes", "por aprobar", "submitted", "sin revisar"],
      toolInput: { mode: "pending_approvals", status: "SUBMITTED" },
    },
    {
      intentCode: "GET_OPEN_TICKETS",
      toolName: "search_tickets",
      keywords: ["tickets", "reclamos", "incidencias", "abiertos", "en progreso"],
      toolInput: { status: ["OPEN", "IN_PROGRESS"] },
    },
    {
      intentCode: "GET_UNIT_DEBT",
      toolName: "get_unit_balance",
      keywords: ["cuanto debe", "cuánto debe", "deuda de la unidad", "saldo de la unidad"],
      toolInput: { debtStatus: "OVERDUE" },
    },
    {
      intentCode: "GET_UNIT_PRIMARY_RESIDENT",
      toolName: "get_unit_profile",
      keywords: ["residente", "quien vive", "quién vive", "nombre del residente", "ocupante"],
      toolInput: {
        fields: ["occupants", "primaryResident", "building", "unit"],
      },
    },
  ],
};

export class BuildingOSP0Router {
  private readonly manifest: ManifestFile;

  constructor() {
    this.manifest = this.loadManifest();
  }

  getDefaults(): ManifestFile["defaults"] {
    return this.manifest.defaults;
  }

  route(question: string): BuildingOSP0Route | null {
    const normalized = normalize(question);
    if (!normalized) {
      return null;
    }

    if (this.isUnitDebtWithoutReference(normalized)) {
      return {
        intentCode: "GET_OVERDUE_UNITS",
        toolName: "search_payments",
        toolInput: {
          mode: "overdue_units",
          status: this.manifest.defaults.debtStatus,
          ranking: this.manifest.defaults.ranking,
        },
        score: 0.9,
      };
    }

    const ranked = this.manifest.routes
      .map((route) => ({
        route,
        score: this.scoreRoute(route, normalized),
      }))
      .sort((a, b) => b.score - a.score);

    const best = ranked[0];
    if (!best || best.score <= 0) {
      return null;
    }

    return {
      intentCode: best.route.intentCode,
      toolName: best.route.toolName,
      toolInput: {
        ...(best.route.toolInput ?? {}),
        ranking: this.manifest.defaults.ranking,
      },
      score: Number(best.score.toFixed(2)),
    };
  }

  buildClarification(question: string): BuildingOSP0Clarification {
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

  private scoreRoute(route: ManifestRoute, normalizedQuestion: string): number {
    let score = 0;
    for (const keyword of route.keywords) {
      const normalizedKeyword = normalize(keyword);
      if (normalizedKeyword.length === 0) {
        continue;
      }
      if (normalizedQuestion.includes(normalizedKeyword)) {
        score += 1;
      }
    }

    return score;
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

  private labelForIntent(intentCode: BuildingOSCanonicalIntentCode): string {
    switch (intentCode) {
      case "GET_OVERDUE_UNITS":
        return "Ver unidades con deuda vencida";
      case "GET_PENDING_PAYMENTS":
        return "Ver pagos pendientes de aprobacion";
      case "GET_OPEN_TICKETS":
        return "Ver tickets abiertos o en progreso";
      case "GET_UNIT_DEBT":
        return "Consultar saldo de una unidad especifica";
      case "GET_UNIT_PRIMARY_RESIDENT":
        return "Consultar ocupante principal de una unidad";
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
      const manifestPath = join(
        __dirname,
        "contracts",
        "manifests",
        "buildingos.p0.json"
      );
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
