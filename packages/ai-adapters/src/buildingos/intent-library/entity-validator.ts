import type { ResolvedAssistantContext } from "@yoryi/ai-types";
import type { IntentLibraryIntent } from "./schema";

export type EntityValidationResult =
  | { ok: true; normalizedEntities: Record<string, string> }
  | { ok: false; missingEntities: string[]; reason: string };

export interface EntityLookupGateway {
  checkBuildingExists(tenantId: string, buildingId: string): Promise<boolean>;
  checkUnitExists(tenantId: string, buildingId: string, unitId: string): Promise<boolean>;
  checkTowerExists(tenantId: string, buildingId: string, towerId: string): Promise<boolean>;
}

/**
 * Validates extracted entities against required entities for an intent
 * and checks existence of buildings/units/towers via the lookup gateway
 */
export async function validateEntities(
  params: {
    intentCode: string;
    context: ResolvedAssistantContext;
    extractedEntities: Record<string, string | undefined>;
    requiredEntities: string[];
    entityLookupGateway: EntityLookupGateway;
  }
): Promise<EntityValidationResult> {
  const { intentCode, context, extractedEntities, requiredEntities, entityLookupGateway } = params;
  const tenantId = context.tenantId;
  if (!tenantId) {
    return {
      ok: false,
      missingEntities: [],
      reason: "Missing tenant context",
    };
  }
  
  // Check for missing required entities
  const missingEntities: string[] = [];
  for (const entity of requiredEntities) {
    const value = extractedEntities[entity];
    if (value === undefined || value === null || value === "") {
      missingEntities.push(entity);
    }
  }
  
  if (missingEntities.length > 0) {
    return {
      ok: false,
      missingEntities,
      reason: `Missing required entities: ${missingEntities.join(", ")}`,
    };
  }
  
  // Normalize entities (trim strings, convert to appropriate types)
  const normalizedEntities: Record<string, string> = {};
  for (const [key, value] of Object.entries(extractedEntities)) {
    if (value !== undefined && value !== null) {
      normalizedEntities[key] = value.trim();
    }
  }

  const contextBuildingId =
    typeof context.extra?.buildingId === "string" && context.extra.buildingId.trim().length > 0
      ? context.extra.buildingId.trim()
      : undefined;
  const effectiveBuildingId = normalizedEntities.buildingId ?? contextBuildingId;

  if (effectiveBuildingId) {
    normalizedEntities.buildingId = effectiveBuildingId;
  }

  if ((normalizedEntities.unitId || normalizedEntities.towerId) && !normalizedEntities.buildingId) {
    return {
      ok: false,
      missingEntities: ["buildingId"],
      reason: "Necesito el edificio para validar la entidad solicitada.",
    };
  }
  
  // Validate existence based on intent type
  // This is a simplified implementation - in practice, this would be more sophisticated
  // and would depend on the specific intent being validated
  try {
    // For now, we'll do basic validation - specific intents would have more complex logic
    // This is where we'd check building/unit/tower existence based on the intent
    
    // Example validation for common entity types
    if (normalizedEntities.buildingId) {
      const buildingExists = await entityLookupGateway.checkBuildingExists(
        tenantId,
        normalizedEntities.buildingId
      );
      if (!buildingExists) {
        return {
          ok: false,
          missingEntities: ["buildingId"],
          reason: "No pude validar el edificio solicitado.",
        };
      }
    }
    
    if (normalizedEntities.unitId && normalizedEntities.buildingId) {
      const unitExists = await entityLookupGateway.checkUnitExists(
        tenantId,
        normalizedEntities.buildingId,
        normalizedEntities.unitId
      );
      if (!unitExists) {
        return {
          ok: false,
          missingEntities: ["unitId"],
          reason: "No pude validar la unidad solicitada.",
        };
      }
    }
    
    if (normalizedEntities.towerId && normalizedEntities.buildingId) {
      const towerExists = await entityLookupGateway.checkTowerExists(
        tenantId,
        normalizedEntities.buildingId,
        normalizedEntities.towerId
      );
      if (!towerExists) {
        return {
          ok: false,
          missingEntities: ["towerId"],
          reason: "No pude validar la torre solicitada.",
        };
      }
    }
    
    return {
      ok: true,
      normalizedEntities,
    };
  } catch (error) {
    void error;
    return {
      ok: false,
      missingEntities: [],
      reason: "No pude validar las entidades de esta consulta.",
    };
  }
}
