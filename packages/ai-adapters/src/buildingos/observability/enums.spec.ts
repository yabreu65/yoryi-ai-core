import { describe, it, expect } from "vitest";
import {
  GATEWAY_OUTCOMES,
  FALLBACK_PATHS,
  isValidGatewayOutcome,
  isValidFallbackPath,
  assertGatewayOutcome,
  assertFallbackPath,
} from "./enums";

describe("Enum validation", () => {
  describe("GatewayOutcome", () => {
    it.each(GATEWAY_OUTCOMES)("should accept valid gatewayOutcome: %s", (v) => {
      expect(isValidGatewayOutcome(v)).toBe(true);
    });

    it("should reject invalid gatewayOutcome", () => {
      expect(isValidGatewayOutcome("invalid_string")).toBe(false);
      expect(isValidGatewayOutcome("")).toBe(false);
      expect(isValidGatewayOutcome(null)).toBe(false);
      expect(isValidGatewayOutcome(undefined)).toBe(false);
    });

    it("should throw on invalid gatewayOutcome in assert", () => {
      expect(() => assertGatewayOutcome("bad")).toThrow();
      expect(() => assertGatewayOutcome("bad", "test")).toThrow();
    });

    it("should return valid gatewayOutcome in assert", () => {
      expect(assertGatewayOutcome("success")).toBe("success");
      expect(assertGatewayOutcome("error", "ctx")).toBe("error");
    });
  });

  describe("FallbackPath", () => {
    it.each(FALLBACK_PATHS)("should accept valid fallbackPath: %s", (v) => {
      expect(isValidFallbackPath(v)).toBe(true);
    });

    it("should reject invalid fallbackPath", () => {
      expect(isValidFallbackPath("invalid_string")).toBe(false);
      expect(isValidFallbackPath("random_path")).toBe(false);
      expect(isValidFallbackPath("")).toBe(false);
      expect(isValidFallbackPath(null)).toBe(false);
    });

    it("should throw on invalid fallbackPath in assert", () => {
      expect(() => assertFallbackPath("bad")).toThrow();
      expect(() => assertFallbackPath("bad", "test")).toThrow();
    });

    it("should return valid fallbackPath in assert", () => {
      expect(assertFallbackPath("none")).toBe("none");
      expect(assertFallbackPath("intent_library_answer", "ctx")).toBe("intent_library_answer");
    });
  });

  describe("Enum exhaustiveness", () => {
    it("should have all expected gateway outcomes", () => {
      const expected = [
        "success",
        "null",
        "error",
        "denied",
        "timeout",
        "unavailable",
        "invalid_entities",
        "invalid_payload",
        "cache_hit",
        "cache_miss",
      ];
      expect(GATEWAY_OUTCOMES).toEqual(expected);
    });

    it("should have all expected fallback paths", () => {
      const expected = [
        "none",
        "intent_library_answer",
        "intent_library_clarification",
        "intent_library_no_match",
        "intent_library_tool_success",
        "intent_library_tool_null",
        "intent_library_tool_error",
        "p0_financial_bypass",
        "p0_enforced_no_data",
        "rag_used",
        "rag_no_sources",
        "hitl_created",
        "blocked_rbac",
        "blocked_mutation",
        "routing_no_match",
        "p0_gateway_missing",
        "p0_gateway_unavailable",
        "p1_gateway_no_result",
        "p1_gateway_error",
        "forced_unit_debt_gateway_missing",
        "forced_unit_debt_no_match",
        "forced_unit_debt_gateway_error",
        "p0_enforcement_operational_unavailable",
        "classifier_operational_fallback",
        "ambiguous_unit_building_query",
        "pending_clarification_invalid_option",
        "pending_clarification_expired",
        "aggregate_scope_required",
        "unit_lookup_ambiguous",
        "payment_missing_building_token",
        "payment_scope_required",
      ];
      expect(FALLBACK_PATHS).toEqual(expected);
    });
  });
});