import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateEntities, EntityValidationResult } from "./entity-validator";
import type { ResolvedAssistantContext } from "@yoryi/ai-types";
import type { EntityLookupGateway } from "./entity-lookup-gateway";

describe("Entity Validator", () => {
  let mockContext: ResolvedAssistantContext;
  let mockEntityLookupGateway: EntityLookupGateway;

  beforeEach(() => {
    mockContext = {
      appId: "buildingos",
      tenantId: "tenant-123",
      userId: "user-456",
      role: "TENANT_ADMIN",
      route: "/tenant/units",
      currentModule: "units",
      permissions: ["units.read"],
      entityId: "unit-789",
    };

    mockEntityLookupGateway = {
      checkBuildingExists: vi.fn(),
      checkUnitExists: vi.fn(),
      checkTowerExists: vi.fn(),
    };
  });

  describe("validateEntities", () => {
    it("should return ok=true when all required entities are present and valid", async () => {
      mockEntityLookupGateway.checkBuildingExists.mockResolvedValue(true);
      mockEntityLookupGateway.checkUnitExists.mockResolvedValue(true);

      const result = await validateEntities({
        intentCode: "test_intent",
        context: mockContext,
        extractedEntities: { buildingId: "b1", unitId: "u1" },
        requiredEntities: ["buildingId", "unitId"],
        entityLookupGateway: mockEntityLookupGateway,
      });

      expect((result as EntityValidationResult).ok).toBe(true);
      expect((result as EntityValidationResult).normalizedEntities).toEqual({
        buildingId: "b1",
        unitId: "u1",
      });
    });

    it("should return ok=false when required entities are missing", async () => {
      const result = await validateEntities({
        intentCode: "test_intent",
        context: mockContext,
        extractedEntities: { buildingId: "b1" },
        requiredEntities: ["buildingId", "unitId"],
        entityLookupGateway: mockEntityLookupGateway,
      });

      expect((result as EntityValidationResult).ok).toBe(false);
      expect((result as EntityValidationResult).missingEntities).toEqual(["unitId"]);
      expect((result as EntityValidationResult).reason).toContain("Missing required entities");
    });

    it("should return ok=false when building does not exist", async () => {
      mockEntityLookupGateway.checkBuildingExists.mockResolvedValue(false);

      const result = await validateEntities({
        intentCode: "test_intent",
        context: mockContext,
        extractedEntities: { buildingId: "nonexistent" },
        requiredEntities: ["buildingId"],
        entityLookupGateway: mockEntityLookupGateway,
      });

      expect((result as EntityValidationResult).ok).toBe(false);
      expect((result as EntityValidationResult).missingEntities).toEqual(["buildingId"]);
      expect((result as EntityValidationResult).reason).toContain("does not exist");
    });

    it("should return ok=false when unit does not exist", async () => {
      mockEntityLookupGateway.checkBuildingExists.mockResolvedValue(true);
      mockEntityLookupGateway.checkUnitExists.mockResolvedValue(false);

      const result = await validateEntities({
        intentCode: "test_intent",
        context: mockContext,
        extractedEntities: { buildingId: "b1", unitId: "nonexistent" },
        requiredEntities: ["buildingId", "unitId"],
        entityLookupGateway: mockEntityLookupGateway,
      });

      expect((result as EntityValidationResult).ok).toBe(false);
      expect((result as EntityValidationResult).missingEntities).toEqual(["unitId"]);
      expect((result as EntityValidationResult).reason).toContain("does not exist");
    });

    it("should trim whitespace from entity values", async () => {
      mockEntityLookupGateway.checkBuildingExists.mockResolvedValue(true);
      mockEntityLookupGateway.checkUnitExists.mockResolvedValue(true);

      const result = await validateEntities({
        intentCode: "test_intent",
        context: mockContext,
        extractedEntities: { buildingId: " b1 ", unitId: " u1 " },
        requiredEntities: ["buildingId", "unitId"],
        entityLookupGateway: mockEntityLookupGateway,
      });

      expect((result as EntityValidationResult).ok).toBe(true);
      expect((result as EntityValidationResult).normalizedEntities).toEqual({
        buildingId: "b1",
        unitId: "u1",
      });
    });

    it("should handle empty string entities as missing", async () => {
      const result = await validateEntities({
        intentCode: "test_intent",
        context: mockContext,
        extractedEntities: { buildingId: "", unitId: "u1" },
        requiredEntities: ["buildingId", "unitId"],
        entityLookupGateway: mockEntityLookupGateway,
      });

      expect((result as EntityValidationResult).ok).toBe(false);
      expect((result as EntityValidationResult).missingEntities).toEqual(["buildingId"]);
    });

    it("should handle undefined entities as missing", async () => {
      const result = await validateEntities({
        intentCode: "test_intent",
        context: mockContext,
        extractedEntities: { buildingId: undefined as unknown as string, unitId: "u1" },
        requiredEntities: ["buildingId", "unitId"],
        entityLookupGateway: mockEntityLookupGateway,
      });

      expect((result as EntityValidationResult).ok).toBe(false);
      expect((result as EntityValidationResult).missingEntities).toEqual(["buildingId"]);
    });
  });
});