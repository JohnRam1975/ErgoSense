/**
 * Planos SaaS — limites e validação
 */
import { query } from '../db.js';

const DEFAULT_PLAN = 'STARTER';

export async function listPlans() {
  const { rows } = await query(
    `SELECT codigo, nome, limite_usuarios, limite_empresas, limite_aet, limite_pgr,
            limite_gro, limite_ia, armazenamento_gb
     FROM planos WHERE ativo = TRUE ORDER BY limite_usuarios`,
  );
  return rows.map(mapPlanRow);
}

export async function getPlan(codigo = DEFAULT_PLAN) {
  const { rows } = await query(`SELECT * FROM planos WHERE codigo = $1 AND ativo = TRUE`, [
    codigo || DEFAULT_PLAN,
  ]);
  return rows[0] ? mapPlanRow(rows[0]) : null;
}

function mapPlanRow(r) {
  return {
    codigo: r.codigo,
    nome: r.nome,
    limiteUsuarios: r.limite_usuarios,
    limiteEmpresas: r.limite_empresas,
    limiteAet: r.limite_aet,
    limitePgr: r.limite_pgr,
    limiteGro: r.limite_gro,
    limiteIa: r.limite_ia,
    armazenamentoGb: r.armazenamento_gb,
  };
}

export async function validateTenantLimits(tenantId, resource) {
  const { rows } = await query(
    `SELECT t.plano_codigo,
            (SELECT COUNT(*)::int FROM usuarios u WHERE u.tenant_id = t.tenant_id AND u.deleted_at IS NULL) AS users,
            (SELECT COUNT(*)::int FROM aet_processos a WHERE a.tenant_id = t.tenant_id AND a.deleted_at IS NULL) AS aets,
            (SELECT COUNT(*)::int FROM pgr_versoes p WHERE p.tenant_id = t.tenant_id) AS pgrs
     FROM tenants t WHERE t.tenant_id = $1 AND t.deleted_at IS NULL`,
    [tenantId],
  );
  if (!rows.length) return { ok: false, error: 'Tenant não encontrado' };

  const plan = await getPlan(rows[0].plano_codigo);
  if (!plan) return { ok: true };

  const checks = {
    users: { current: rows[0].users, limit: plan.limiteUsuarios, label: 'usuários' },
    aet: { current: rows[0].aets, limit: plan.limiteAet, label: 'AETs' },
    pgr: { current: rows[0].pgrs, limit: plan.limitePgr, label: 'PGRs' },
  };

  const check = checks[resource];
  if (!check) return { ok: true };
  if (check.current >= check.limit) {
    return { ok: false, error: `Limite do plano ${plan.nome} atingido (${check.label}: ${check.limit})` };
  }
  return { ok: true, plan };
}
