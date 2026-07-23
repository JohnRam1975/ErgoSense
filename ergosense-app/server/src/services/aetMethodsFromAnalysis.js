/**
 * Importa métodos posturais/carga a partir dos resultados de uma análise (RULA/REBA/V2).
 * Usado por rotas AET e pela geração automática de AET.
 */
import { query } from '../db.js';

/**
 * @param {string} tenantId
 * @param {number} analysisId
 * @param {{ query: Function } | null} [dbClient] cliente de transação opcional
 * @returns {Promise<object|null>}
 */
export async function importMethodsFromAnalysis(tenantId, analysisId, dbClient = null) {
  const run = dbClient?.query?.bind(dbClient) ?? query;
  const { rows } = await run(
    `SELECT r.rula, r.reba, r.angulos_json, r.nr17_report_json
     FROM resultados_ia r
     WHERE r.analise_id = $1 AND r.tenant_id = $2`,
    [analysisId, tenantId],
  );
  if (!rows[0]) return null;

  let v2 = null;
  try {
    const v2Res = await run(
      `SELECT v2_report_json FROM analises WHERE id = $1 AND tenant_id = $2`,
      [analysisId, tenantId],
    );
    v2 = v2Res.rows[0]?.v2_report_json ?? null;
  } catch {
    /* coluna opcional */
  }

  const methods = {};
  if (rows[0].rula != null) {
    methods.rula = { score: rows[0].rula, source: 'analise_ia', norma: 'RULA McAtamney 1993' };
  }
  if (rows[0].reba != null) {
    methods.reba = { score: rows[0].reba, source: 'analise_ia', norma: 'REBA Hignett 2000' };
  }
  if (v2?.methods) {
    for (const m of v2.methods) {
      if (m.methodId === 'owas') {
        methods.owas = {
          owasClass: m.score,
          classificationLabel: m.classificationLabel,
          source: 'v2',
          norma: 'OWAS Karhu 1977',
        };
      }
      if (m.methodId === 'niosh') {
        methods.niosh = {
          rwl: m.outputs?.RWL,
          liftingIndex: m.outputs?.LI,
          source: 'v2',
          norma: 'NIOSH RNLE 1991',
        };
      }
      if (m.methodId === 'rula' && !methods.rula) {
        methods.rula = { score: m.score, classificationLabel: m.classificationLabel, source: 'v2' };
      }
      if (m.methodId === 'reba' && !methods.reba) {
        methods.reba = { score: m.score, classificationLabel: m.classificationLabel, source: 'v2' };
      }
    }
  }
  methods.angles = rows[0].angulos_json;
  return methods;
}
