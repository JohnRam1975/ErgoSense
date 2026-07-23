/** Escala ombro → cm e geometria 2D para distância de carga */

export const REF_SHOULDER_WIDTH_CM = 42;

export function dist2d(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Converte distância normalizada (0–1 no frame) para cm via escala dos ombros */
export function normToCm(normDist: number, shoulderWidthNorm: number, minCm = 0): number {
  if (shoulderWidthNorm <= 0.05) return 0;
  const cm = Math.round((normDist / shoulderWidthNorm) * REF_SHOULDER_WIDTH_CM);
  return minCm > 0 ? Math.max(minCm, cm) : cm;
}
