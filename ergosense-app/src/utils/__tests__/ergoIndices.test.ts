import { describe, expect, it } from 'vitest';
import { calculateErgoSenseIndices } from '../ergoIndices';
import type { Nr17ComplianceItem } from '../nr17';

const baseItems: Nr17ComplianceItem[] = [
  { id: 'postura', referencia: 'NR-17', titulo: 'Postura', status: 'conforme', detalhe: 'OK' },
  { id: 'mobiliario', referencia: 'NR-17', titulo: 'Mobiliário', status: 'nao_conforme', detalhe: 'Ajuste' },
  { id: 'contexto', referencia: 'NR-17', titulo: 'Contexto', status: 'conforme', detalhe: 'OK' },
];

describe('calculateErgoSenseIndices', () => {
  it('calcula índices dentro de 0–100', () => {
    const r = calculateErgoSenseIndices({
      ergoScore: 20,
      rula: 4,
      reba: 6,
      riskTimePct: 30,
      maxRiskStreakSecs: 120,
      items: baseItems,
    });
    expect(r.riskIndex).toBeGreaterThanOrEqual(0);
    expect(r.riskIndex).toBeLessThanOrEqual(100);
    expect(r.exposureIndex).toBeGreaterThanOrEqual(0);
    expect(r.internalConformityIndex).toBeGreaterThanOrEqual(0);
    expect(r.formulas).toBeDefined();
    expect(r.computedAt).toMatch(/^\d{4}-/);
  });

  it('penaliza carga via loadEffort', () => {
    const r = calculateErgoSenseIndices({
      ergoScore: 10,
      rula: 2,
      reba: 2,
      riskTimePct: 10,
      maxRiskStreakSecs: 30,
      items: baseItems,
      loadEffort: {
        weightKg: 20,
        distanceCm: 60,
        distanceM: 0.6,
        indiceEsforco: 80,
        risk: 'alto',
        recomendacao: 'Reduzir carga',
        calculatedAt: '2026-01-01T00:00:00.000Z',
      },
    });
    const base = calculateErgoSenseIndices({
      ergoScore: 10,
      rula: 2,
      reba: 2,
      riskTimePct: 10,
      maxRiskStreakSecs: 30,
      items: baseItems,
    });
    expect(r.riskIndex).toBeLessThan(base.riskIndex);
  });

  it('usa nioshLi quando informado', () => {
    const r = calculateErgoSenseIndices({
      ergoScore: 15,
      rula: 3,
      reba: 4,
      riskTimePct: 20,
      maxRiskStreakSecs: 60,
      items: baseItems,
      nioshLi: 2.5,
    });
    expect(r.exposureBand).toBeDefined();
    expect(r.riskIndex).toBeGreaterThanOrEqual(0);
    expect(r.exposureIndex).toBeLessThanOrEqual(100);
  });

  it('classifica bands para scores extremos', () => {
    const low = calculateErgoSenseIndices({
      ergoScore: 5,
      rula: 1,
      reba: 1,
      riskTimePct: 5,
      maxRiskStreakSecs: 10,
      items: [{ id: 'a', referencia: 'NR-17', titulo: 'A', status: 'conforme', detalhe: 'OK' }],
    });
    const high = calculateErgoSenseIndices({
      ergoScore: 90,
      rula: 7,
      reba: 15,
      riskTimePct: 95,
      maxRiskStreakSecs: 600,
      items: [
        { id: 'a', referencia: 'NR-17', titulo: 'A', status: 'nao_conforme', detalhe: 'X' },
        { id: 'b', referencia: 'NR-17', titulo: 'B', status: 'nao_conforme', detalhe: 'X' },
        { id: 'c', referencia: 'NR-17', titulo: 'C', status: 'atencao', detalhe: 'X' },
      ],
    });
    expect(low.riskIndex).toBeGreaterThan(high.riskIndex);
  });
});
