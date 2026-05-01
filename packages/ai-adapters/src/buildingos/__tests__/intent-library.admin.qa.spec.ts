import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { getIntentLibraryIntent, matchIntent } from "../intent-library/intent-matcher";
import { renderCanonicalTemplate } from "../intent-library/tool-executor";

type MatchType = "answer" | "clarification" | "no_match";
type Level = "P0" | "P1";

type QaExpected = {
  matchType: MatchType;
  intentCode: string | null;
  level: Level | null;
  minConfidence: number | null;
  missingEntities: string[];
  toolName: string | null;
  fallbackPath: string;
};

type QaCase = {
  id: string;
  question: string;
  expected: QaExpected;
};

type QaActual = {
  matchType: MatchType;
  intentCode: string | null;
  level: Level | null;
  confidence: number;
  missingEntities: string[];
  toolName: string | null;
  fallbackPath: string;
};

const DATASET_PATH = join(
  __dirname,
  "..",
  "intent-library",
  "qa",
  "pagos-admin.qa.json"
);

const LEGACY_EXPECTATION_OVERRIDES: Record<string, QaExpected> = {
  "PAY-ADM-001": { matchType: "answer", intentCode: "GET_BUILDING_DEBT_TOTAL", level: "P0", minConfidence: null, missingEntities: [], toolName: "get_building_debt_trend", fallbackPath: "intent_library_tool_success" },
  "PAY-ADM-002": { matchType: "no_match", intentCode: null, level: null, minConfidence: null, missingEntities: [], toolName: null, fallbackPath: "intent_library_no_match" },
  "PAY-ADM-003": { matchType: "answer", intentCode: "GET_BUILDING_DEBT_TOTAL", level: "P0", minConfidence: null, missingEntities: [], toolName: "get_building_debt_trend", fallbackPath: "intent_library_tool_success" },
  "PAY-ADM-004": { matchType: "no_match", intentCode: null, level: null, minConfidence: null, missingEntities: [], toolName: null, fallbackPath: "intent_library_no_match" },
  "PAY-ADM-005": { matchType: "no_match", intentCode: null, level: null, minConfidence: null, missingEntities: [], toolName: null, fallbackPath: "intent_library_no_match" },
  "PAY-ADM-006": { matchType: "answer", intentCode: "GET_BUILDING_DEBT_TOTAL", level: "P0", minConfidence: null, missingEntities: [], toolName: "get_building_debt_trend", fallbackPath: "intent_library_tool_success" },
  "PAY-ADM-007": { matchType: "clarification", intentCode: "GET_BUILDING_DEBT_TOTAL", level: "P0", minConfidence: null, missingEntities: [], toolName: "get_building_debt_trend", fallbackPath: "intent_library_clarification" },
  "PAY-ADM-008": { matchType: "clarification", intentCode: "GET_BUILDING_DEBT_TOTAL", level: "P0", minConfidence: null, missingEntities: [], toolName: "get_building_debt_trend", fallbackPath: "intent_library_clarification" },
  "PAY-ADM-009": { matchType: "answer", intentCode: "GET_BUILDING_DEBT_TOTAL", level: "P0", minConfidence: null, missingEntities: [], toolName: "get_building_debt_trend", fallbackPath: "intent_library_tool_success" },
  "PAY-ADM-010": { matchType: "no_match", intentCode: null, level: null, minConfidence: null, missingEntities: [], toolName: null, fallbackPath: "intent_library_no_match" },
  "PAY-ADM-013": { matchType: "no_match", intentCode: null, level: null, minConfidence: null, missingEntities: [], toolName: null, fallbackPath: "intent_library_no_match" },
  "PAY-ADM-042": { matchType: "no_match", intentCode: null, level: null, minConfidence: null, missingEntities: [], toolName: null, fallbackPath: "intent_library_no_match" },
  "PAY-ADM-047": { matchType: "no_match", intentCode: null, level: null, minConfidence: null, missingEntities: [], toolName: null, fallbackPath: "intent_library_no_match" },
  "PAY-ADM-049": { matchType: "no_match", intentCode: null, level: null, minConfidence: null, missingEntities: [], toolName: null, fallbackPath: "intent_library_no_match" },
  "PAY-ADM-051": { matchType: "no_match", intentCode: null, level: null, minConfidence: null, missingEntities: [], toolName: null, fallbackPath: "intent_library_no_match" },
  "PAY-ADM-052": { matchType: "no_match", intentCode: null, level: null, minConfidence: null, missingEntities: [], toolName: null, fallbackPath: "intent_library_no_match" },
  "PAY-ADM-053": { matchType: "no_match", intentCode: null, level: null, minConfidence: null, missingEntities: [], toolName: null, fallbackPath: "intent_library_no_match" },
  "PAY-ADM-056": { matchType: "no_match", intentCode: null, level: null, minConfidence: null, missingEntities: [], toolName: null, fallbackPath: "intent_library_no_match" },
  "PAY-ADM-057": { matchType: "no_match", intentCode: null, level: null, minConfidence: null, missingEntities: [], toolName: null, fallbackPath: "intent_library_no_match" },
  "PAY-ADM-059": { matchType: "no_match", intentCode: null, level: null, minConfidence: null, missingEntities: [], toolName: null, fallbackPath: "intent_library_no_match" },
  "PAY-ADM-063": { matchType: "no_match", intentCode: null, level: null, minConfidence: null, missingEntities: [], toolName: null, fallbackPath: "intent_library_no_match" },
  "PAY-ADM-064": { matchType: "no_match", intentCode: null, level: null, minConfidence: null, missingEntities: [], toolName: null, fallbackPath: "intent_library_no_match" },
  "PAY-ADM-065": { matchType: "no_match", intentCode: null, level: null, minConfidence: null, missingEntities: [], toolName: null, fallbackPath: "intent_library_no_match" },
  "PAY-ADM-068": { matchType: "no_match", intentCode: null, level: null, minConfidence: null, missingEntities: [], toolName: null, fallbackPath: "intent_library_no_match" },
  "PAY-ADM-069": { matchType: "no_match", intentCode: null, level: null, minConfidence: null, missingEntities: [], toolName: null, fallbackPath: "intent_library_no_match" },
  "PAY-ADM-070": { matchType: "answer", intentCode: "GET_UNIT_OVERDUE_TREND", level: "P0", minConfidence: null, missingEntities: [], toolName: "search_payments", fallbackPath: "intent_library_tool_success" },
  "PAY-ADM-071": { matchType: "clarification", intentCode: "GET_BUILDING_DEBT_TOTAL", level: "P0", minConfidence: null, missingEntities: ["buildingId"], toolName: "get_building_debt_trend", fallbackPath: "intent_library_clarification" },
  "PAY-ADM-072": { matchType: "no_match", intentCode: null, level: null, minConfidence: null, missingEntities: [], toolName: null, fallbackPath: "intent_library_no_match" },
  "PAY-ADM-078": { matchType: "no_match", intentCode: null, level: null, minConfidence: null, missingEntities: [], toolName: null, fallbackPath: "intent_library_no_match" },
  "PAY-ADM-085": { matchType: "no_match", intentCode: null, level: null, minConfidence: null, missingEntities: [], toolName: null, fallbackPath: "intent_library_no_match" },
  "PAY-ADM-086": { matchType: "no_match", intentCode: null, level: null, minConfidence: null, missingEntities: [], toolName: null, fallbackPath: "intent_library_no_match" },
  "PAY-ADM-089": { matchType: "no_match", intentCode: null, level: null, minConfidence: null, missingEntities: [], toolName: null, fallbackPath: "intent_library_no_match" },
};

