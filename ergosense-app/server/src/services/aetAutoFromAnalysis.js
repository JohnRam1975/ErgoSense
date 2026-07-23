/**
 * Gera AET automaticamente a partir de uma análise concluída (NR-17).
 * Idempotente: se já existir processo com o mesmo analise_id, reutiliza.
 */
import { query } from '../db.js';
import { sanitizePlainText } from '../auth/sanitize.js';
import { buildAetNormativeReport } from './aetReport.js';
import { logAetHistory, mapProcesso } from './aetUtils.js';
import { importMethodsFromAnalysis } from './aetMethodsFromAnalysis.js';
import { integrateFromAet } from './riskIntegrationHub.js';

/**
 * @param {object} opts
 * @param {string} opts.tenantId
 * @param {number|string} opts.analiseId
 * @param {object} [opts.analysis] payload da análise (activity, collaboratorName, etc.)
 * @param {object} [opts.user]
 * @param {import('pg').PoolClient} [opts.client] cliente da mesma transação (opcional)
 * @param {boolean} [opts.generateReport=true]
 * @returns {Promise<{ processId: string, reportGenerated: boolean, created: boolean } | null>}
 */
export async function createAetFromAnalysis({
  tenantId,
  analiseId,
  analysis = {},
  user = null,
  client = null,
  generateReport = true,
}) {
  const run = client ? client.query.bind(client) : query;
  const idNum = Number(analiseId);
  if (!tenantId || !idNum) return null;

  const existing = await run(
    `SELECT id FROM aet_processos
     WHERE tenant_id = $1 AND analise_id = $2 AND deleted_at IS NULL
     ORDER BY id DESC LIMIT 1`,
    [tenantId, idNum],
  );
  if (existing.rows[0]) {
    return {
      processId: String(existing.rows[0].id),
      reportGenerated: false,
      created: false,
    };
  }

  const activity = sanitizePlainText(analysis.activity ?? analysis.atividade ?? 'Atividade', 200);
  const collabName = sanitizePlainText(analysis.collaboratorName ?? '', 200);
  const title = sanitizePlainText(
    `AET automática — ${activity}${collabName ? ` · ${collabName}` : ''}`,
    512,
  );

  const { rows } = await run(
    `INSERT INTO aet_processos (tenant_id, titulo, colaborador_id, setor_id, analise_id, elaborado_por, caracterizacao_json, status, etapa_atual)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'EM_ANDAMENTO','METODOS_POSTURAIS') RETURNING *`,
    [
      tenantId,
      title,
      analysis.collaboratorId != null ? Number(analysis.collaboratorId) : null,
      analysis.sectorId != null ? Number(analysis.sectorId) : null,
      idNum,
      sanitizePlainText(user?.name ?? user?.email ?? 'Sistema ErgoSense', 255),
      JSON.stringify({
        origem: 'auto_analise',
        analiseId: idNum,
        activity,
        geradoEm: new Date().toISOString(),
      }),
    ],
  );

  const processRow = rows[0];
  const processId = processRow.id;

  await logAetHistory({
    tenantId,
    processoId: processId,
    action: 'PROCESSO_AUTO_CRIADO',
    stage: 'METODOS_POSTURAIS',
    user,
    details: { analiseId: idNum, origem: 'createAnalysis' },
  });

  try {
    const methods = await importMethodsFromAnalysis(tenantId, idNum, client);
    if (methods) {
      await run(`UPDATE aet_processos SET metodos_json = $1, updated_at = NOW() WHERE id = $2`, [
        JSON.stringify(methods),
        processId,
      ]);
    }
  } catch (err) {
    console.warn(JSON.stringify({ level: 'warn', msg: 'aet_auto_import_methods_failed', error: err.message }));
  }

  let reportGenerated = false;
  if (generateReport) {
    try {
      const full = await run(`SELECT * FROM aet_processos WHERE id = $1`, [processId]);
      const proc = mapProcesso(full.rows[0]);
      const report = buildAetNormativeReport(proc, { furniture: [], equipment: [] });
      await run(`UPDATE aet_processos SET relatorio_json = $1, updated_at = NOW() WHERE id = $2`, [
        JSON.stringify(report),
        processId,
      ]);
      await logAetHistory({
        tenantId,
        processoId: processId,
        action: 'RELATORIO_AUTO_GERADO',
        user,
        details: { analiseId: idNum },
      });
      reportGenerated = true;
      try {
        await integrateFromAet(client, tenantId, processId, user);
      } catch (e) {
        console.warn(JSON.stringify({ level: 'warn', msg: 'integrate_from_aet_auto_failed', error: e.message }));
      }
    } catch (err) {
      console.warn(JSON.stringify({ level: 'warn', msg: 'aet_auto_report_failed', error: err.message }));
    }
  }

  return { processId: String(processId), reportGenerated, created: true };
}
