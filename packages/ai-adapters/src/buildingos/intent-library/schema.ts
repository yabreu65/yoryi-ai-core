export type IntentLevel = "P0" | "P1";
export type IntentAudience = "RESIDENT" | "ADMIN" | "BOTH";

export type IntentLibraryCanonicalAnswer = {
  resident: string;
  admin?: string;
};

export type IntentLibraryClarificationQuestions = {
  missingUnitId?: string;
  missingBuildingId?: string;
  missingTowerId?: string;
  missingPeriod?: string;
};

export type IntentLibraryToolBinding = {
  toolName: string;
  requiredPermissions?: string[];
  outputMapping?: Record<string, string>;
};

export type IntentLibraryIntent = {
  intentCode: string;
  level: IntentLevel;
  audience: IntentAudience;
  utterances: string[];
  canonicalAnswer: IntentLibraryCanonicalAnswer;
  requiredEntities: string[];
  clarificationQuestions: IntentLibraryClarificationQuestions;
  toolBinding?: IntentLibraryToolBinding;
  version: number;
};

export type IntentLibraryFile = {
  version: number;
  level: IntentLevel;
  intents: IntentLibraryIntent[];
};

const VALID_LEVELS: IntentLevel[] = ["P0", "P1"];
const VALID_AUDIENCES: IntentAudience[] = ["RESIDENT", "ADMIN", "BOTH"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((entry) => isNonEmptyString(entry))) return null;
  return value as string[];
}

function validateCanonicalAnswer(value: unknown): IntentLibraryCanonicalAnswer | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.resident)) return null;
  if (value.admin !== undefined && !isNonEmptyString(value.admin)) return null;
  return value as IntentLibraryCanonicalAnswer;
}

function validateClarificationQuestions(
  value: unknown
): IntentLibraryClarificationQuestions | null {
  if (!isRecord(value)) return null;

  const keys = [
    "missingUnitId",
    "missingBuildingId",
    "missingTowerId",
    "missingPeriod",
  ] as const;
  for (const key of keys) {
    const field = value[key];
    if (field !== undefined && !isNonEmptyString(field)) {
      return null;
    }
  }

  return value as IntentLibraryClarificationQuestions;
}

function validateToolBinding(value: unknown): IntentLibraryToolBinding | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.toolName)) return null;

  if (value.requiredPermissions !== undefined) {
    const permissions = asStringArray(value.requiredPermissions);
    if (!permissions) return null;
  }

  if (value.outputMapping !== undefined) {
    if (!isRecord(value.outputMapping)) return null;
    const outputMappingEntries = Object.entries(value.outputMapping);
    if (
      outputMappingEntries.length === 0 ||
      outputMappingEntries.some(
        ([key, mappedValue]) =>
          !isNonEmptyString(key) || !isNonEmptyString(mappedValue)
      )
    ) {
      return null;
    }
  }

  return value as IntentLibraryToolBinding;
}

function validateIntent(
  value: unknown,
  fileLevel: IntentLevel,
  allowedIntentCodes?: Set<string>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { valid: false, errors: ["intent must be an object"] };
  }

  if (!isNonEmptyString(value.intentCode)) {
    errors.push("intentCode must be a non-empty string");
  } else if (allowedIntentCodes && !allowedIntentCodes.has(value.intentCode)) {
    errors.push(`intentCode '${value.intentCode}' does not exist in intent-registry.json`);
  }

  if (!VALID_LEVELS.includes(value.level as IntentLevel)) {
    errors.push("level must be P0 or P1");
  } else if (value.level !== fileLevel) {
    errors.push(`intent level '${String(value.level)}' does not match file level '${fileLevel}'`);
  }

  if (!VALID_AUDIENCES.includes(value.audience as IntentAudience)) {
    errors.push("audience must be RESIDENT | ADMIN | BOTH");
  }

  const utterances = asStringArray(value.utterances);
  if (!utterances || utterances.length === 0) {
    errors.push("utterances must be a non-empty string array");
  }

  const canonical = validateCanonicalAnswer(value.canonicalAnswer);
  if (!canonical) {
    errors.push("canonicalAnswer is invalid");
  }

  const requiredEntities = asStringArray(value.requiredEntities);
  if (!requiredEntities) {
    errors.push("requiredEntities must be string[]");
  }

  const clarification = validateClarificationQuestions(value.clarificationQuestions);
  if (!clarification) {
    errors.push("clarificationQuestions is invalid");
  }

  if (!isPositiveInteger(value.version)) {
    errors.push("version must be a positive integer");
  }

  if (value.toolBinding !== undefined && !validateToolBinding(value.toolBinding)) {
    errors.push("toolBinding is invalid");
  }

  return { valid: errors.length === 0, errors };
}

export function validateIntentLibraryFile(
  value: unknown,
  options?: {
    allowedIntentCodes?: Set<string>;
  }
): {
  valid: boolean;
  errors: string[];
  data?: IntentLibraryFile;
} {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { valid: false, errors: ["intent library must be an object"] };
  }

  if (!isPositiveInteger(value.version)) {
    errors.push("version must be a positive integer");
  }

  if (!VALID_LEVELS.includes(value.level as IntentLevel)) {
    errors.push("level must be P0 or P1");
  }

  if (!Array.isArray(value.intents)) {
    errors.push("intents must be an array");
  } else if (VALID_LEVELS.includes(value.level as IntentLevel)) {
    value.intents.forEach((intent, index) => {
      const result = validateIntent(
        intent,
        value.level as IntentLevel,
        options?.allowedIntentCodes
      );
      if (!result.valid) {
        errors.push(`intent[${index}] -> ${result.errors.join(", ")}`);
      }
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: value as IntentLibraryFile,
  };
}
