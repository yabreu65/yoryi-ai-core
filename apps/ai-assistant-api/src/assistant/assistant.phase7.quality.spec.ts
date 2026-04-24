import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantService } from "./assistant.service";
import { PHASE7_QUALITY_CASES } from "./phase7-quality.dataset";

type EnvBackup = Partial<Record<string, string | undefined>>;

describe("AssistantService phase 7 quality matrix", () => {
  let envBackup: EnvBackup;

  beforeEach(() => {
    envBackup = {
      RAG_ENABLED: process.env.RAG_ENABLED,
      RAG_TOP_K: process.env.RAG_TOP_K,
      RAG_MIN_SCORE: process.env.RAG_MIN_SCORE,
      BUILDINGOS_FINANCIAL_API_BASE_URL:
        process.env.BUILDINGOS_FINANCIAL_API_BASE_URL,
      BUILDINGOS_FINANCIAL_API_KEY: process.env.BUILDINGOS_FINANCIAL_API_KEY,
      BUILDINGOS_READONLY_QUERY_API_BASE_URL:
        process.env.BUILDINGOS_READONLY_QUERY_API_BASE_URL,
      BUILDINGOS_READONLY_QUERY_API_KEY:
        process.env.BUILDINGOS_READONLY_QUERY_API_KEY,
      BUILDINGOS_READONLY_QUERY_TIMEOUT_MS:
        process.env.BUILDINGOS_READONLY_QUERY_TIMEOUT_MS,
    };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.RAG_ENABLED = envBackup.RAG_ENABLED;
    process.env.RAG_TOP_K = envBackup.RAG_TOP_K;
    process.env.RAG_MIN_SCORE = envBackup.RAG_MIN_SCORE;
    process.env.BUILDINGOS_FINANCIAL_API_BASE_URL =
      envBackup.BUILDINGOS_FINANCIAL_API_BASE_URL;
    process.env.BUILDINGOS_FINANCIAL_API_KEY = envBackup.BUILDINGOS_FINANCIAL_API_KEY;
    process.env.BUILDINGOS_READONLY_QUERY_API_BASE_URL =
      envBackup.BUILDINGOS_READONLY_QUERY_API_BASE_URL;
    process.env.BUILDINGOS_READONLY_QUERY_API_KEY =
      envBackup.BUILDINGOS_READONLY_QUERY_API_KEY;
    process.env.BUILDINGOS_READONLY_QUERY_TIMEOUT_MS =
      envBackup.BUILDINGOS_READONLY_QUERY_TIMEOUT_MS;
    vi.restoreAllMocks();
  });

  it.each(PHASE7_QUALITY_CASES)(
    "[$persona] $id",
    async ({ message, context, authContext, env, expected }) => {
      delete process.env.BUILDINGOS_FINANCIAL_API_BASE_URL;
      delete process.env.BUILDINGOS_FINANCIAL_API_KEY;
      delete process.env.BUILDINGOS_READONLY_QUERY_API_BASE_URL;
      delete process.env.BUILDINGOS_READONLY_QUERY_API_KEY;
      delete process.env.BUILDINGOS_READONLY_QUERY_TIMEOUT_MS;

      if (env) {
        for (const [key, value] of Object.entries(env)) {
          if (value !== undefined) {
            process.env[key] = value;
          }
        }
      }

      const fetchMock = vi.fn(async (url: string) => {
        if (url.includes("/resident-debt-summary")) {
          return {
            ok: true,
            json: async () => ({
              amount: 4210.75,
              currency: "ARS",
              asOf: "2026-04-18",
            }),
          };
        }

        if (url.includes("/assistant/read-only-query")) {
          return {
            ok: true,
            json: async () => ({
              answer:
                "Resumen de cobranzas: total ARS 12.450.000 y morosidad 7.1%.",
              metadata: {
                metricValue: 12450000,
                source: "buildingos-read-db",
              },
            }),
          };
        }

        return {
          ok: false,
          json: async () => ({}),
        };
      });
      vi.stubGlobal("fetch", fetchMock);

      const service = new AssistantService();
      const response = await service.handleChat({
        message,
        context,
        authContext,
      });

      expect(response.answerSource).toBe(expected.answerSource);
      expect(response.responseType).toBe(expected.responseType);
      expect(response.dataScope).toBe(expected.dataScope);
      expect(response.context.tenantId).toBe(expected.expectedTenantId);
      expect(typeof response.auditId).toBe("string");
      expect(response.auditId.length).toBeGreaterThan(10);
      if (expected.answerIncludes) {
        expect(response.answer.toLowerCase()).toContain(
          expected.answerIncludes.toLowerCase()
        );
      }
    }
  );

  it("uses RAG semantic retrieval for knowledge responses after indexing", async () => {
    process.env.RAG_ENABLED = "true";
    process.env.RAG_TOP_K = "5";
    process.env.RAG_MIN_SCORE = "0.2";

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const service = new AssistantService();
    await service.reindexRagKnowledge({ apps: ["buildingos"] });

    const response = await service.handleChat({
      message: "¿Qué incluye el módulo de pagos en BuildingOS?",
      context: {
        appId: "buildingos",
        tenantId: "tenant-1",
        userId: "admin-1",
        role: "TENANT_ADMIN",
        route: "/tenant/payments",
      },
      authContext: {
        appId: "buildingos",
        tenantId: "tenant-1",
        userId: "admin-1",
        role: "TENANT_ADMIN",
      },
    });

    expect(response.answerSource).toBe("knowledge");
    expect(response.knowledgeUsed?.found).toBe(true);
    expect(response.knowledgeUsed?.sources.length).toBeGreaterThan(0);
  });
});
