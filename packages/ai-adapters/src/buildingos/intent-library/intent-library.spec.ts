import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type IntentLibraryFile,
  validateIntentLibraryFile,
} from "./schema";

type IntentRegistryFile = {
  intents: Array<{ intentCode: string }>;
};

function readJson<T>(absolutePath: string): T {
  return JSON.parse(readFileSync(absolutePath, "utf8")) as T;
}

function normalizeUtterance(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

const ROOT_DIR = __dirname;
const P0_LIBRARY_PATH = join(ROOT_DIR, "intent-library.p0.json");
const P1_LIBRARY_PATH = join(ROOT_DIR, "intent-library.p1.json");
const INTENT_REGISTRY_PATH = join(
  ROOT_DIR,
  "..",
  "contracts",
  "intent-registry.json"
);

const COLLISION_WHITELIST: Array<{
  utterance: string;
  intents: [string, string];
}> = [];

describe("BuildingOS Intent Library (P0/P1)", () => {
  const p0Library = readJson<IntentLibraryFile>(P0_LIBRARY_PATH);
  const p1Library = readJson<IntentLibraryFile>(P1_LIBRARY_PATH);
  const intentRegistry = readJson<IntentRegistryFile>(INTENT_REGISTRY_PATH);
  const allowedIntentCodes = new Set(
    intentRegistry.intents.map((item) => item.intentCode)
  );
  const libraries = [p0Library, p1Library];
  const allIntents = libraries.flatMap((file) => file.intents);
  const adminIntents = allIntents.filter(
    (intent) => intent.audience === "ADMIN" || intent.audience === "BOTH"
  );

  it("validates schema for both files", () => {
    for (const file of libraries) {
      const validation = validateIntentLibraryFile(file, {
        allowedIntentCodes,
      });
      expect(validation.valid, validation.errors.join(" | ")).toBe(true);
    }
  });

  it("has no duplicate intentCode", () => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const intent of allIntents) {
      if (seen.has(intent.intentCode)) {
        duplicates.add(intent.intentCode);
      }
      seen.add(intent.intentCode);
    }

    expect([...duplicates]).toEqual([]);
  });

  it("ensures canonicalAnswer.resident is non-empty", () => {
    for (const intent of allIntents) {
      expect(intent.canonicalAnswer.resident.trim().length).toBeGreaterThan(0);
    }
  });

  it("enforces minimum utterances (>=10) per intent", () => {
    for (const intent of allIntents) {
      expect(
        intent.utterances.length,
        `${intent.intentCode} has ${intent.utterances.length} utterances`
      ).toBeGreaterThanOrEqual(10);
    }
  });

  it("verifies every intentCode exists in intent-registry.json", () => {
    const missing = allIntents
      .map((intent) => intent.intentCode)
      .filter((intentCode) => !allowedIntentCodes.has(intentCode));

    expect(missing).toEqual([]);
  });

  it("detects utterance collisions across intents (except whitelist)", () => {
    const utteranceIndex = new Map<string, string>();
    const collisions: Array<{ utterance: string; first: string; second: string }> = [];

    const whitelistSet = new Set(
      COLLISION_WHITELIST.map((item) => {
        const [a, b] = item.intents;
        const pair = [a, b].sort().join("::");
        return `${normalizeUtterance(item.utterance)}@@${pair}`;
      })
    );

    for (const intent of allIntents) {
      for (const utterance of intent.utterances) {
        const normalized = normalizeUtterance(utterance);
        const existingIntent = utteranceIndex.get(normalized);
        if (!existingIntent) {
          utteranceIndex.set(normalized, intent.intentCode);
          continue;
        }

        if (existingIntent === intent.intentCode) {
          continue;
        }

        const pair = [existingIntent, intent.intentCode].sort().join("::");
        const key = `${normalized}@@${pair}`;
        if (!whitelistSet.has(key)) {
          collisions.push({
            utterance,
            first: existingIntent,
            second: intent.intentCode,
          });
        }
      }
    }

    expect(collisions).toEqual([]);
  });

  it("enforces minimum utterances (>=10) for ADMIN/BOTH intents", () => {
    for (const intent of adminIntents) {
      expect(
        intent.utterances.length,
        `${intent.intentCode} (ADMIN/BOTH) has ${intent.utterances.length} utterances`
      ).toBeGreaterThanOrEqual(10);
    }
  });

  it("detects utterance collisions between ADMIN/BOTH intents", () => {
    const utteranceIndex = new Map<string, string>();
    const collisions: Array<{ utterance: string; first: string; second: string }> = [];

    for (const intent of adminIntents) {
      for (const utterance of intent.utterances) {
        const normalized = normalizeUtterance(utterance);
        const existingIntent = utteranceIndex.get(normalized);
        if (!existingIntent) {
          utteranceIndex.set(normalized, intent.intentCode);
          continue;
        }
        if (existingIntent === intent.intentCode) {
          continue;
        }
        collisions.push({
          utterance,
          first: existingIntent,
          second: intent.intentCode,
        });
      }
    }

    expect(collisions).toEqual([]);
  });

  it("ensures canonicalAnswer.admin placeholders are covered by outputMapping", () => {
    const placeholderRegex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

    for (const intent of adminIntents) {
      if (!intent.canonicalAnswer.admin) {
        continue;
      }

      const placeholders = new Set<string>();
      let match: RegExpExecArray | null;
      while ((match = placeholderRegex.exec(intent.canonicalAnswer.admin)) !== null) {
        placeholders.add(match[1] ?? "");
      }

      if (placeholders.size === 0) {
        continue;
      }

      const outputMapping = intent.toolBinding?.outputMapping ?? {};
      const missing = [...placeholders].filter((placeholder) => !outputMapping[placeholder]);

      expect(
        missing,
        `${intent.intentCode} has admin placeholders without outputMapping: ${missing.join(", ")}`
      ).toEqual([]);
    }
  });
});
