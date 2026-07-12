/**
 * Módulo 12 — Antropometria e percentis
 */
export interface AnthropometryProfile {
  heightCm: number;
  weightKg: number;
  sex: 'M' | 'F';
  age: number;
  percentiles: {
    stature: number;
    weight: number;
  };
  workstationSuggestions: string[];
}

export function computePercentiles(
  heightCm: number,
  weightKg: number,
  sex: 'M' | 'F',
  age: number,
): AnthropometryProfile['percentiles'] {
  const refH = sex === 'M' ? 175 : 162;
  const refW = sex === 'M' ? 78 : 65;
  const stature = Math.min(99, Math.max(5, Math.round(50 + ((heightCm - refH) / 15) * 25)));
  const weight = Math.min(99, Math.max(5, Math.round(50 + ((weightKg - refW) / 20) * 25)));
  void age;
  return { stature, weight };
}

export function suggestWorkstation(profile: AnthropometryProfile): string[] {
  const desk = Math.round(profile.heightCm * 0.46);
  const monitor = Math.round(profile.heightCm * 0.88);
  const chair = Math.round(profile.heightCm * 0.25);
  const tips: string[] = [
    `Altura sugerida da bancada: ${desk} cm (percentil estatura ${profile.percentiles.stature}%).`,
    `Topo do monitor próximo a ${monitor} cm do piso.`,
    `Altura do assento: ~${chair} cm.`,
  ];
  if (profile.percentiles.stature < 25) {
    tips.push('Colaborador abaixo do P25 — considerar mobiliário ajustável.');
  }
  if (profile.percentiles.stature > 75) {
    tips.push('Colaborador acima do P75 — extensor de monitor e mesa regulável.');
  }
  return tips;
}

export function buildAnthropometry(
  heightCm: number,
  weightKg: number,
  sex: 'M' | 'F',
  age: number,
): AnthropometryProfile {
  const percentiles = computePercentiles(heightCm, weightKg, sex, age);
  const base = { heightCm, weightKg, sex, age, percentiles, workstationSuggestions: [] as string[] };
  base.workstationSuggestions = suggestWorkstation(base);
  return base;
}
