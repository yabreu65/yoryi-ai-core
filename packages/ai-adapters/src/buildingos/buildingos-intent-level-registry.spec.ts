import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type RegistryIntent = {
  intentCode: string;
  level: "P0" | "P1" | "P2A" | "P2B" | "P3";
  audience: "ADMIN" | "RESIDENT" | "BOTH";
  readOnly: boolean;
  sourceType: "live_data" | "templates" | "knowledge";
};

type RegistryFile = {
  version: string;
  notes?: string;
  intents: RegistryIntent[];
};

type ManifestFile = {
  routes: Array<{ intentCode: string }>;
};

function readJson<T>(absolutePath: string): T {
  return JSON.parse(readFileSync(absolutePath, "utf8")) as T;
}

describe("BuildingOS intent-registry contract", () => {
  const contractsDir = join(__dirname, "contracts");
  const manifestsDir = join(contractsDir, "manifests");
  const registryPath = join(contractsDir, "intent-registry.json");

  const manifestFiles = [
    "buildingos.p0.json",
    "buildingos.p1.json",
    "buildingos.p2.json",
    "buildingos.p2b.json",
    "buildingos.p3.json",
  ];

  it("contains all intents referenced by manifests", () => {
    const registry = readJson<RegistryFile>(registryPath);
    const registrySet = new Set(registry.intents.map((item) => item.intentCode));

    const manifestIntents = new Set<string>();
    for (const file of manifestFiles) {
      const manifest = readJson<ManifestFile>(join(manifestsDir, file));
      for (const route of manifest.routes) {
        manifestIntents.add(route.intentCode);
      }
    }

    const missing = [...manifestIntents].filter((intent) => !registrySet.has(intent));
    expect(missing).toEqual([]);
  });

  it("does not contain duplicate intentCode entries", () => {
    const registry = readJson<RegistryFile>(registryPath);
    const seen = new Set<string>();
    const duplicated = new Set<string>();

    for (const intent of registry.intents) {
      if (seen.has(intent.intentCode)) {
        duplicated.add(intent.intentCode);
      }
      seen.add(intent.intentCode);
    }

    expect([...duplicated]).toEqual([]);
  });

  it("uses only valid P-level values", () => {
    const registry = readJson<RegistryFile>(registryPath);
    const allowed = new Set(["P0", "P1", "P2A", "P2B", "P3"]);

    const invalid = registry.intents
      .filter((intent) => !allowed.has(intent.level))
      .map((intent) => ({ intentCode: intent.intentCode, level: intent.level }));

    expect(invalid).toEqual([]);
  });
});
