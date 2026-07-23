/**
 * Trilha de auditoria GRO — histórico persistido
 */
import { query } from '../db.js';
import { historyDetailsJson, historyUserId, historyUserName } from '../utils/historyLog.js';

export async function logGroHistory({
  tenantId,
  riskId = null,
  actionPlanId = null,
  indicatorId = null,
  stage = null,
  action,
  user = null,
  details = null,
}) {
  await query(
    `INSERT INTO gro_historico (
       tenant_id, inventario_risco_id, plano_acao_id, indicador_id,
       etapa, acao, usuario_id, usuario_nome, detalhes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      tenantId,
      riskId,
      actionPlanId,
      indicatorId,
      stage,
      action,
      historyUserId(user),
      historyUserName(user),
      historyDetailsJson(details),
    ],
  );
}

export function mapHistoryRow(row) {
  return {
    id: String(row.id),
    tenantId: row.tenant_id,
    riskId: row.inventario_risco_id ? String(row.inventario_risco_id) : null,
    actionPlanId: row.plano_acao_id ? String(row.plano_acao_id) : null,
    indicatorId: row.indicador_id ? String(row.indicador_id) : null,
    stage: row.etapa,
    action: row.acao,
    userId: row.usuario_id ? String(row.usuario_id) : null,
    userName: row.usuario_nome,
    details: row.detalhes,
    createdAt: row.created_at,
    riskHazard: row.risco_perigo ?? null,
  };
}