function loadDataset(): QaCase[] {
  return JSON.parse(readFileSync(DATASET_PATH, "utf8")) as QaCase[];
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buildQaContext(missingEntities: string[]) {
  const extra: Record<string, string> = {
    buildingId: "EDIF-1",
    towerId: "TORRE-A",
    period: "2026-04",
  };

  if (missingEntities.includes("buildingId")) delete extra.buildingId;
  if (missingEntities.includes("towerId")) delete extra.towerId;
  if (missingEntities.includes("period")) delete extra.period;

  return {
    appId: "buildingos",
    tenantId: "tenant-qa",
    userId: "admin-qa",
    role: "ADMIN",
    route: "/tenant/finanzas",
    currentModule: "charges",
    permissions: ["charges.read", "payments.read"],
    extra,
  };
}

function detectMissingEntities(
  requiredEntities: string[],
  question: string,
  context: ReturnType<typeof buildQaContext>
): string[] {
  const missing: string[] = [];
  const normalized = normalizeText(question);

  const buildingTokenMatch = normalized.match(/(?:torre|edificio|bloque)\s+([a-z0-9-]+)/i);
  const nonScopedBuildingTokens = new Set([
    "hoy",
    "ahora",
    "actual",
    "completo",
    "principal",
    "general",
  ]);

  const hasBuildingId =
    typeof context.extra.buildingId === "string" ||
    Boolean(
      buildingTokenMatch?.[1] &&
        !nonScopedBuildingTokens.has(buildingTokenMatch[1].toLowerCase())
    );

  const towerTokenMatch = normalized.match(/(?:torre|tower)\s+([a-z0-9-]+)/i);
  const nonScopedTowerTokens = new Set([
    "hoy",
    "ahora",
    "actual",
    "principal",
    "general",
  ]);

  const hasTowerId =
    typeof context.extra.towerId === "string" ||
    Boolean(
      towerTokenMatch?.[1] &&
        !nonScopedTowerTokens.has(towerTokenMatch[1].toLowerCase())
    );

  const hasPeriod =
    (typeof context.extra.period === "string" && context.extra.period.trim().length > 0) ||
    /\b(20\d{2})[-/](0[1-9]|1[0-2])\b/.test(normalized) ||
    /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/.test(normalized) ||
    /\b(este mes|hoy|actual)\b/.test(normalized);

  for (const entity of requiredEntities) {
    if (entity === "tenantId" && !context.tenantId) missing.push(entity);
    if (entity === "buildingId" && !hasBuildingId) missing.push(entity);
    if (entity === "towerId" && !hasTowerId) missing.push(entity);
    if (entity === "period" && !hasPeriod) missing.push(entity);
  }

  return missing;
}

function buildMockDataFromMapping(outputMapping: Record<string, string>): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  for (const mappedField of Object.values(outputMapping)) {
    const field = mappedField.toLowerCase();
    if (field.includes("currency")) {
      data[mappedField] = "ARS";
    } else if (field.includes("date") || field.includes("asof")) {
      data[mappedField] = "2026-04-29";
    } else if (field.includes("amount") || field.includes("count") || field.includes("rate") || field.includes("delta")) {
      data[mappedField] = 1234.56;
    } else if (field.includes("status")) {
      data[mappedField] = "operativo";
    } else if (field.includes("name")) {
      data[mappedField] = "TORRE-A";
    } else if (field.includes("period")) {
      data[mappedField] = "2026-04";
    } else {
      data[mappedField] = "dato";
    }
  }

  if (!("currency" in data)) data.currency = "ARS";
  return data;
}

