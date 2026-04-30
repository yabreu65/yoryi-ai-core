import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { IntentAudience, IntentLevel, IntentLibraryFile, IntentLibraryIntent } from "./schema";
import { validateIntentLibraryFile } from "./schema";

type MatcherRole = "RESIDENT" | "ADMIN" | "BOTH" | string;

type MatchCandidate = {
  intentCode: string;
  level: IntentLevel;
  confidence: number;
};

export type IntentMatchResult = {
  intentCode: string;
  level: IntentLevel;
  confidence: number;
  topCandidates: MatchCandidate[];
};

export type MatchIntentInput = {
  question: string;
  role: MatcherRole;
};

type IntentLibraryCache = {
  intents: IntentLibraryIntent[];
  signatures: Map<string, Set<string>>;
};

const LIBRARY_DIR = __dirname;
const P0_LIBRARY_PATH = join(LIBRARY_DIR, "intent-library.p0.json");
const P1_LIBRARY_PATH = join(LIBRARY_DIR, "intent-library.p1.json");

const STOPWORDS = new Set([
  "a",
  "al",
  "algo",
  "con",
  "como",
  "cual",
  "cuanto",
  "de",
  "del",
  "el",
  "en",
  "es",
  "esta",
  "este",
  "hoy",
  "la",
  "las",
  "lo",
  "los",
  "mi",
  "mis",
  "necesito",
  "para",
  "por",
  "que",
  "quiero",
  "se",
  "si",
  "su",
  "sus",
  "tengo",
  "tu",
  "una",
  "uno",
  "un",
  "y",
]);

