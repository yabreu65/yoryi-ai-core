import { describe, it, expect, beforeAll } from "vitest";
import { BuildingOSP2Router } from "./buildingos-p2-router";

describe("BuildingOSP2Router", () => {
  let router: BuildingOSP2Router;

  beforeAll(() => {
    router = new BuildingOSP2Router();
  });

  describe("route", () => {
    it("routes unit trend query to get_unit_debt_trend", () => {
      const result = router.route("tendencia deuda del departamento 301");
      expect(result).not.toBeNull();
      expect(result?.toolName).toBe("get_unit_debt_trend");
      expect(result?.intentCode).toBe("GET_UNIT_DEBT_TREND");
    });

    it("routes building trend query to get_building_debt_trend", () => {
      const result = router.route("deuda de la torre");
      expect(result).not.toBeNull();
      expect(result?.toolName).toBe("get_building_debt_trend");
    });

    it("routes collections trend to get_collections_trend", () => {
      const result = router.route("cobros del mes");
      expect(result).not.toBeNull();
      expect(result?.toolName).toBe("get_collections_trend");
    });

    it("extracts months from query and clamps to maxMonths", () => {
      const result = router.route("tendencia deuda 12 meses");
      expect(result).not.toBeNull();
      expect(result?.toolInput).toHaveProperty("months", 12);
    });

    it("clamps months > 24 to 24", () => {
      const result = router.route("tendencia deuda 50 meses");
      expect(result).not.toBeNull();
      expect(result?.toolInput).toHaveProperty("months", 24);
    });

    it("defaults months to 6", () => {
      const result = router.route("tendencia deuda");
      expect(result).not.toBeNull();
      expect(result?.toolInput).toHaveProperty("months", 6);
    });

    it("extracts metric 'overdue' from query", () => {
      const result = router.route("deuda vencida por单元");
      expect(result?.toolInput).toHaveProperty("metric", "overdue");
    });

    it("extracts metric 'charged' from query", () => {
      const result = router.route("cargos del edificio");
      expect(result?.toolInput).toHaveProperty("metric", "charged");
    });

    it("extracts metric 'collection_rate' from query", () => {
      const result = router.route("porcentaje de cobranza");
      expect(result?.toolInput).toHaveProperty("metric", "collection_rate");
    });

    it("returns clarification when building required but not provided in multi-building", () => {
      const result = router.route("deuda por torre", {
        buildingCount: 3,
        buildingId: undefined,
      });
      expect(result).toHaveProperty("answer");
      expect((result as { answer: string }).answer).toContain("edificio");
    });

    it("returns null for unrecognized query", () => {
      const result = router.route("xyz unrelated query");
      expect(result).toBeNull();
    });
  });

  describe("extractTrendParams", () => {
    it("handles 'último año' phrase", () => {
      const params = router.extractTrendParams("tendencia ultimo año");
      expect(params.months).toBe(12);
    });

    it("handles '6 meses' phrase", () => {
      const params = router.extractTrendParams("tendencia 6 meses");
      expect(params.months).toBe(6);
    });
  });

  describe("manifest", () => {
    it("has correct contractVersion", () => {
      expect(router.getManifestVersion()).toBe(
        "2026-05-buildingos-p2-manifest-v1"
      );
    });

    it("has maxMonths = 24", () => {
      expect(router.getDefaults().maxMonths).toBe(24);
    });

    it("has maxClarifications = 2", () => {
      expect(router.getDefaults().maxClarifications).toBe(2);
    });
  });
});