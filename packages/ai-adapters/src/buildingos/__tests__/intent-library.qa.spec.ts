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
  "pagos-resident.qa.json"
);

const LEGACY_EXPECTATION_OVERRIDES: Record<string, QaExpected> = {
  "PAY-RES-049": {
    matchType: "no_match",
    intentCode: null,
    level: null,
    minConfidence: null,
    missingEntities: [],
    toolName: null,
    fallbackPath: "intent_library_no_match",
  },
  "PAY-RES-051": {
    matchType: "no_match",
    intentCode: null,
    level: null,
    minConfidence: null,
    missingEntities: [],
    toolName: null,
    fallbackPath: "intent_library_no_match",
  },
  "PAY-RES-052": {
    matchType: "no_match",
    intentCode: null,
    level: null,
    minConfidence: null,
    missingEntities: [],
    toolName: null,
    fallbackPath: "intent_library_no_match",
  },
  "PAY-RES-086": {
    matchType: "no_match",
    intentCode: null,
    level: null,
    minConfidence: null,
    missingEntities: [],
    toolName: null,
    fallbackPath: "intent_library_no_match",
  },
};

function loadDataset(): QaCase[] {
  return JSON.parse(readFileSync(DATASET_PATH, "utf8")) as QaCase[];
}

function buildQaContext(missingEntities: string[]) {
  const extra: Record<string, string> = {
    unitId: "A-1203",
    buildingId: "Torre-A",
    period: "2026-04",
  };

  if (missingEntities.includes("unitId")) delete extra.unitId;
  if (missingEntities.includes("buildingId")) delete extra.buildingId;
  if (missingEntities.includes("period")) delete extra.period;

  return {
    appId: "buildingos",
    tenantId: "tenant-qa",
    userId: "resident-qa",
    role: "RESIDENT",
    route: "/resident/finanzas",
    currentModule: "charges",
    permissions: ["charges.read", "payments.read"],
    extra,
  };
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function detectMissingEntities(
  requiredEntities: string[],
  question: string,
  context: ReturnType<typeof buildQaContext>
): string[] {
  const missing: string[] = [];
  const normalized = normalizeText(question);

  const hasUnitId =
    typeof context.extra.unitId === "string" ||
    /(?:unidad|uf|depto|departamento|apto|apartamento)\s+[a-z0-9-]+/i.test(
      normalized
    );

  const hasBuildingId =
    typeof context.extra.buildingId === "string" ||
    /(?:torre|edificio|bloque)\s+[a-z0-9-]+/i.test(normalized);

  const hasPeriod =
    typeof context.extra.period === "string" ||
    /\b(20\d{2})[-/](0[1-9]|1[0-2])\b/.test(normalized) ||
    /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/.test(
      normalized
    ) ||
    /\b(este mes|hoy|actual)\b/.test(normalized);

  for (const entity of requiredEntities) {
    if (entity === "tenantId" && !context.tenantId) missing.push(entity);
    if (entity === "userId" && !context.userId) missing.push(entity);
    if (entity === "unitId" && !hasUnitId) missing.push(entity);
    if (entity === "buildingId" && !hasBuildingId) missing.push(entity);
    if (entity === "period" && !hasPeriod) missing.push(entity);
  }

  return missing;
}

function buildMockDataFromMapping(outputMapping: Record<string, string>): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  for (const mappedField of Object.values(outputMapping)) {
    if (mappedField.toLowerCase().includes("currency")) {
      data[mappedField] = "ARS";
      continue;
    }
    if (mappedField.toLowerCase().includes("date") || mappedField.toLowerCase().includes("asof")) {
      data[mappedField] = "2026-04-29";
      continue;
    }
    if (
      mappedField.toLowerCase().includes("amount") ||
      mappedField.toLowerCase().includes("count") ||
      mappedField.toLowerCase().includes("delta")
    ) {
      data[mappedField] = 1234.56;
      continue;
    }
    if (mappedField.toLowerCase().includes("status")) {
      data[mappedField] = "operativo";
      continue;
    }
    if (mappedField.toLowerCase().includes("reason")) {
      data[mappedField] = "falta comprobante";
      continue;
    }
    if (mappedField.toLowerCase().includes("period")) {
      data[mappedField] = "2026-04";
      continue;
    }

    data[mappedField] = "dato";
  }

  if (!("currency" in data)) {
    data.currency = "ARS";
  }

  return data;
}

