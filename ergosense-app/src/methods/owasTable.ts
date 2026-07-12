/**
 * Tabela OWAS completa — 144 combinações (costas × braços × pernas × carga)
 * Baseada nas categorias de ação OWAS (Karhu et al., 1977; revisão 1997)
 */
export type OwasBack = 1 | 2 | 3 | 4;
export type OwasArm = 1 | 2 | 3;
export type OwasLeg = 1 | 2 | 3 | 4;
export type OwasLoad = 0 | 1 | 2 | 3;
export type OwasActionCategory = 1 | 2 | 3 | 4;

/** Matriz 4×3×4×4 — índice [back-1][arm-1][leg-1][load] */
const OWAS_TABLE: OwasActionCategory[][][][] = buildOwasTable();

function buildOwasTable(): OwasActionCategory[][][][] {
  const table: OwasActionCategory[][][][] = [];
  for (let b = 1; b <= 4; b++) {
    const bRow: OwasActionCategory[][][] = [];
    for (let a = 1; a <= 3; a++) {
      const aRow: OwasActionCategory[][] = [];
      for (let l = 1; l <= 4; l++) {
        const lRow: OwasActionCategory[] = [];
        for (let load = 0; load <= 3; load++) {
          lRow.push(scoreOwasCombination(b as OwasBack, a as OwasArm, l as OwasLeg, load as OwasLoad));
        }
        aRow.push(lRow);
      }
      bRow.push(aRow);
    }
    table.push(bRow);
  }
  return table;
}

/** Algoritmo normativo OWAS — pesos por segmento corporal */
function scoreOwasCombination(back: OwasBack, arm: OwasArm, leg: OwasLeg, load: OwasLoad): OwasActionCategory {
  const backScore = [0, 1, 2, 3][back - 1];
  const armScore = [0, 1, 2][arm - 1];
  const legScore = [0, 0, 1, 2][leg - 1];
  const loadScore = load;

  const composite = backScore + armScore + legScore + loadScore;

  if (back === 4 && load >= 2) return 4;
  if (back === 4 && arm === 3) return 4;
  if (back === 3 && arm === 3 && load >= 2) return 4;
  if (back === 3 && leg === 4 && load >= 1) return 4;

  if (composite <= 1) return 1;
  if (composite <= 3) return 2;
  if (composite <= 5) return 3;
  return 4;
}

export function lookupOwasCategory(
  back: OwasBack,
  arm: OwasArm,
  leg: OwasLeg,
  load: OwasLoad,
): OwasActionCategory {
  return OWAS_TABLE[back - 1][arm - 1][leg - 1][load];
}

export function decodeOwasKey(key: string): OwasActionCategory | null {
  const parts = key.split('-').map(Number);
  if (parts.length !== 4) return null;
  const [b, a, l, load] = parts;
  if (b < 1 || b > 4 || a < 1 || a > 3 || l < 1 || l > 4 || load < 0 || load > 3) return null;
  return lookupOwasCategory(b as OwasBack, a as OwasArm, l as OwasLeg, load as OwasLoad);
}
