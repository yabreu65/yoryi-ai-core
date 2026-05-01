import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { matchIntent } from "../intent-matcher";

type FamilyQaCase = {
  id: string;
  question: string;
  role: string;
  expectedFamily: string;
  expectedIntent?: string;
};

function loadCases(fileName: string): FamilyQaCase[] {
  return JSON.parse(readFileSync(join(__dirname, fileName), "utf8")) as FamilyQaCase[];
}

const cases = [
  ...loadCases("families-admin.qa.json"),
  ...loadCases("families-resident.qa.json"),
  ...loadCases("families-robustness.qa.json"),
];

describe("family confusion matrix", () => {
  it("matches deterministic expected families and hard-fails TOP_N to BREAKDOWN", () => {
    const matrix = new Map<string, number>();
    const failures: Array<{ id: string; expected: string; actual: string; intent?: string }> = [];

    for (const testCase of cases) {
      const result = matchIntent({ question: testCase.question, role: testCase.role });
      const actualFamily = result?.familyChosen ?? "NO_MATCH";
      const key = `${testCase.expectedFamily}->${actualFamily}`;
      matrix.set(key, (matrix.get(key) ?? 0) + 1);

      if (testCase.expectedFamily === "TOP_N") {
        expect(actualFamily, `[${testCase.id}] TOP_N must never fall into BREAKDOWN`).not.toBe("BREAKDOWN");
      }

      if (actualFamily !== testCase.expectedFamily || (testCase.expectedIntent && result?.intentCode !== testCase.expectedIntent)) {
        failures.push({
          id: testCase.id,
          expected: testCase.expectedFamily,
          actual: actualFamily,
          intent: result?.intentCode,
        });
      }
    }

    console.log("[family-confusion-matrix]", Object.fromEntries(matrix));
    expect(failures).toEqual([]);
  });
});