let cache: IntentLibraryCache | null = null;

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function tokensWithoutStopwords(value: string): string[] {
  return tokenize(value).filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function toTokenSet(value: string): Set<string> {
  return new Set(tokensWithoutStopwords(value));
}

function isAudienceAllowed(intentAudience: IntentAudience, role: MatcherRole): boolean {
  const normalizedRole = String(role || "").toUpperCase();
  if (normalizedRole === "RESIDENT") {
    return intentAudience === "RESIDENT" || intentAudience === "BOTH";
  }

  if (normalizedRole === "ADMIN" || normalizedRole === "TENANT_ADMIN" || normalizedRole === "TENANT_OWNER" || normalizedRole === "SUPER_ADMIN" || normalizedRole === "OPERATOR") {
    return intentAudience === "ADMIN" || intentAudience === "BOTH";
  }

  return true;
}

function roundConfidence(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

function computeUtteranceScore(questionNormalized: string, questionTokens: Set<string>, utterance: string): number {
  const utteranceNormalized = normalizeText(utterance);
  if (!utteranceNormalized) return 0;

  if (questionNormalized === utteranceNormalized) {
    return 1;
  }

  const utteranceTokens = toTokenSet(utteranceNormalized);
  if (questionTokens.size === 0 || utteranceTokens.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of questionTokens) {
    if (utteranceTokens.has(token)) {
      overlap += 1;
    }
  }

  if (overlap === 0) {
    return 0;
  }

  const recall = overlap / questionTokens.size;
  const precision = overlap / utteranceTokens.size;
  const f1 = recall + precision === 0 ? 0 : (2 * recall * precision) / (recall + precision);

  let score = f1 * 0.72 + recall * 0.28;

  if (
    questionNormalized.includes(utteranceNormalized) ||
    utteranceNormalized.includes(questionNormalized)
  ) {
    score += 0.15;
  }

  const isShortQuestion = questionTokens.size <= 4;
  const isSubset = [...questionTokens].every((token) => utteranceTokens.has(token));
  if (isShortQuestion && isSubset) {
    score += 0.1;
  }

  return Math.min(0.99, score);
}

function buildSignatures(intents: IntentLibraryIntent[]): Map<string, Set<string>> {
  const tokenIntentFrequency = new Map<string, Set<string>>();
  const intentTokenFrequency = new Map<string, Map<string, number>>();

  for (const intent of intents) {
    const perIntent = new Map<string, number>();

    for (const utterance of intent.utterances) {
      const uniqueTokens = new Set(tokensWithoutStopwords(utterance));
      for (const token of uniqueTokens) {
        perIntent.set(token, (perIntent.get(token) ?? 0) + 1);

        const intentsForToken = tokenIntentFrequency.get(token) ?? new Set<string>();
        intentsForToken.add(intent.intentCode);
        tokenIntentFrequency.set(token, intentsForToken);
      }
    }

    intentTokenFrequency.set(intent.intentCode, perIntent);
  }

  const signatures = new Map<string, Set<string>>();

  for (const intent of intents) {
    const perIntent = intentTokenFrequency.get(intent.intentCode) ?? new Map<string, number>();
    const signatureTokens = new Set<string>();

    for (const [token, occurrences] of perIntent.entries()) {
      const crossIntentUsage = tokenIntentFrequency.get(token)?.size ?? 0;
      if (occurrences >= 2 && crossIntentUsage <= 2) {
        signatureTokens.add(token);
      }
    }

    signatures.set(intent.intentCode, signatureTokens);
  }

  return signatures;
}

function computeIntentCodeBoost(intentCode: string, questionNormalized: string): number {
  const code = intentCode.toUpperCase();
  let boost = 0;

  const hasAny = (pattern: RegExp): boolean => pattern.test(questionNormalized);

  if (code.includes("DEBT") && hasAny(/\b(deuda|debo|saldo|mora|morosidad)\b/)) boost += 0.12;
  if (code.includes("PAYMENT") && hasAny(/\b(pago|pagos|transferencia|comprobante|recibo)\b/)) boost += 0.1;
  if (code.includes("OVERDUE") && hasAny(/\b(vencid[a-z]*|mora|atrasad[a-z]*)\b/)) boost += 0.1;
  if (code.includes("LAST") && hasAny(/\b(ultimo|reciente)\b/)) boost += 0.08;
  if (code.includes("PERIOD") && hasAny(/\b(periodo|mes|mensual|yyyy-mm)\b/)) boost += 0.08;
  if (code.includes("TREND") && hasAny(/\b(tendencia|evolucion|historial|serie)\b/)) boost += 0.08;
  if (code.includes("PROOF") && hasAny(/\b(comprobante|recibo|adjunto|evidencia)\b/)) boost += 0.08;
  if (code.includes("PENDING") && hasAny(/\b(pendiente|pendientes|revision)\b/)) boost += 0.08;
  if (code.includes("REJECTED") && hasAny(/\b(rechazad[a-z]*|denegad[a-z]*)\b/)) boost += 0.08;
  if (code.includes("UNIT") && hasAny(/\b(unidad|uf|depto|departamento|apto|apartamento)\b/)) boost += 0.08;

  return Math.min(0.24, boost);
}

function getIntentLibrary(): IntentLibraryCache {
  if (cache) return cache;

  const p0Raw = JSON.parse(readFileSync(P0_LIBRARY_PATH, "utf8")) as IntentLibraryFile;
  const p1Raw = JSON.parse(readFileSync(P1_LIBRARY_PATH, "utf8")) as IntentLibraryFile;

  const p0Validated = validateIntentLibraryFile(p0Raw);
  const p1Validated = validateIntentLibraryFile(p1Raw);

  if (!p0Validated.valid) {
    throw new Error(`Invalid intent-library.p0.json: ${p0Validated.errors.join(" | ")}`);
  }
  if (!p1Validated.valid) {
    throw new Error(`Invalid intent-library.p1.json: ${p1Validated.errors.join(" | ")}`);
  }

  const intents = [...(p0Validated.data?.intents ?? []), ...(p1Validated.data?.intents ?? [])].filter(
    (intent) => intent.level === "P0" || intent.level === "P1"
  );

  cache = {
    intents,
    signatures: buildSignatures(intents),
  };

  return cache;
}

export function getIntentLibraryIntent(intentCode: string): IntentLibraryIntent | null {
  const { intents } = getIntentLibrary();
  return intents.find((intent) => intent.intentCode === intentCode) ?? null;
}

export function matchIntent(input: MatchIntentInput): IntentMatchResult | null {
  const questionNormalized = normalizeText(input.question);
  if (!questionNormalized) {
    return null;
  }

  const questionTokens = toTokenSet(questionNormalized);
  if (questionTokens.size === 0) {
    return null;
  }

  const { intents, signatures } = getIntentLibrary();
  const candidates = intents.filter((intent) => isAudienceAllowed(intent.audience, input.role));

  if (candidates.length === 0) {
    return null;
  }

  const scored = candidates
    .map((intent) => {
      let utteranceScore = 0;

      for (const utterance of intent.utterances) {
        utteranceScore = Math.max(
          utteranceScore,
          computeUtteranceScore(questionNormalized, questionTokens, utterance)
        );
      }

      const signature = signatures.get(intent.intentCode) ?? new Set<string>();
      let signatureMatches = 0;
      for (const token of questionTokens) {
        if (signature.has(token)) {
          signatureMatches += 1;
        }
      }

      const signatureScore =
        signature.size === 0
          ? 0
          : Math.min(0.18, (signatureMatches / Math.max(1, Math.min(4, signature.size))) * 0.18);
      const intentCodeBoost = computeIntentCodeBoost(
        intent.intentCode,
        questionNormalized
      );

      return {
        intentCode: intent.intentCode,
        level: intent.level,
        confidence: Math.min(1, utteranceScore + signatureScore + intentCodeBoost),
      } satisfies MatchCandidate;
    })
    .sort((a, b) => b.confidence - a.confidence);

  if (scored.length === 0) {
    return null;
  }

  const topCandidates = scored.slice(0, 3).map((item) => ({
    ...item,
    confidence: roundConfidence(item.confidence),
  }));

  const top = topCandidates[0];
  const second = topCandidates[1];

  if (!top) {
    return null;
  }

  let confidence = top.confidence;
  if (second && confidence >= 0.7 && Math.abs(confidence - second.confidence) <= 0.08 && confidence < 0.95) {
    confidence = roundConfidence(Math.min(0.84, confidence));
    top.confidence = confidence;
  }

  if (confidence < 0.7) {
    return null;
  }

  return {
    intentCode: top.intentCode,
    level: top.level,
    confidence,
    topCandidates,
  };
}

export const __intentMatcherTesting = {
  normalizeText,
  tokenize,
};
