/**
 * Módulo 13 — Riscos ambientais NR-15, NHO-06, NHO-11
 */
import { NHO06_IBUTG_CELSIUS, NHO11_LUX, NR15_NOISE } from '../config/ergonomicCriteriaMaster';
import type { ErgonomicMethodResult } from '../methods/types';

export interface EnvironmentalInput {
  noiseDbA?: number;
  noiseHours?: number;
  ibutgCelsius?: number;
  workIntensity?: 'leve' | 'moderado' | 'pesado';
  lux?: number;
  environment?: 'escritorio' | 'industrial';
}

export function evaluateEnvironmental(input: EnvironmentalInput): ErgonomicMethodResult[] {
  const results: ErgonomicMethodResult[] = [];

  if (input.noiseDbA != null) {
    const limit = NR15_NOISE.find((r) => input.noiseDbA! <= r.dbA) ?? NR15_NOISE[NR15_NOISE.length - 1];
    const limitHours =
      'maxHours' in limit ? limit.maxHours : ('maxMinutes' in limit ? limit.maxMinutes / 60 : 0.5);
    const ok = input.noiseDbA <= 85 || (input.noiseHours ?? 8) <= limitHours;
    results.push({
      methodId: 'ruido_nr15',
      methodName: 'Ruído (NR-15)',
      score: input.noiseDbA,
      classification: ok ? 'aceitavel' : input.noiseDbA > 90 ? 'critico' : 'alto',
      classificationLabel: ok ? 'Dentro do limite' : 'Acima do limite',
      inputs: { dbA: input.noiseDbA, horas: input.noiseHours ?? 8 },
      outputs: { limiteHoras: limitHours },
      normReference: 'NR-15',
      recommendation: ok ? ['Exposição ao ruído dentro da NR-15.'] : ['Implementar proteção auditiva e higiene do trabalho.'],
    });
  }

  if (input.ibutgCelsius != null && input.workIntensity) {
    const ref = NHO06_IBUTG_CELSIUS[`trabalho_${input.workIntensity}` as keyof typeof NHO06_IBUTG_CELSIUS];
    const max = 'aceitavel_max' in ref ? ref.aceitavel_max : 30;
    const ok = input.ibutgCelsius <= max;
    results.push({
      methodId: 'calor_nho06',
      methodName: 'Calor (NHO-06)',
      score: input.ibutgCelsius,
      classification: ok ? 'aceitavel' : 'alto',
      classificationLabel: ok ? 'IBUTG aceitável' : 'IBUTG elevado',
      inputs: { ibutg: input.ibutgCelsius, intensidade: input.workIntensity },
      outputs: { limite: max },
      normReference: 'NHO-06 Fundacentro',
      recommendation: ok ? ['Ambiente térmico aceitável.'] : ['Pausas, hidratação e controle de IBUTG.'],
    });
  }

  if (input.lux != null) {
    const min =
      input.environment === 'escritorio' ? NHO11_LUX.escritorio_min : NHO11_LUX.industrial_min;
    const max = NHO11_LUX.industrial_max;
    const ok = input.lux >= min && input.lux <= max;
    results.push({
      methodId: 'iluminacao_nho11',
      methodName: 'Iluminação (NHO-11)',
      score: input.lux,
      classification: ok ? 'aceitavel' : input.lux < min ? 'atencao' : 'alto',
      classificationLabel: ok ? 'Adequada' : input.lux < min ? 'Baixa' : 'Excesso/reflexo',
      inputs: { lux: input.lux },
      outputs: { min, max },
      normReference: 'NHO-11 Fundacentro',
      recommendation: ok ? ['Iluminação conforme NHO-11.'] : ['Ajustar luminárias e reduzir reflexos na tela.'],
    });
  }

  return results;
}
