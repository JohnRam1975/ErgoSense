/**
 * Estrutura Organizacional NR-01 — utilitários, resolução de cadeia e migração de dados
 */
import { query } from '../db.js';

const CHAIN_FROM_POSTO = `
  SELECT
    e.id AS empresa_id, e.razao_social AS empresa_nome,
    u.id AS unidade_id, u.nome AS unidade_nome,
    s.id AS setor_id, s.nome AS setor_nome,
    f.id AS funcao_id, f.nome AS funcao_nome,
    a.id AS atividade_id, a.nome AS atividade_nome,
    p.id AS posto_id, p.nome AS posto_nome
  FROM postos_trabalho p
  JOIN atividades a ON a.id = p.atividade_id AND a.deleted_at IS NULL
  JOIN funcoes f ON f.id = a.funcao_id AND f.deleted_at IS NULL
  JOIN setores s ON s.id = f.setor_id AND s.deleted_at IS NULL
  JOIN unidades u ON u.id = s.unidade_id AND u.deleted_at IS NULL
  JOIN empresas e ON e.id = u.empresa_id AND e.deleted_at IS NULL
  WHERE p.id = $1 AND p.tenant_id = $2 AND p.deleted_at IS NULL
`;

export function mapEmpresa(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    tenantId: row.tenant_id,
    legalName: row.razao_social,
    tradeName: row.nome_fantasia ?? null,
    cnpj: row.cnpj ?? null,
    stateRegistration: row.inscricao_estadual ?? null,
    active: row.ativo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapUnidade(row) {
  return {
    id: String(row.id),
    tenantId: row.tenant_id,
    companyId: String(row.empresa_id),
    name: row.nome,
    type: row.tipo,
    cnpj: row.cnpj ?? null,
    address: row.endereco ?? null,
    city: row.cidade ?? null,
    state: row.uf ?? null,
    active: row.ativo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSetor(row) {
  return {
    id: String(row.id),
    tenantId: row.tenant_id,
    unitId: row.unidade_id ? String(row.unidade_id) : null,
    unitName: row.unidade_nome ?? null,
    name: row.nome,
    description: row.descricao ?? null,
    manager: row.responsavel ?? null,
    active: row.ativo ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapFuncao(row) {
  return {
    id: String(row.id),
    tenantId: row.tenant_id,
    sectorId: String(row.setor_id),
    sectorName: row.setor_nome ?? null,
    name: row.nome,
    description: row.descricao ?? null,
    cbo: row.cbo ?? null,
    active: row.ativo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAtividade(row) {
  return {
    id: String(row.id),
    tenantId: row.tenant_id,
    functionId: String(row.funcao_id),
    functionName: row.funcao_nome ?? null,
    name: row.nome,
    description: row.descricao ?? null,
    frequency: row.frequencia ?? null,
    durationMinutes: row.duracao_minutos ?? null,
    active: row.ativo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPosto(row) {
  return {
    id: String(row.id),
    tenantId: row.tenant_id,
    activityId: String(row.atividade_id),
    activityName: row.atividade_nome ?? null,
    name: row.nome,
    description: row.descricao ?? null,
    location: row.localizacao ?? null,
    workstationType: row.tipo_posto ?? null,
    active: row.ativo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapOrgChain(row) {
  if (!row) return null;
  return {
    companyId: row.empresa_id ? String(row.empresa_id) : null,
    companyName: row.empresa_nome ?? null,
    unitId: row.unidade_id ? String(row.unidade_id) : null,
    unitName: row.unidade_nome ?? null,
    sectorId: row.setor_id ? String(row.setor_id) : null,
    sectorName: row.setor_nome ?? null,
    functionId: row.funcao_id ? String(row.funcao_id) : null,
    functionName: row.funcao_nome ?? null,
    activityId: row.atividade_id ? String(row.atividade_id) : null,
    activityName: row.atividade_nome ?? null,
    workPostId: row.posto_id ? String(row.posto_id) : null,
    workPostName: row.posto_nome ?? null,
  };
}

export async function ensureEmpresaUnidade(runQuery, tenantId) {
  const q = runQuery ?? query;
  let { rows: empRows } = await q(
    `SELECT e.* FROM empresas e WHERE e.tenant_id = $1 AND e.deleted_at IS NULL`,
    [tenantId],
  );
  if (!empRows.length) {
    const { rows: tRows } = await q(
      `SELECT nome FROM tenants WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    const nome = tRows[0]?.nome ?? tenantId;
    const ins = await q(
      `INSERT INTO empresas (tenant_id, razao_social, nome_fantasia, ativo)
       VALUES ($1, $2, $2, TRUE)
       ON CONFLICT (tenant_id) DO NOTHING
       RETURNING *`,
      [tenantId, nome],
    );
    if (ins.rows.length) {
      empRows = ins.rows;
    } else {
      const retry = await q(
        `SELECT e.* FROM empresas e WHERE e.tenant_id = $1 AND e.deleted_at IS NULL`,
        [tenantId],
      );
      empRows = retry.rows;
    }
  }

  let { rows: unRows } = await q(
    `SELECT * FROM unidades WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY CASE tipo WHEN 'MATRIZ' THEN 0 ELSE 1 END, id LIMIT 1`,
    [tenantId],
  );
  if (!unRows.length) {
    const ins = await q(
      `INSERT INTO unidades (tenant_id, empresa_id, nome, tipo, ativo)
       VALUES ($1, $2, 'Matriz', 'MATRIZ', TRUE)
       ON CONFLICT (tenant_id, nome) DO NOTHING
       RETURNING *`,
      [tenantId, empRows[0].id],
    );
    if (ins.rows.length) {
      unRows = ins.rows;
    } else {
      const retry = await q(
        `SELECT * FROM unidades WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY CASE tipo WHEN 'MATRIZ' THEN 0 ELSE 1 END, id LIMIT 1`,
        [tenantId],
      );
      unRows = retry.rows;
    }
  }

  await q(
    `UPDATE setores SET unidade_id = $1, updated_at = NOW()
     WHERE tenant_id = $2 AND unidade_id IS NULL AND deleted_at IS NULL`,
    [unRows[0].id, tenantId],
  );

  return { empresa: empRows[0], unidade: unRows[0] };
}

async function getOrCreateFuncao(q, tenantId, setorId, nome) {
  const { rows } = await q(
    `INSERT INTO funcoes (tenant_id, setor_id, nome, ativo)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (tenant_id, setor_id, nome) DO UPDATE SET updated_at = NOW()
     RETURNING id`,
    [tenantId, setorId, nome],
  );
  return rows[0].id;
}

async function getOrCreateAtividade(q, tenantId, funcaoId, nome) {
  const { rows } = await q(
    `INSERT INTO atividades (tenant_id, funcao_id, nome, ativo)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (tenant_id, funcao_id, nome) DO UPDATE SET updated_at = NOW()
     RETURNING id`,
    [tenantId, funcaoId, nome],
  );
  return rows[0].id;
}

async function getOrCreatePosto(q, tenantId, atividadeId, nome) {
  const { rows } = await q(
    `INSERT INTO postos_trabalho (tenant_id, atividade_id, nome, ativo)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (tenant_id, atividade_id, nome) DO UPDATE SET updated_at = NOW()
     RETURNING id`,
    [tenantId, atividadeId, nome],
  );
  return rows[0].id;
}

export async function ensureOrgChainForSetor(runQuery, tenantId, setorId, label = 'geral') {
  const q = runQuery ?? query;
  if (!setorId) return null;

  await ensureEmpresaUnidade(q, tenantId);

  const funcaoNome = `Função ${label}`;
  const atividadeNome = `Atividade ${label}`;
  const postoNome = `Posto ${label}`;

  const funcaoId = await getOrCreateFuncao(q, tenantId, setorId, funcaoNome);
  const atividadeId = await getOrCreateAtividade(q, tenantId, funcaoId, atividadeNome);
  const postoId = await getOrCreatePosto(q, tenantId, atividadeId, postoNome);

  const { rows } = await q(CHAIN_FROM_POSTO, [postoId, tenantId]);
  return mapOrgChain(rows[0]);
}

export async function ensureOrgForCollaborator(runQuery, tenantId, { setorId, cargo, matricula }) {
  const q = runQuery ?? query;
  if (!setorId) return null;

  const funcaoNome = (cargo || 'Colaborador').trim();
  const atividadeNome = `Operação — ${funcaoNome}`;
  const postoNome = `Posto ${matricula || funcaoNome}`.slice(0, 255);

  const funcaoId = await getOrCreateFuncao(q, tenantId, setorId, funcaoNome);
  const atividadeId = await getOrCreateAtividade(q, tenantId, funcaoId, atividadeNome);
  const postoId = await getOrCreatePosto(q, tenantId, atividadeId, postoNome);

  await q(
    `UPDATE colaboradores SET funcao_id = $1, posto_trabalho_id = $2, updated_at = NOW()
     WHERE tenant_id = $3 AND matricula = $4 AND deleted_at IS NULL`,
    [funcaoId, postoId, tenantId, matricula],
  );

  const { rows } = await q(CHAIN_FROM_POSTO, [postoId, tenantId]);
  return mapOrgChain(rows[0]);
}

export async function getChainFromPosto(runQuery, tenantId, postoId) {
  const q = runQuery ?? query;
  if (!postoId) return null;
  const { rows } = await q(CHAIN_FROM_POSTO, [postoId, tenantId]);
  return mapOrgChain(rows[0]);
}

export async function resolveOrgForRisk(runQuery, tenantId, { postoId, collaboratorId, sectorId, functionId, activityId, unitId }) {
  const q = runQuery ?? query;

  if (postoId) {
    const chain = await getChainFromPosto(q, tenantId, postoId);
    if (chain) return chain;
  }

  if (collaboratorId) {
    const { rows } = await q(
      `SELECT c.posto_trabalho_id, c.funcao_id, c.setor_id, c.cargo, c.matricula
       FROM colaboradores c WHERE c.id = $1 AND c.tenant_id = $2 AND c.deleted_at IS NULL`,
      [collaboratorId, tenantId],
    );
    const col = rows[0];
    if (col?.posto_trabalho_id) {
      const chain = await getChainFromPosto(q, tenantId, col.posto_trabalho_id);
      if (chain) return chain;
    }
    if (col?.setor_id) {
      const chain = await ensureOrgForCollaborator(q, tenantId, {
        setorId: col.setor_id,
        cargo: col.cargo,
        matricula: col.matricula,
      });
      if (chain) return chain;
    }
  }

  const sid = sectorId ?? null;
  if (sid) {
    const { rows: sRows } = await q(
      `SELECT nome FROM setores WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [sid, tenantId],
    );
    const chain = await ensureOrgChainForSetor(q, tenantId, sid, sRows[0]?.nome ?? 'setor');
    if (chain) return chain;
  }

  if (unitId || functionId || activityId) {
    await ensureEmpresaUnidade(q, tenantId);
    return {
      unitId: unitId ? String(unitId) : null,
      sectorId: sectorId ? String(sectorId) : null,
      functionId: functionId ? String(functionId) : null,
      activityId: activityId ? String(activityId) : null,
      workPostId: postoId ? String(postoId) : null,
    };
  }

  return null;
}

export async function buildOrgTree(tenantId) {
  await ensureEmpresaUnidade(query, tenantId);

  const { rows: empRows } = await query(
    `SELECT * FROM empresas WHERE tenant_id = $1 AND deleted_at IS NULL`,
    [tenantId],
  );
  const empresa = mapEmpresa(empRows[0]);

  const { rows: unidades } = await query(
    `SELECT * FROM unidades WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY nome`,
    [tenantId],
  );

  const { rows: setores } = await query(
    `SELECT s.*, u.nome AS unidade_nome FROM setores s
     LEFT JOIN unidades u ON u.id = s.unidade_id
     WHERE s.tenant_id = $1 AND s.deleted_at IS NULL ORDER BY s.nome`,
    [tenantId],
  );

  const { rows: funcoes } = await query(
    `SELECT f.*, s.nome AS setor_nome FROM funcoes f
     JOIN setores s ON s.id = f.setor_id
     WHERE f.tenant_id = $1 AND f.deleted_at IS NULL ORDER BY f.nome`,
    [tenantId],
  );

  const { rows: atividades } = await query(
    `SELECT a.*, f.nome AS funcao_nome FROM atividades a
     JOIN funcoes f ON f.id = a.funcao_id
     WHERE a.tenant_id = $1 AND a.deleted_at IS NULL ORDER BY a.nome`,
    [tenantId],
  );

  const { rows: postos } = await query(
    `SELECT p.*, a.nome AS atividade_nome FROM postos_trabalho p
     JOIN atividades a ON a.id = p.atividade_id
     WHERE p.tenant_id = $1 AND p.deleted_at IS NULL ORDER BY p.nome`,
    [tenantId],
  );

  const { rows: colabStats } = await query(
    `SELECT posto_trabalho_id, COUNT(*)::int AS total
     FROM colaboradores WHERE tenant_id = $1 AND deleted_at IS NULL AND posto_trabalho_id IS NOT NULL
     GROUP BY posto_trabalho_id`,
    [tenantId],
  );
  const colabByPosto = Object.fromEntries(colabStats.map((r) => [String(r.posto_trabalho_id), r.total]));

  const { rows: riskStats } = await query(
    `SELECT posto_trabalho_id, COUNT(*)::int AS total
     FROM inventario_riscos WHERE tenant_id = $1 AND deleted_at IS NULL AND posto_trabalho_id IS NOT NULL
     GROUP BY posto_trabalho_id`,
    [tenantId],
  );
  const riskByPosto = Object.fromEntries(riskStats.map((r) => [String(r.posto_trabalho_id), r.total]));

  const tree = unidades.map((u) => ({
    ...mapUnidade(u),
    sectors: setores
      .filter((s) => s.unidade_id === u.id)
      .map((s) => ({
        ...mapSetor(s),
        functions: funcoes
          .filter((f) => f.setor_id === s.id)
          .map((f) => ({
            ...mapFuncao(f),
            activities: atividades
              .filter((a) => a.funcao_id === f.id)
              .map((a) => ({
                ...mapAtividade(a),
                workPosts: postos
                  .filter((p) => p.atividade_id === a.id)
                  .map((p) => ({
                    ...mapPosto(p),
                    collaboratorsCount: colabByPosto[String(p.id)] ?? 0,
                    risksCount: riskByPosto[String(p.id)] ?? 0,
                  })),
              })),
          })),
      })),
  }));

  const { rows: orphanSetores } = await query(
    `SELECT s.*, u.nome AS unidade_nome FROM setores s
     LEFT JOIN unidades u ON u.id = s.unidade_id
     WHERE s.tenant_id = $1 AND s.deleted_at IS NULL AND s.unidade_id IS NULL`,
    [tenantId],
  );

  const { rows: colabTotal } = await query(
    `SELECT COUNT(*)::int AS total FROM colaboradores WHERE tenant_id = $1 AND deleted_at IS NULL`,
    [tenantId],
  );

  return {
    company: empresa,
    units: tree,
    orphanSectors: orphanSetores.map(mapSetor),
    stats: {
      units: unidades.length,
      sectors: setores.length,
      functions: funcoes.length,
      activities: atividades.length,
      workPosts: postos.length,
      collaborators: colabTotal[0]?.total ?? 0,
    },
  };
}

export async function migrateExistingOrganizationalData(runQuery) {
  const q = runQuery ?? query;
  const { rows: tenants } = await q(
    `SELECT tenant_id, nome FROM tenants WHERE deleted_at IS NULL AND tenant_id <> 'ergosense'`,
  );

  let migratedTenants = 0;
  let migratedCollabs = 0;
  let migratedRisks = 0;

  for (const t of tenants) {
    await ensureEmpresaUnidade(q, t.tenant_id);
    migratedTenants += 1;

    const { rows: setores } = await q(
      `SELECT id, nome FROM setores WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [t.tenant_id],
    );
    for (const s of setores) {
      await ensureOrgChainForSetor(q, t.tenant_id, s.id, s.nome);
    }

    const { rows: colabs } = await q(
      `SELECT id, setor_id, cargo, matricula, posto_trabalho_id FROM colaboradores
       WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [t.tenant_id],
    );
    for (const c of colabs) {
      if (c.posto_trabalho_id || !c.setor_id) continue;
      await ensureOrgForCollaborator(q, t.tenant_id, {
        setorId: c.setor_id,
        cargo: c.cargo,
        matricula: c.matricula,
      });
      migratedCollabs += 1;
    }

    const { rows: risks } = await q(
      `SELECT id, setor_id, colaborador_id, posto_trabalho_id FROM inventario_riscos
       WHERE tenant_id = $1 AND deleted_at IS NULL AND posto_trabalho_id IS NULL`,
      [t.tenant_id],
    );
    for (const r of risks) {
      const chain = await resolveOrgForRisk(q, t.tenant_id, {
        sectorId: r.setor_id,
        collaboratorId: r.colaborador_id,
        postoId: r.posto_trabalho_id,
      });
      if (!chain?.workPostId) continue;
      await q(
        `UPDATE inventario_riscos SET
           unidade_id = $1, setor_id = $2, funcao_id = $3, atividade_id = $4, posto_trabalho_id = $5, updated_at = NOW()
         WHERE id = $6 AND tenant_id = $7`,
        [
          chain.unitId ? Number(chain.unitId) : null,
          chain.sectorId ? Number(chain.sectorId) : r.setor_id,
          chain.functionId ? Number(chain.functionId) : null,
          chain.activityId ? Number(chain.activityId) : null,
          Number(chain.workPostId),
          r.id,
          t.tenant_id,
        ],
      );
      migratedRisks += 1;
    }
  }

  return { migratedTenants, migratedCollabs, migratedRisks };
}

export const ORG_RISK_SELECT_JOINS = `
  LEFT JOIN unidades u ON u.id = r.unidade_id
  LEFT JOIN funcoes fn ON fn.id = r.funcao_id
  LEFT JOIN atividades atv ON atv.id = r.atividade_id
  LEFT JOIN postos_trabalho pt ON pt.id = r.posto_trabalho_id
`;

export const ORG_RISK_SELECT_FIELDS = `
  u.nome AS unidade_nome, fn.nome AS funcao_nome, atv.nome AS atividade_nome, pt.nome AS posto_nome,
  r.unidade_id, r.funcao_id, r.atividade_id, r.posto_trabalho_id
`;

export function mapRiskOrgFields(row) {
  return {
    unitId: row.unidade_id ? String(row.unidade_id) : null,
    unitName: row.unidade_nome ?? null,
    functionId: row.funcao_id ? String(row.funcao_id) : null,
    functionName: row.funcao_nome ?? null,
    activityId: row.atividade_id ? String(row.atividade_id) : null,
    activityName: row.atividade_nome ?? null,
    workPostId: row.posto_trabalho_id ? String(row.posto_trabalho_id) : null,
    workPostName: row.posto_nome ?? null,
    orgChain: mapOrgChain({
      unidade_id: row.unidade_id,
      unidade_nome: row.unidade_nome,
      setor_id: row.setor_id,
      setor_nome: row.setor_nome,
      funcao_id: row.funcao_id,
      funcao_nome: row.funcao_nome,
      atividade_id: row.atividade_id,
      atividade_nome: row.atividade_nome,
      posto_id: row.posto_trabalho_id,
      posto_nome: row.posto_nome,
    }),
  };
}
