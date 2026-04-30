import { describe, expect, it } from "vitest";
import { ttlForIntent } from "./cache-config";

describe("ttlForIntent", () => {
  it("returns configured TTL for known intents", () => {
    expect(ttlForIntent("get_unit_balance")).toBe(30);
    expect(ttlForIntent("get_building_debt_trend")).toBe(300);
    expect(ttlForIntent("get_financial_summary")).toBe(1800);
  });

  it("falls back to default TTL", () => {
    expect(ttlForIntent("UNKNOWN_INTENT")).toBe(60);
  });
});
