"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildingOSP2Router = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
function resolveManifestPath(filename) {
    const candidates = [
        (0, node_path_1.join)(process.cwd(), 'packages/ai-adapters/src/buildingos/contracts/manifests', filename),
        (0, node_path_1.join)(__dirname, 'contracts/manifests', filename),
        (0, node_path_1.join)(process.cwd(), filename),
    ];
    for (const candidate of candidates) {
        if ((0, node_fs_1.existsSync)(candidate))
            return candidate;
    }
    throw new Error(`Manifest not found: ${filename}`);
}
const PROJECT_ROOT_FIXED = resolveManifestPath('buildingos.p2.json');
const FALLBACK_MANIFEST = {
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
class BuildingOSP2Router {
    manifest;
    constructor() {
        this.manifest = this.loadManifest();
    }
    getDefaults() {
        return this.manifest.defaults;
    }
    getManifestVersion() {
        return this.manifest.contractVersion;
    }
    route(question, options) {
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
        console.log("[ROUTER-P2] Top scores:", ranked.slice(0, 3).map((r) => ({
            intent: r.route.intentCode,
            score: r.score,
        })));
        const best = ranked[0];
        if (!best || best.score <= 0) {
            return null;
        }
        const requiresBuilding = this.manifest.defaults.requireBuildingWhenMultiBuilding &&
            (options?.buildingCount ?? 0) > 1 &&
            best.route.toolName !== "get_collections_trend";
        if (requiresBuilding && !options?.buildingId) {
            return this.buildBuildingClarification(best.route.toolName);
        }
        const finalToolInput = this.mergeToolInput(best.route.toolInput ?? {}, toolInput);
        return {
            intentCode: best.route.intentCode,
            toolName: best.route.toolName,
            toolInput: finalToolInput,
            score: Number(best.score.toFixed(2)),
        };
    }
    extractTrendParams(normalized) {
        let months = this.manifest.defaults.months;
        let metric = this.manifest.defaults.metric;
        const monthMatch = normalized.match(/(\d+)\s*(mes|meses|meses?)/i);
        if (monthMatch && monthMatch[1]) {
            months = Math.min(this.manifest.defaults.maxMonths, parseInt(monthMatch[1], 10));
        }
        else if (normalized.includes("último año") ||
            normalized.includes("ultimo año") ||
            normalized.includes("12 meses")) {
            months = 12;
        }
        else if (normalized.includes("últimos 6 meses") || normalized.includes("6 meses")) {
            months = 6;
        }
        if (normalized.includes("vencida") ||
            normalized.includes("mora") ||
            normalized.includes("vencido")) {
            metric = "overdue";
        }
        else if (normalized.includes("cobrado") || normalized.includes("pagos")) {
            metric = "collected";
        }
        else if (normalized.includes("cargo") || normalized.includes("generado")) {
            metric = "charged";
        }
        else if (normalized.includes("cobranza") ||
            normalized.includes("porcentaje") ||
            normalized.includes("tasa") ||
            normalized.includes("effectividad")) {
            metric = "collection_rate";
        }
        return { months: Math.max(1, months), metric };
    }
    buildClarification(question) {
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
            answer: "Para tendencias necesito más contexto. Elegí una opción:\n" +
                candidates.map((option) => `${option.index}) ${option.label}`).join("\n"),
            options: candidates,
        };
    }
    buildBuildingClarification(toolName) {
        return {
            answer: "Tenés más de un edificio. Por favor indicá cuál:",
            options: [{ index: 1, label: "Indicar edificio" }],
        };
    }
    mergeToolInput(routeInput, extracted) {
        return {
            ...routeInput,
            months: extracted.months,
            metric: extracted.metric,
        };
    }
    scoreRoute(route, normalizedQuestion) {
        let score = 0;
        for (const keyword of route.keywords) {
            const normalizedKeyword = normalize(keyword);
            if (normalizedKeyword.length === 0)
                continue;
            if (normalizedQuestion.includes(normalizedKeyword)) {
                score += 2;
            }
        }
        return score;
    }
    labelForIntent(intentCode) {
        const labels = {
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
    loadManifest() {
        try {
            const manifestPath = (0, node_path_1.join)((0, node_path_1.dirname)(PROJECT_ROOT_FIXED), "buildingos.p2.json");
            const raw = (0, node_fs_1.readFileSync)(manifestPath, "utf8");
            const parsed = JSON.parse(raw);
            if (!parsed.routes || !Array.isArray(parsed.routes) || parsed.routes.length === 0) {
                return FALLBACK_MANIFEST;
            }
            return parsed;
        }
        catch {
            return FALLBACK_MANIFEST;
        }
    }
}
exports.BuildingOSP2Router = BuildingOSP2Router;
function normalize(value) {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}
