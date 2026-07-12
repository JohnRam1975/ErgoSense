import { describe, expect, it } from 'vitest';
import { riskBadgeClass, riskLabel } from '../ergonomics';

describe('ergonomics helpers', () => {
  it('riskLabel — níveis conhecidos', () => {
    expect(riskLabel('critico')).toBe('Crítico');
    expect(riskLabel('alto')).toBe('Alto');
    expect(riskLabel('medio')).toBe('Médio');
    expect(riskLabel('baixo')).toBe('Baixo');
  });

  it('riskBadgeClass — retorna classe CSS', () => {
    expect(riskBadgeClass('critico')).toBe('bc');
    expect(riskBadgeClass('baixo')).toBe('bl');
  });
});
