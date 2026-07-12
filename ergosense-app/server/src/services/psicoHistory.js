import { query } from '../db.js';

export async function logPsicoHistory({ tenantId, action, user = null, details = null }) {
  await query(
    `INSERT INTO psico_historico (tenant_id, acao, usuario_id, usuario_nome, detalhes)
     VALUES ($1,$2,$3,$4,$5)`,
    [
      tenantId,
      action,
      user?.id ?? null,
      user?.name || user?.email || null,
      details ? JSON.stringify(details) : null,
    ],
  );
}

export function mapPsicoHistoryRow(row) {
  return {
    id: String(row.id),
    tenantId: row.tenant_id,
    action: row.acao,
    userId: row.usuario_id ? String(row.usuario_id) : null,
    userName: row.usuario_nome,
    details: row.detalhes,
    createdAt: row.created_at,
  };
}
