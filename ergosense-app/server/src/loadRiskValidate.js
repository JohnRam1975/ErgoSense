/** Validação servidor — peso × distância (espelha calculateErgonomicLoadRisk) */

export function validateLoadEffortPayload(weightKg, distanceCm) {
  const w = Number(weightKg);
  const d = Number(distanceCm);
  if (!Number.isFinite(w) || w <= 0) {
    return { ok: false, error: 'Peso da carga inválido (deve ser > 0).' };
  }
  if (!Number.isFinite(d) || d <= 0) {
    return { ok: false, error: 'Distância inválida (deve ser > 0).' };
  }
  const indice = Math.round(w * d);
  let risk = 'baixo';
  if (indice <= 300) risk = 'baixo';
  else if (indice <= 700) risk = 'medio';
  else if (indice <= 1200) risk = 'alto';
  else risk = 'critico';
  return { ok: true, indiceEsforco: indice, risk, weightKg: w, distanceCm: d };
}
