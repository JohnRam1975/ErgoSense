import { describe, expect, it } from 'vitest';
import { calculateRosa, rosaFromWorkstation } from '../rosa';

describe('calculateRosa', () => {
  it('classifica aceitável quando média baixa', () => {
    const r = calculateRosa({
      chairScore: 2,
      monitorScore: 2,
      phonePeripheralsScore: 2,
      mouseKeyboardScore: 2,
    });
    expect(r.classification).toBe('aceitavel');
    expect(r.score).toBe(2);
  });

  it('classifica atenção quando média 3–4', () => {
    const r = calculateRosa({
      chairScore: 3,
      monitorScore: 4,
      phonePeripheralsScore: 3,
      mouseKeyboardScore: 3,
    });
    expect(r.classification).toBe('atencao');
    expect(r.classificationLabel).toBe('Atenção');
  });

  it('classifica intervenção quando média >= 5', () => {
    const r = calculateRosa({
      chairScore: 5,
      monitorScore: 6,
      phonePeripheralsScore: 5,
      mouseKeyboardScore: 5,
    });
    expect(r.classification).toBe('alto');
    expect(r.recommendation.length).toBeGreaterThan(0);
  });

  it('recomenda ajuste de monitor quando score >= 4', () => {
    const r = calculateRosa({
      chairScore: 2,
      monitorScore: 5,
      phonePeripheralsScore: 2,
      mouseKeyboardScore: 2,
    });
    expect(r.recommendation.some((x) => x.includes('monitor'))).toBe(true);
  });

  it('recomenda cadeira quando chairScore >= 4', () => {
    const r = calculateRosa({
      chairScore: 5,
      monitorScore: 2,
      phonePeripheralsScore: 2,
      mouseKeyboardScore: 2,
    });
    expect(r.recommendation.some((x) => x.includes('cadeira'))).toBe(true);
  });
});

describe('rosaFromWorkstation', () => {
  it('posto ideal gera ROSA aceitável', () => {
    const r = rosaFromWorkstation({
      telaDistanciaCm: 60,
      telaAltura: 'ideal',
      nivelLuz: 'adequada',
    });
    expect(r.methodId).toBe('rosa');
    expect(r.score).toBeLessThanOrEqual(3);
  });

  it('distância fora do ideal eleva score do monitor', () => {
    const r = rosaFromWorkstation({
      telaDistanciaCm: 40,
      telaAltura: 'baixa',
      nivelLuz: 'baixa',
    });
    expect(r.score).toBeGreaterThan(2);
  });
});
