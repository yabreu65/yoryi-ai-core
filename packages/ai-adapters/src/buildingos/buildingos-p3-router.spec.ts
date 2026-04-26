import { describe, it, expect, beforeEach } from 'vitest';
import { BuildingOSP3Router } from './buildingos-p3-router';

describe('BuildingOSP3Router', () => {
  let router: BuildingOSP3Router;

  beforeEach(() => {
    router = new BuildingOSP3Router();
  });

  it('should have correct manifest version', () => {
    expect(router.getManifestVersion()).toBe('2026-05-buildingos-p3-manifest-v1');
  });

  describe('route()', () => {
    it('routes EXECUTIVE_DASHBOARD from dashboard keywords', () => {
      const result = router.route('dashboard ejecutivo');
      expect(result).not.toBeNull();
      expect((result as any).intentCode).toBe('EXECUTIVE_DASHBOARD');
      expect((result as any).toolName).toBe('cross_query');
      expect((result as any).toolInput.templateId).toBe('TPL-10');
    });

    it('routes PENDING_ACTIONS from workqueue keywords', () => {
      const result = router.route('cola de trabajo');
      expect(result).not.toBeNull();
      expect((result as any).intentCode).toBe('PENDING_ACTIONS');
      expect((result as any).toolName).toBe('cross_query');
      expect((result as any).toolInput.templateId).toBe('TPL-05');
    });

    it('routes UNIT_DEBT_OCCUPANCY from debt/occupancy keywords', () => {
      const result = router.route('deuda por unidad y ocupantes');
      expect(result).not.toBeNull();
      expect((result as any).intentCode).toBe('UNIT_DEBT_OCCUPANCY');
      expect((result as any).toolName).toBe('cross_query');
      expect((result as any).toolInput.templateId).toBe('TPL-01');
    });

    it('routes DEBT_AGING_BY_BUILDING from aging keywords', () => {
      const result = router.route('aging por edificio');
      expect(result).not.toBeNull();
      expect((result as any).intentCode).toBe('DEBT_AGING_BY_BUILDING');
      expect((result as any).toolInput.templateId).toBe('TPL-07');
    });

    it('routes COLLECTION_EFFICIENCY from efficiency keywords', () => {
      const result = router.route('eficiencia de cobranza');
      expect(result).not.toBeNull();
      expect((result as any).intentCode).toBe('COLLECTION_EFFICIENCY');
      expect((result as any).toolInput.templateId).toBe('TPL-09');
    });

    it('routes GET_UNIT_DEBT_TREND from trend keywords', () => {
      const result = router.route('tendencia deuda unitaria');
      expect(result).not.toBeNull();
      expect((result as any).intentCode).toBe('UNIT_DEBT_TREND');
      expect((result as any).toolName).toBe('get_unit_debt_trend');
    });

    it('extracts monthsBack from question', () => {
      const result = router.route('dashboard últimos 12 meses');
      expect(result).not.toBeNull();
      expect((result as any).toolInput.params?.monthsBack).toBe(12);
    });

    it('extracts limit from question', () => {
      const result = router.route('cola de trabajo dame 10 resultados');
      expect(result).not.toBeNull();
      expect((result as any).toolInput.params?.limit).toBe(10);
    });

    it('clamps limit to maxLimit', () => {
      const result = router.route('cola de trabajo dame 100 resultados');
      expect(result).not.toBeNull();
      expect((result as any).toolInput.params?.limit).toBe(50);
    });

    it('clamps topN to maxTopN', () => {
      const result = router.route('deuda por unidad top 100');
      expect(result).not.toBeNull();
      expect((result as any).toolInput.params?.topN).toBe(50);
    });

    it('clamps monthsBack to maxMonthsBack', () => {
      const result = router.route('dashboard últimos 30 meses');
      expect(result).not.toBeNull();
      expect((result as any).toolInput.params?.monthsBack).toBe(24);
    });

    it('returns null for unknown question', () => {
      const result = router.route('foo bar baz');
      expect(result).toBeNull();
    });

    it('requires building when buildingCount > 1 and tool is cross_query', () => {
      const result = router.route('dashboard', { buildingCount: 3 });
      expect(result).not.toBeNull();
      expect((result as any).answer).toContain('edificio');
    });

    it('does not require building when buildingCount <= 1', () => {
      const result = router.route('dashboard', { buildingCount: 1 });
      expect(result).not.toBeNull();
      expect((result as any).intentCode).toBe('EXECUTIVE_DASHBOARD');
    });

    it('includes cursor when question has "dame más"', () => {
      const result = router.route('dashboard dame más resultados');
      expect(result).not.toBeNull();
      expect((result as any).toolInput.params?.cursor).toBe('next');
    });

    it('includes cursor for "siguiente page"', () => {
      const result = router.route('cola de trabajo siguiente página');
      expect(result).not.toBeNull();
      expect((result as any).toolInput.params?.cursor).toBe('next');
    });
  });

  describe('getDefaults()', () => {
    it('returns P3 defaults', () => {
      const defaults = router.getDefaults();
      expect(defaults.limit).toBe(20);
      expect(defaults.maxLimit).toBe(50);
      expect(defaults.topN).toBe(5);
      expect(defaults.maxTopN).toBe(50);
      expect(defaults.monthsBack).toBe(6);
      expect(defaults.maxMonthsBack).toBe(24);
      expect(defaults.requireBuildingWhenMultiBuilding).toBe(true);
      expect(defaults.maxClarifications).toBe(2);
    });
  });

  describe('no knowledge fallback invariant', () => {
    it('never returns toolName that could fallback to knowledge', () => {
      const questions = [
        'dashboard',
        'cola de trabajo',
        'eficiencia',
        'deuda unitaria',
        'aging',
      ];
      for (const q of questions) {
        const result = router.route(q);
        if (result && typeof result === 'object' && 'toolName' in result) {
          expect((result as any).toolName).not.toBe('knowledge');
          expect((result as any).toolName).not.toBe('fallback');
        }
      }
    });
  });
});