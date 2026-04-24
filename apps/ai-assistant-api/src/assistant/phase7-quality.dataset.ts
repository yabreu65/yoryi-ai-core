import type { AssistantRuntimeContext } from "@yoryi/ai-types";
import type { AssistantDataScope, AssistantResponseType } from "@yoryi/ai-core";

type QualityPersona = "admin" | "resident" | "security";

export type AssistantPhase7QualityCase = {
  id: string;
  persona: QualityPersona;
  message: string;
  context: Partial<AssistantRuntimeContext>;
  authContext: Partial<AssistantRuntimeContext>;
  env?: Partial<Record<string, string>>;
  expected: {
    answerSource: "live_data" | "knowledge" | "fallback";
    responseType: AssistantResponseType;
    dataScope: AssistantDataScope;
    expectedTenantId: string;
    answerIncludes?: string;
  };
};

export const PHASE7_QUALITY_CASES: AssistantPhase7QualityCase[] = [
  {
    id: "admin_live_data_readonly_query",
    persona: "admin",
    message: "Dame un resumen de cobranzas del mes",
    context: {
      appId: "buildingos",
      tenantId: "tenant-body",
      userId: "user-body",
      role: "RESIDENT",
      route: "/tenant/charges",
    },
    authContext: {
      appId: "buildingos",
      tenantId: "tenant-auth",
      userId: "admin-auth",
      role: "TENANT_ADMIN",
    },
    env: {
      BUILDINGOS_READONLY_QUERY_API_BASE_URL: "https://buildingos-readonly.example.com",
      BUILDINGOS_READONLY_QUERY_API_KEY: "readonly-key",
      BUILDINGOS_READONLY_QUERY_TIMEOUT_MS: "900",
    },
    expected: {
      answerSource: "live_data",
      responseType: "metric",
      dataScope: "tenant",
      expectedTenantId: "tenant-auth",
      answerIncludes: "cobranzas",
    },
  },
  {
    id: "resident_live_data_debt_query",
    persona: "resident",
    message: "¿Cuánto debo hoy?",
    context: {
      appId: "buildingos",
      tenantId: "tenant-body",
      userId: "user-body",
      role: "TENANT_ADMIN",
      route: "/resident/finanzas",
    },
    authContext: {
      appId: "buildingos",
      tenantId: "tenant-auth",
      userId: "resident-auth",
      role: "RESIDENT",
    },
    env: {
      BUILDINGOS_FINANCIAL_API_BASE_URL: "https://buildingos-financial.example.com",
      BUILDINGOS_FINANCIAL_API_KEY: "financial-key",
    },
    expected: {
      answerSource: "live_data",
      responseType: "metric",
      dataScope: "self",
      expectedTenantId: "tenant-auth",
      answerIncludes: "deuda actual",
    },
  },
  {
    id: "security_mutation_blocked_query_only",
    persona: "security",
    message: "Aprueba este pago ahora",
    context: {
      appId: "buildingos",
      tenantId: "tenant-spoof",
      userId: "user-spoof",
      role: "TENANT_ADMIN",
      route: "/tenant/payments",
    },
    authContext: {
      appId: "buildingos",
      tenantId: "tenant-auth",
      userId: "admin-auth",
      role: "TENANT_ADMIN",
    },
    expected: {
      answerSource: "fallback",
      responseType: "clarification",
      dataScope: "tenant",
      expectedTenantId: "tenant-auth",
      answerIncludes: "solo puedo consultar",
    },
  },
  {
    id: "security_permissions_unknown_role",
    persona: "security",
    message: "Mostrame los pagos pendientes del mes",
    context: {
      appId: "buildingos",
      tenantId: "tenant-spoof",
      userId: "user-spoof",
      role: "TENANT_ADMIN",
      route: "/tenant/payments",
    },
    authContext: {
      appId: "buildingos",
      tenantId: "tenant-auth",
      userId: "guest-auth",
      role: "GUEST",
    },
    expected: {
      answerSource: "fallback",
      responseType: "clarification",
      dataScope: "tenant",
      expectedTenantId: "tenant-auth",
      answerIncludes: "rol o contexto actual",
    },
  },
];
