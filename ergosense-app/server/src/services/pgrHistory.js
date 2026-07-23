import { query } from '../db.js';
import { historyDetailsJson, historyUserId, historyUserName } from '../utils/historyLog.js';

export async function logPgrHistory({ tenantId, versionId = null, action, user = null, details = null }) {
  await query(
    `INSERT INTO pgr_historico (tenant_id, versao_id, acao, usuario_id, usuario_nome, detalhes)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      tenantId,
      versionId,
      action,
      historyUserId(user),
      historyUserName(user),
      historyDetailsJson(details),
    ],
  );
}

export function mapPgrHistoryRow(row) {
  return {
    id: String(row.id),
    tenantId: row.tenant_id,
    versionId: row.versao_id ? String(row.versao_id) : null,
    versionNumber: row.numero ?? null,
    action: row.acao,
    userId: row.usuario_id ? String(row.usuario_id) : null,
    userName: row.usuario_nome,
    details: row.detalhes,
    createdAt: row.created_at,
  };
}