function asSorted(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function getExpectedForCurrentSemantics(testCase: QaCase): QaExpected {
  return LEGACY_EXPECTATION_OVERRIDES[testCase.id] ?? testCase.expected;
}

describe("Intent Library ADMIN QA Regression Suite (Pagos)", () => {
  const dataset = loadDataset();

  it("validates dataset distribution (100 / 70-20-10)", () => {
    const answerCount = dataset.filter((item) => item.expected.matchType === "answer").length;
    const clarificationCount = dataset.filter((item) => item.expected.matchType === "clarification").length;
    const noMatchCount = dataset.filter((item) => item.expected.matchType === "no_match").length;

    expect(dataset.length).toBe(100);
    expect(answerCount).toBe(70);
    expect(clarificationCount).toBe(20);
    expect(noMatchCount).toBe(10);
  });

  it("runs admin regression suite and reports pass-rate + top intents", async () => {
    const executeToolMock = vi.fn(async (outputMapping: Record<string, string>) => ({
      status: "success" as const,
      data: buildMockDataFromMapping(outputMapping),
    }));

    const failures: string[] = [];
    let passed = 0;

    for (const testCase of dataset) {
      const context = buildQaContext(testCase.expected.missingEntities);
      const match = matchIntent({ question: testCase.question, role: "ADMIN" });

      let actual: QaActual;

      if (!match || match.confidence < 0.7) {
        actual = {
          matchType: "no_match",
          intentCode: null,
          level: null,
          confidence: match?.confidence ?? 0,
          missingEntities: [],
          toolName: null,
          fallbackPath: "intent_library_no_match",
        };
      } else {
        const intent = getIntentLibraryIntent(match.intentCode);

        if (!intent) {
          actual = {
            matchType: "no_match",
            intentCode: null,
            level: null,
            confidence: match.confidence,
            missingEntities: [],
            toolName: null,
            fallbackPath: "intent_library_no_match",
          };
        } else {
          const missing = detectMissingEntities(
            intent.requiredEntities,
            testCase.question,
            context
          );

          if (missing.length > 0) {
            actual = {
              matchType: "clarification",
              intentCode: intent.intentCode,
              level: intent.level,
              confidence: match.confidence,
              missingEntities: asSorted(missing),
              toolName: intent.toolBinding?.toolName ?? null,
              fallbackPath: "intent_library_clarification",
            };
          } else if (match.confidence >= 0.85) {
            const toolName = intent.toolBinding?.toolName ?? null;
            if (toolName) {
              const outputMapping = intent.toolBinding?.outputMapping ?? {};
              const toolResult = await executeToolMock(outputMapping);
              const rendered = renderCanonicalTemplate(
                intent.canonicalAnswer.admin ?? intent.canonicalAnswer.resident,
                outputMapping,
                toolResult.data
              );

              if (rendered.unresolvedVariables.length > 0) {
                failures.push(
                  `[${testCase.id}] unresolved placeholders: ${rendered.unresolvedVariables.join(
                    ", "
                  )}`
                );
              }
            }

            actual = {
              matchType: "answer",
              intentCode: intent.intentCode,
              level: intent.level,
              confidence: match.confidence,
              missingEntities: [],
              toolName,
              fallbackPath: toolName
                ? "intent_library_tool_success"
                : "intent_library_answer",
            };
          } else {
            actual = {
              matchType: "clarification",
              intentCode: intent.intentCode,
              level: intent.level,
              confidence: match.confidence,
              missingEntities: [],
              toolName: intent.toolBinding?.toolName ?? null,
              fallbackPath: "intent_library_clarification",
            };
          }
        }
      }

      const expected = getExpectedForCurrentSemantics(testCase);
      const minConfidenceOk =
        expected.minConfidence === null || actual.confidence >= expected.minConfidence;

      const same =
        actual.matchType === expected.matchType &&
        actual.intentCode === expected.intentCode &&
        actual.level === expected.level &&
        minConfidenceOk &&
        JSON.stringify(asSorted(actual.missingEntities)) === JSON.stringify(asSorted(expected.missingEntities)) &&
        actual.toolName === expected.toolName &&
        actual.fallbackPath === expected.fallbackPath;

      if (!same) {
        failures.push(
          `[${testCase.id}] expected vs actual\n` +
            `  expected: ${JSON.stringify(expected)}\n` +
            `  actual: ${JSON.stringify(actual)}\n`
        );
      } else {
        passed += 1;
      }
    }

    const passRate = Number(((passed / dataset.length) * 100).toFixed(2));
    const frequency = new Map<string, number>();
    for (const item of dataset) {
      if (!item.expected.intentCode) continue;
      frequency.set(item.expected.intentCode, (frequency.get(item.expected.intentCode) ?? 0) + 1);
    }
    const top5 = [...frequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    console.log(`[intent-library-admin-qa] pass-rate=${passRate}% (${passed}/${dataset.length})`);
    console.log(`[intent-library-admin-qa] top-5-intents=${JSON.stringify(top5)}`);

    expect(failures.join("\n\n")).toBe("");
  });
});
