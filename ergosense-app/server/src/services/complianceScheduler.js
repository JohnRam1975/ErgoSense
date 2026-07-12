/**
 * Agendador de varreduras regulatórias — arquitetura para monitoramento diário
 * REGRA: nunca aplica regras; apenas detecta e registra para validação humana.
 */
import { query } from '../db.js';
import { runComplianceScan } from './complianceMonitor.js';
import { ensureComplianceFontes, logComplianceHistory } from './complianceUtils.js';

const CHECK_INTERVAL_MS = Number(process.env.COMPLIANCE_SCHEDULER_INTERVAL_MS) || 60 * 60 * 1000;
const SCHEDULER_USER = { name: 'Compliance Scheduler', email: 'scheduler@ergosense.local' };

let schedulerTimer = null;

export async function ensureComplianceSchedule(tenantId) {
  await query(
    `INSERT INTO compliance_agendamentos (tenant_id, ativo, intervalo_horas, proxima_execucao)
     VALUES ($1, TRUE, 24, NOW() + INTERVAL '24 hours')
     ON CONFLICT (tenant_id) DO NOTHING`,
    [tenantId],
  );
}

export async function getComplianceSchedule(tenantId) {
  await ensureComplianceSchedule(tenantId);
  const { rows } = await query(`SELECT * FROM compliance_agendamentos WHERE tenant_id = $1`, [tenantId]);
  return rows[0] ? mapSchedule(rows[0]) : null;
}

export async function updateComplianceSchedule(tenantId, { active, intervalHours }) {
  await ensureComplianceSchedule(tenantId);
  const { rows } = await query(
    `UPDATE compliance_agendamentos SET
       ativo = COALESCE($2, ativo),
       intervalo_horas = COALESCE($3, intervalo_horas),
       proxima_execucao = CASE WHEN $3 IS NOT NULL THEN NOW() + ($3 || ' hours')::INTERVAL ELSE proxima_execucao END,
       updated_at = NOW()
     WHERE tenant_id = $1 RETURNING *`,
    [tenantId, active ?? null, intervalHours ?? null],
  );
  return mapSchedule(rows[0]);
}

export function mapSchedule(row) {
  return {
    tenantId: row.tenant_id,
    active: row.ativo,
    intervalHours: row.intervalo_horas,
    preferredTime: row.horario_preferido,
    lastRun: row.ultima_execucao,
    nextRun: row.proxima_execucao,
    lastResult: row.ultimo_resultado,
    updatedAt: row.updated_at,
  };
}

export function mapScanRun(row) {
  return {
    id: String(row.id),
    type: row.tipo,
    sources: row.fontes ?? [],
    detected: row.detectadas,
    duplicates: row.duplicadas,
    status: row.status,
    durationMs: row.duracao_ms,
    startedAt: row.iniciada_em,
    finishedAt: row.concluida_em,
    details: row.detalhes_json ?? {},
  };
}

async function tenantsDueForScan() {
  const { rows } = await query(
    `SELECT a.tenant_id, a.intervalo_horas
     FROM compliance_agendamentos a
     WHERE a.ativo = TRUE
       AND (a.proxima_execucao IS NULL OR a.proxima_execucao <= NOW())`,
  );
  return rows;
}

async function markScheduleRun(tenantId, intervalHours, result, success) {
  await query(
    `UPDATE compliance_agendamentos SET
       ultima_execucao = NOW(),
       proxima_execucao = NOW() + ($2 || ' hours')::INTERVAL,
       ultimo_resultado = $3,
       updated_at = NOW()
     WHERE tenant_id = $1`,
    [tenantId, intervalHours, success ? `OK:${result.newDetections ?? 0}` : 'ERRO'],
  );
}

export async function runScheduledScansForAllTenants() {
  const due = await tenantsDueForScan();
  const results = [];

  for (const row of due) {
    try {
      await ensureComplianceFontes(row.tenant_id);
      const { rows: fontes } = await query(
        `SELECT codigo FROM compliance_fontes WHERE tenant_id = $1 AND ativo = TRUE`,
        [row.tenant_id],
      );
      const sources = fontes.map((f) => f.codigo);
      const result = await runComplianceScan(row.tenant_id, SCHEDULER_USER, {
        fontes: sources.length ? sources : undefined,
        scanType: 'AGENDADA',
      });
      await markScheduleRun(row.tenant_id, row.intervalo_horas, result, true);
      results.push({ tenantId: row.tenant_id, ...result, ok: true });
    } catch (err) {
      await markScheduleRun(row.tenant_id, row.intervalo_horas, {}, false);
      results.push({ tenantId: row.tenant_id, ok: false, error: err.message });
      console.warn('complianceScheduler:', row.tenant_id, err.message);
    }
  }

  if (results.length) {
    console.log(JSON.stringify({ level: 'info', msg: 'compliance_scheduled_scans', count: results.length, results }));
  }
  return results;
}

export function startComplianceScheduler() {
  if (process.env.COMPLIANCE_SCHEDULER_ENABLED === 'false') {
    console.log(JSON.stringify({ level: 'info', msg: 'compliance_scheduler_disabled' }));
    return;
  }
  if (schedulerTimer) return;

  const run = () => {
    runScheduledScansForAllTenants().catch((err) => {
      console.warn('complianceScheduler tick:', err.message);
    });
  };

  setTimeout(run, 15000);
  schedulerTimer = setInterval(run, CHECK_INTERVAL_MS);
  console.log(JSON.stringify({ level: 'info', msg: 'compliance_scheduler_started', intervalMs: CHECK_INTERVAL_MS }));
}

export function stopComplianceScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}