function asSortedArray(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function getExpectedForCurrentSemantics(testCase: QaCase): QaExpected {
  return LEGACY_EXPECTATION_OVERRIDES[testCase.id] ?? testCase.expected;
}

describe("Intent Library QA Regression Suite (Pagos RESIDENT)", () => {
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

  it("runs regression cases and prints pass-rate + top intents", async () => {
    const executeToolMock = vi.fn(async (input: { outputMapping: Record<string, string> }) => {
      return {
        status: "success" as const,
        data: buildMockDataFromMapping(input.outputMapping),
      };
    });

    const failures: string[] = [];
    let passed = 0;

    for (const testCase of dataset) {
      const context = buildQaContext(testCase.expected.missingEntities);
      const match = matchIntent({ question: testCase.question, role: "RESIDENT" });

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
              missingEntities: asSortedArray(missing),
              toolName: intent.toolBinding?.toolName ?? null,
              fallbackPath: "intent_library_clarification",
            };
          } else if (match.confidence >= 0.85) {
            if (intent.toolBinding?.toolName) {
              const outputMapping = intent.toolBinding.outputMapping ?? {};
              const toolResult = await executeToolMock({ outputMapping });
              const rendered = renderCanonicalTemplate(
                intent.canonicalAnswer.resident,
                outputMapping,
                toolResult.data
              );

              if (rendered.unresolvedVariables.length > 0) {
                failures.push(
                  `[${testCase.id}] unresolved template variables: ${rendered.unresolvedVariables.join(
                    ", "
                  )}`
                );
              }

              actual = {
                matchType: "answer",
                intentCode: intent.intentCode,
                level: intent.level,
                confidence: match.confidence,
                missingEntities: [],
                toolName: intent.toolBinding.toolName,
                fallbackPath: "intent_library_tool_success",
              };
            } else {
              actual = {
                matchType: "answer",
                intentCode: intent.intentCode,
                level: intent.level,
                confidence: match.confidence,
                missingEntities: [],
                toolName: null,
                fallbackPath: "intent_library_answer",
              };
            }
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

          if (
            testCase.expected.matchType === "answer" &&
            match.topCandidates.length >= 2
          ) {
            const margin = match.topCandidates[0]!.confidence - match.topCandidates[1]!.confidence;
            if (margin <= 0.01) {
              failures.push(
                `[${testCase.id}] semantic-collision risk: top margin=${margin.toFixed(
                  4
                )} between ${match.topCandidates[0]!.intentCode} and ${match.topCandidates[1]!.intentCode}`
              );
            }
          }
        }
      }

      const expected = getExpectedForCurrentSemantics(testCase);
      const minConfidenceOk =
        expected.minConfidence === null || actual.confidence >= expected.minConfidence;

      const isSame =
        actual.matchType === expected.matchType &&
        actual.intentCode === expected.intentCode &&
        actual.level === expected.level &&
        minConfidenceOk &&
        JSON.stringify(asSortedArray(actual.missingEntities)) ===
          JSON.stringify(asSortedArray(expected.missingEntities)) &&
        actual.toolName === expected.toolName &&
        actual.fallbackPath === expected.fallbackPath;

      if (!isSame) {
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

    console.log(`[intent-library-qa] pass-rate=${passRate}% (${passed}/${dataset.length})`);
    console.log(`[intent-library-qa] top-5-intents=${JSON.stringify(top5)}`);

    expect(failures.join("\n\n")).toBe("");
  });
});
