import { describe, it, expect, beforeAll } from "vitest";
import { BuildingOSP2BRouter } from "./buildingos-p2b-router";

describe("BuildingOSP2BRouter", () => {
  let router: BuildingOSP2BRouter;

  beforeAll(() => {
    router = new BuildingOSP2BRouter();
  });

  describe("route - SEARCH_PROCESSES", () => {
    it("routes 'liquidaciones pendientes periodo 2026-03' to search_processes", () => {
      const result = router.route("liquidaciones pendientes periodo 2026-03");
      expect(result).not.toBeNull();
      expect(result?.toolName).toBe("search_processes");
      expect(result?.intentCode).toBe("SEARCH_LIQUIDATIONS");
      expect((result as { toolInput: Record<string, unknown> }).toolInput).toHaveProperty("processTypes", ["LIQUIDATION"]);
      expect((result as { toolInput: Record<string, unknown> }).toolInput).toHaveProperty("statuses");
    });

    it("routes 'procesos' to search_processes", () => {
      const result = router.route("ver procesos");
      expect(result).not.toBeNull();
      expect(result?.toolName).toBe("search_processes");
    });

    it("routes 'expedientes' to search_processes", () => {
      const result = router.route("listado expedientes");
      expect(result).not.toBeNull();
      expect(result?.toolName).toBe("search_processes");
    });
  });

  describe("route - SEARCH_CLAIMS", () => {
    it("routes 'reclamos' to search_claims", () => {
      const result = router.route("buscar reclamos");
      expect(result).not.toBeNull();
      expect(result?.toolName).toBe("search_claims");
      expect(result?.intentCode).toBe("SEARCH_CLAIMS");
    });

    it("routes 'claims' to search_claims", () => {
      const result = router.route("ver claims");
      expect(result).not.toBeNull();
      expect(result?.toolName).toBe("search_claims");
    });
  });

  describe("route - GET_PROCESS_SUMMARY", () => {
    it("routes 'resumen de procesos' to get_process_summary", () => {
      const result = router.route("resumen de procesos");
      expect(result).not.toBeNull();
      expect(result?.toolName).toBe("get_process_summary");
      expect(result?.intentCode).toBe("GET_PROCESS_SUMMARY");
    });

    it("routes 'estadisticas procesos' to get_process_summary", () => {
      const result = router.route("estadisticas de procesos");
      expect(result).not.toBeNull();
      expect(result?.toolName).toBe("get_process_summary");
    });
  });

  describe("extractFilters - status extraction", () => {
    it("extracts PENDING status from 'pendientes'", () => {
      const filters = router.extractFilters("procesos pendientes");
      expect(filters).toHaveProperty("statuses");
      expect((filters.statuses as string[])).toContain("PENDING");
    });

    it("extracts APPROVED status from 'aprobados'", () => {
      const filters = router.extractFilters("procesos aprobados");
      expect(filters).toHaveProperty("statuses");
      expect((filters.statuses as string[])).toContain("APPROVED");
    });

    it("extracts REJECTED status from 'rechazados'", () => {
      const filters = router.extractFilters("procesos rechazados");
      expect(filters).toHaveProperty("statuses");
      expect((filters.statuses as string[])).toContain("REJECTED");
    });
  });

  describe("extractFilters - complex queries", () => {
    it("handles 'reclamos sin respuesta hace 7 días'", () => {
      const result = router.route("reclamos sin respuesta hace 7 días");
      expect(result).not.toBeNull();
      expect(result?.toolName).toBe("search_claims");
      expect((result as { toolInput: Record<string, unknown> }).toolInput).toHaveProperty("createdAfter");
    });

    it("handles 'aprobaciones urgentes sin asignar'", () => {
      const result = router.route("aprobaciones urgentes sin asignar");
      expect(result).not.toBeNull();
      expect(result?.toolName).toBe("search_processes");
      const toolInput = (result as { toolInput: Record<string, unknown> }).toolInput;
      expect(toolInput).toHaveProperty("processTypes", ["EXPENSE_VALIDATION"]);
      expect(toolInput).toHaveProperty("priority", 3);
      expect(toolInput).toHaveProperty("assigned", false);
    });

    it("handles 'resumen de procesos pendientes'", () => {
      const result = router.route("resumen de procesos pendientes");
      expect(result).not.toBeNull();
      expect(result?.toolName).toBe("get_process_summary");
      expect((result as { toolInput: Record<string, unknown> }).toolInput).toHaveProperty("groupBy", "status");
    });
  });

  describe("extractFilters - period extraction", () => {
    it("extracts period from '2026-03'", () => {
      const filters = router.extractFilters("liquidaciones periodo 2026-03");
      expect(filters).toHaveProperty("period", "2026-03");
    });

    it("extracts period from 'marzo 2026'", () => {
      const filters = router.extractFilters("liquidaciones marzo 2026");
      expect(filters).toHaveProperty("period", "2026-03");
    });

    it("extracts period from month name", () => {
      const filters = router.extractFilters("procesos de abril");
      expect(filters).toHaveProperty("period");
    });
  });

  describe("extractFilters - overdue extraction", () => {
    it("extracts overdueSla from 'vencidos'", () => {
      const filters = router.extractFilters("procesos vencidos");
      expect(filters).toHaveProperty("overdueSla", true);
    });

    it("extracts overdueSla from 'fuera de SLA'", () => {
      const filters = router.extractFilters("procesos fuera de SLA");
      expect(filters).toHaveProperty("overdueSla", true);
    });
  });

  describe("extractFilters - priority extraction", () => {
    it("extracts priority 3 from 'urgente'", () => {
      const filters = router.extractFilters("liquidaciones urgentes");
      expect(filters).toHaveProperty("priority", 3);
    });

    it("extracts priority 3 from 'alta prioridad'", () => {
      const filters = router.extractFilters("aprobaciones alta prioridad");
      expect(filters).toHaveProperty("priority", 3);
    });
  });

  describe("limit clamping", () => {
    it("clamps limit to maxLimit (50)", () => {
      const filters = router.extractFilters("procesos");
      expect(filters).toHaveProperty("limit");
      expect(filters.limit).toBeLessThanOrEqual(50);
    });
  });

  describe("clarifications", () => {
    it("returns building clarification in multi-building context", () => {
      const result = router.route("procesos", {
        buildingCount: 3,
        buildingId: undefined,
      });
      expect(result).toHaveProperty("answer");
      expect((result as { answer: string }).answer).toContain("edificio");
    });

    it("returns period clarification when period required but not provided", () => {
      const result = router.route("liquidaciones");
      expect(result).not.toBeNull();
    });
  });

  describe("manifest", () => {
    it("has correct contractVersion", () => {
      expect(router.getManifestVersion()).toBe("2026-05-buildingos-p2b-manifest-v1");
    });

    it("has maxLimit = 50", () => {
      expect(router.getDefaults().maxLimit).toBe(50);
    });

    it("has default limit = 20", () => {
      expect(router.getDefaults().limit).toBe(20);
    });

    it("has maxClarifications = 2", () => {
      expect(router.getDefaults().maxClarifications).toBe(2);
    });
  });

  describe("unrecognized queries", () => {
    it("returns null for unrelated query", () => {
      const result = router.route("xyz unrelated query");
      expect(result).toBeNull();
    });
  });
});