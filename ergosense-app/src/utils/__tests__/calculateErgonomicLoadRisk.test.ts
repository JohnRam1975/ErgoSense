import { describe, expect, it } from 'vitest';
import {
  calculateErgonomicLoadRisk,
  LoadRiskValidationError,
  validateLoadInputs,
} from '../calculateErgonomicLoadRisk';

describe('calculateErgonomicLoadRisk', () => {
  it('peso 5 kg e distância 30 cm → baixo risco (índice 150)', () => {
    const r = calculateErgonomicLoadRisk(5, 30);
    expect(r.indiceEsforco).toBe(150);
    expect(r.risk).toBe('baixo');
  });

  it('peso 10 kg e distância 50 cm → médio risco (índice 500)', () => {
    const r = calculateErgonomicLoadRisk(10, 50);
    expect(r.indiceEsforco).toBe(500);
    expect(r.risk).toBe('medio');
  });

  it('peso 20 kg e distância 50 cm → alto risco (índice 1000)', () => {
    const r = calculateErgonomicLoadRisk(20, 50);
    expect(r.indiceEsforco).toBe(1000);
    expect(r.risk).toBe('alto');
  });

  it('peso 30 kg e distância 60 cm → risco crítico (índice 1800)', () => {
    const r = calculateErgonomicLoadRisk(30, 60);
    expect(r.indiceEsforco).toBe(1800);
    expect(r.risk).toBe('critico');
  });

  it('peso zero → erro', () => {
    expect(() => calculateErgonomicLoadRisk(0, 30)).toThrow(LoadRiskValidationError);
  });

  it('peso negativo → erro', () => {
    expect(() => validateLoadInputs(-1, 30)).toThrow(LoadRiskValidationError);
  });

  it('distância zero → erro', () => {
    expect(() => calculateErgonomicLoadRisk(10, 0)).toThrow(LoadRiskValidationError);
  });

  it('distância negativa → erro', () => {
    expect(() => validateLoadInputs(10, -5)).toThrow(LoadRiskValidationError);
  });

  it('valor decimal → cálculo correto', () => {
    const r = calculateErgonomicLoadRisk(12.5, 40);
    expect(r.weightKg).toBe(12.5);
    expect(r.distanceCm).toBe(40);
    expect(r.indiceEsforco).toBe(500);
    expect(r.risk).toBe('medio');
  });
});
