import { describe, expect, it } from 'vitest';
import { formatDateTime, timeRemaining } from '../datetime';

describe('formatDateTime', () => {
  it('retorna traço para null', () => {
    expect(formatDateTime(null)).toBe('—');
  });

  it('formata ISO em pt-BR', () => {
    const s = formatDateTime('2026-01-15T14:30:00.000Z');
    expect(s).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});

describe('timeRemaining', () => {
  it('retorna Expirado para data passada', () => {
    expect(timeRemaining('2000-01-01T00:00:00.000Z')).toBe('Expirado');
  });

  it('retorna horas para prazo futuro', () => {
    const future = new Date(Date.now() + 7200000).toISOString();
    expect(timeRemaining(future)).toMatch(/\d+h/);
  });
});
