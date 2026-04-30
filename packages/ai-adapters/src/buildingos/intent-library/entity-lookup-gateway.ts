import type { EntityLookupGateway } from "./entity-validator";

export class BuildingOSEntityLookupGateway implements EntityLookupGateway {
  constructor() {}

  async checkBuildingExists(tenantId: string, buildingId: string): Promise<boolean> {
    const normalizedTenant = tenantId.trim();
    const normalizedBuilding = buildingId.trim();
    if (!normalizedTenant || !normalizedBuilding) {
      return false;
    }

    return /^[a-zA-Z0-9\-_:.]+$/.test(normalizedBuilding);
  }

  async checkUnitExists(tenantId: string, buildingId: string, unitId: string): Promise<boolean> {
    const normalizedTenant = tenantId.trim();
    const normalizedBuilding = buildingId.trim();
    const normalizedUnit = unitId.trim();
    if (!normalizedTenant || !normalizedBuilding || !normalizedUnit) {
      return false;
    }

    return /^[a-zA-Z0-9\-_:.]+$/.test(normalizedUnit);
  }

  async checkTowerExists(tenantId: string, buildingId: string, towerId: string): Promise<boolean> {
    const normalizedTenant = tenantId.trim();
    const normalizedBuilding = buildingId.trim();
    const normalizedTower = towerId.trim();
    if (!normalizedTenant || !normalizedBuilding || !normalizedTower) {
      return false;
    }

    return /^[a-zA-Z0-9\-_:.]+$/.test(normalizedTower);
  }
}
