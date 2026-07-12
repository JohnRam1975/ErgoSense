/**
 * Serviço central — Critérios de Avaliação de Riscos NR-01 §1.5.4.4.2.2
 * Metodologias versionadas · documentação automática · trilha de auditoria
 */
import { query } from '../db.js';
import {
  DEFAULT_CRITERIA_CONFIG,
  MATRIX_TYPE_PRESETS,
} from '../riskCriteriaDefaults.js';
import {
  buildMatrixGrid,
  evaluateWithCriteria,
  normalizeCriteriaConfig,
} from '../riskInventoryUtils.js';

const cache = new Map();
const CACHE_TTL_MS = 60_000;

function cacheKey(tenantId) {
  return String(tenantId);
}

function getCached(tenantId) {
  const hit = cache.get(cacheKey(tenantId));
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(cacheKey(tenantId));
    return null;
  }
  return hit.data;
}

export function invalidateCriteriaCache(tenantId) {
  if (tenantId) cache.delete(cacheKey(tenantId));
  else cache.clear();
}

export function generateCriteriaDocumentation(config, meta = {}) {
  const cfg = normalizeCriteriaConfig(config);
  const grid = buildMatrixGrid(cfg);
  const lines = [
    '# Critérios de Avaliação de Riscos — NR-01 §1.5.4.4.2.2',
    '',
    `Metodologia: ${meta.methodologyName ?? 'Matriz de Risco'}`,
    `Versão: ${meta.versionNumber ?? 1}`,
    `Tipo de matriz: ${cfg.matrixType}`,
    `Referência normativa: ${cfg.nr01Reference}`,
    meta.activatedAt ? `Vigência desde: ${meta.activatedAt}` : '',
    '',
    '## Escala de Probabilidade',
    ...cfg.probability.map((p) => `- **${p.value} — ${p.label}**: ${p.description}`),
    '',
    '## Escala de Severidade',
    ...cfg.severity.map((s) => `- **${s.value} — ${s.label}**: ${s.description}`),
    '',
    '## Faixas de Criticidade',
    ...cfg.thresholds.map(
      (t) =>
        `- **${t.label}** (${t.level}): score ${t.minScore}–${t.maxScore} · Aceitável: ${t.acceptable ? 'Sim' : 'Não'}`,
    ),
    '',
    '## Política de Aceitabilidade',
    `- Níveis aceitáveis: ${(cfg.acceptability.acceptableLevels ?? []).join(', ')}`,
    `- Plano de ação obrigatório a partir de: ${cfg.acceptability.requiresActionPlanFrom ?? 'alto'}`,
    `- Ação imediata: ${(cfg.acceptability.requiresImmediateAction ?? []).join(', ')}`,
    '',
    '## Matriz Probabilidade × Severidade',
    ...grid.map(
      (c) =>
        `P${c.probability} (${c.probabilityLabel}) × S${c.severity} (${c.severityLabel}) = ${c.score} → ${c.levelLabel} [${c.acceptable ? 'aceitável' : 'inaceitável'}]`,
    ),
  ].filter(Boolean);

  return {
    generatedAt: new Date().toISOString(),
    nr01Reference: cfg.nr01Reference,
    methodologyName: meta.methodologyName ?? null,
    versionNumber: meta.versionNumber ?? null,
    matrixType: cfg.matrixType,
    markdown: lines.join('\n'),
    probability: cfg.probability,
    severity: cfg.severity,
    thresholds: cfg.thresholds,
    acceptability: cfg.acceptability,
    matrix: grid,
    config: cfg,
  };
}

export async function logCriteriaAudit({
  tenantId,
  methodologyId = null,
  versionId = null,
  action,
  details = {},
  user = null,
  ip = null,
}) {
  await query(
    `INSERT INTO gro_criterios_auditoria
       (tenant_id, metodologia_id, versao_id, acao, detalhes_json, usuario_id, usuario_nome, ip)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      tenantId,
      methodologyId,
      versionId,
      action,
      JSON.stringify(details),
      user?.id ?? null,
      user?.name ?? user?.nome ?? null,
      ip ?? null,
    ],
  );
}

async function insertVersion(runQuery, {
  tenantId,
  methodologyId,
  versionNum,
  config,
  status,
  notes,
  user,
  documentation,
}) {
  const { rows } = await runQuery(
    `INSERT INTO gro_criterios_versoes
       (metodologia_id, tenant_id, versao_num, config_json, documentacao_json, status, notas_alteracao, created_by, created_by_nome, activated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      methodologyId,
      tenantId,
      versionNum,
      JSON.stringify(config),
      JSON.stringify(documentation),
      status,
      notes ?? null,
      user?.id ?? null,
      user?.name ?? user?.nome ?? null,
      status === 'ativa' ? new Date() : null,
    ],
  );
  return rows[0];
}

export async function ensureDefaultMethodology(tenantId, user = null, runQuery = query) {
  const { rows: existing } = await runQuery(
    `SELECT id, versao_ativa_id FROM gro_criterios_metodologia
     WHERE tenant_id = $1 AND padrao = true AND deleted_at IS NULL LIMIT 1`,
    [tenantId],
  );
  if (existing.length && existing[0].versao_ativa_id) return existing[0].id;

  const config = DEFAULT_CRITERIA_CONFIG;
  const doc = generateCriteriaDocumentation(config, {
    methodologyName: 'Matriz NR-01 Padrão 5×5',
    versionNumber: 1,
  });

  let methodologyId = existing[0]?.id;
  if (!methodologyId) {
    const { rows: metRows } = await runQuery(
      `INSERT INTO gro_criterios_metodologia (tenant_id, nome, descricao, tipo_matriz, padrao)
       VALUES ($1,$2,$3,$4,true) RETURNING id`,
      [
        tenantId,
        'Matriz NR-01 Padrão 5×5',
        'Metodologia padrão conforme NR-01 §1.5.4.4.2.2 — probabilidade × severidade (1–5)',
        config.matrixType,
      ],
    );
    methodologyId = metRows[0].id;
  }

  const version = await insertVersion(runQuery, {
    tenantId,
    methodologyId,
    versionNum: 1,
    config,
    status: 'ativa',
    notes: 'Versão inicial automática',
    user,
    documentation: doc,
  });

  await runQuery(
    `UPDATE gro_criterios_metodologia SET versao_ativa_id = $1, updated_at = NOW() WHERE id = $2`,
    [version.id, methodologyId],
  );

  await logCriteriaAudit({
    tenantId,
    methodologyId,
    versionId: version.id,
    action: 'METODOLOGIA_PADRAO_CRIADA',
    details: { versionNum: 1, matrixType: config.matrixType },
    user,
  });

  invalidateCriteriaCache(tenantId);
  return methodologyId;
}

export async function getActiveCriteria(tenantId, runQuery = query) {
  const cached = getCached(tenantId);
  if (cached) return cached;

  await ensureDefaultMethodology(tenantId, null, runQuery);

  const { rows } = await runQuery(
    `SELECT m.id AS metodologia_id, m.nome, m.descricao, m.tipo_matriz, m.versao_ativa_id,
            v.id AS versao_id, v.versao_num, v.config_json, v.documentacao_json, v.activated_at
     FROM gro_criterios_metodologia m
     JOIN gro_criterios_versoes v ON v.id = m.versao_ativa_id
     WHERE m.tenant_id = $1 AND m.deleted_at IS NULL
     ORDER BY m.padrao DESC, m.updated_at DESC
     LIMIT 1`,
    [tenantId],
  );

  if (!rows[0]) {
    const fallback = {
      methodologyId: null,
      versionId: null,
      versionNumber: 0,
      name: 'Padrão embutido',
      description: null,
      matrixType: DEFAULT_CRITERIA_CONFIG.matrixType,
      config: DEFAULT_CRITERIA_CONFIG,
      documentation: generateCriteriaDocumentation(DEFAULT_CRITERIA_CONFIG),
      activatedAt: null,
      isDefault: true,
    };
    return fallback;
  }

  const row = rows[0];
  const config = normalizeCriteriaConfig(row.config_json);
  const data = {
    methodologyId: row.metodologia_id,
    versionId: row.versao_id,
    versionNumber: row.versao_num,
    name: row.nome,
    description: row.descricao,
    matrixType: row.tipo_matriz,
    config,
    documentation: row.documentacao_json ?? generateCriteriaDocumentation(config, {
      methodologyName: row.nome,
      versionNumber: row.versao_num,
      activatedAt: row.activated_at?.toISOString?.() ?? row.activated_at,
    }),
    activatedAt: row.activated_at,
    isDefault: false,
  };

  cache.set(cacheKey(tenantId), { at: Date.now(), data });
  return data;
}

export async function evaluateForTenant(tenantId, probability, severity, runQuery = query) {
  const active = await getActiveCriteria(tenantId, runQuery);
  const evaluation = evaluateWithCriteria(probability, severity, active.config);
  if (!evaluation) return null;
  return {
    ...evaluation,
    methodologyId: active.methodologyId,
    versionId: active.versionId,
    versionNumber: active.versionNumber,
    methodologyName: active.name,
  };
}

export async function listMethodologies(tenantId) {
  await ensureDefaultMethodology(tenantId);
  const { rows } = await query(
    `SELECT m.*, v.versao_num AS versao_ativa_num, v.status AS versao_ativa_status
     FROM gro_criterios_metodologia m
     LEFT JOIN gro_criterios_versoes v ON v.id = m.versao_ativa_id
     WHERE m.tenant_id = $1 AND m.deleted_at IS NULL
     ORDER BY m.padrao DESC, m.nome`,
    [tenantId],
  );
  return rows.map((r) => ({
    id: String(r.id),
    tenantId: r.tenant_id,
    name: r.nome,
    description: r.descricao ?? '',
    matrixType: r.tipo_matriz,
    activeVersionId: r.versao_ativa_id ? String(r.versao_ativa_id) : null,
    activeVersionNumber: r.versao_ativa_num ?? null,
    isDefault: r.padrao,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function listVersions(tenantId, methodologyId) {
  const { rows } = await query(
    `SELECT v.* FROM gro_criterios_versoes v
     JOIN gro_criterios_metodologia m ON m.id = v.metodologia_id
     WHERE v.metodologia_id = $1 AND m.tenant_id = $2
     ORDER BY v.versao_num DESC`,
    [methodologyId, tenantId],
  );
  return rows.map((r) => ({
    id: String(r.id),
    methodologyId: String(r.metodologia_id),
    versionNumber: r.versao_num,
    status: r.status,
    notes: r.notas_alteracao ?? '',
    config: normalizeCriteriaConfig(r.config_json),
    documentation: r.documentacao_json,
    createdByName: r.created_by_nome,
    createdAt: r.created_at,
    activatedAt: r.activated_at,
  }));
}

export async function createMethodology(tenantId, payload, user, ip) {
  const name = String(payload?.name ?? payload?.nome ?? '').trim();
  if (!name) throw new Error('Nome da metodologia é obrigatório');

  const matrixType = String(payload?.matrixType ?? payload?.tipoMatriz ?? 'PROB_SEV_5X5');
  const preset = MATRIX_TYPE_PRESETS[matrixType] ?? DEFAULT_CRITERIA_CONFIG;
  const config = normalizeCriteriaConfig(payload?.config ?? preset);

  const { rows } = await query(
    `INSERT INTO gro_criterios_metodologia (tenant_id, nome, descricao, tipo_matriz, padrao)
     VALUES ($1,$2,$3,$4,false) RETURNING *`,
    [tenantId, name, payload?.description ?? payload?.descricao ?? '', matrixType],
  );
  const met = rows[0];

  const doc = generateCriteriaDocumentation(config, { methodologyName: name, versionNumber: 1 });
  const version = await insertVersion(query, {
    tenantId,
    methodologyId: met.id,
    versionNum: 1,
    config,
    status: payload?.activate ? 'ativa' : 'rascunho',
    notes: payload?.notes ?? 'Versão inicial',
    user,
    documentation: doc,
  });

  if (payload?.activate) {
    await query(
      `UPDATE gro_criterios_metodologia SET versao_ativa_id = $1, updated_at = NOW() WHERE id = $2`,
      [version.id, met.id],
    );
  }

  await logCriteriaAudit({
    tenantId,
    methodologyId: met.id,
    versionId: version.id,
    action: 'METODOLOGIA_CRIADA',
    details: { name, matrixType, activated: Boolean(payload?.activate) },
    user,
    ip,
  });

  invalidateCriteriaCache(tenantId);
  return { methodologyId: String(met.id), versionId: String(version.id) };
}

export async function createVersion(tenantId, methodologyId, payload, user, ip) {
  const { rows: metRows } = await query(
    `SELECT * FROM gro_criterios_metodologia WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [methodologyId, tenantId],
  );
  if (!metRows[0]) throw new Error('Metodologia não encontrada');

  const { rows: lastVer } = await query(
    `SELECT MAX(versao_num)::int AS max_num FROM gro_criterios_versoes WHERE metodologia_id = $1`,
    [methodologyId],
  );
  const nextNum = (lastVer[0]?.max_num ?? 0) + 1;

  let baseConfig = DEFAULT_CRITERIA_CONFIG;
  if (payload?.baseVersionId) {
    const { rows: baseRows } = await query(
      `SELECT config_json FROM gro_criterios_versoes WHERE id = $1 AND metodologia_id = $2`,
      [payload.baseVersionId, methodologyId],
    );
    if (baseRows[0]) baseConfig = normalizeCriteriaConfig(baseRows[0].config_json);
  } else if (metRows[0].versao_ativa_id) {
    const { rows: activeRows } = await query(
      `SELECT config_json FROM gro_criterios_versoes WHERE id = $1`,
      [metRows[0].versao_ativa_id],
    );
    if (activeRows[0]) baseConfig = normalizeCriteriaConfig(activeRows[0].config_json);
  }

  const config = normalizeCriteriaConfig({ ...baseConfig, ...(payload?.config ?? {}) });
  const doc = generateCriteriaDocumentation(config, {
    methodologyName: metRows[0].nome,
    versionNumber: nextNum,
  });

  const version = await insertVersion(query, {
    tenantId,
    methodologyId,
    versionNum: nextNum,
    config,
    status: 'rascunho',
    notes: payload?.notes ?? payload?.notasAlteracao ?? '',
    user,
    documentation: doc,
  });

  await logCriteriaAudit({
    tenantId,
    methodologyId,
    versionId: version.id,
    action: 'VERSAO_CRIADA',
    details: { versionNum: nextNum },
    user,
    ip,
  });

  return { versionId: String(version.id), versionNumber: nextNum };
}

export async function activateVersion(tenantId, methodologyId, versionId, user, ip) {
  const { rows: verRows } = await query(
    `SELECT v.*, m.nome FROM gro_criterios_versoes v
     JOIN gro_criterios_metodologia m ON m.id = v.metodologia_id
     WHERE v.id = $1 AND v.metodologia_id = $2 AND m.tenant_id = $3`,
    [versionId, methodologyId, tenantId],
  );
  if (!verRows[0]) throw new Error('Versão não encontrada');

  await query(
    `UPDATE gro_criterios_versoes SET status = 'obsoleta'
     WHERE metodologia_id = $1 AND status = 'ativa' AND id != $2`,
    [methodologyId, versionId],
  );

  const config = normalizeCriteriaConfig(verRows[0].config_json);
  const doc = generateCriteriaDocumentation(config, {
    methodologyName: verRows[0].nome,
    versionNumber: verRows[0].versao_num,
    activatedAt: new Date().toISOString(),
  });

  await query(
    `UPDATE gro_criterios_versoes SET status = 'ativa', activated_at = NOW(), documentacao_json = $1 WHERE id = $2`,
    [JSON.stringify(doc), versionId],
  );

  await query(
    `UPDATE gro_criterios_metodologia SET versao_ativa_id = $1, updated_at = NOW() WHERE id = $2`,
    [versionId, methodologyId],
  );

  await logCriteriaAudit({
    tenantId,
    methodologyId,
    versionId,
    action: 'VERSAO_ATIVADA',
    details: { versionNum: verRows[0].versao_num },
    user,
    ip,
  });

  invalidateCriteriaCache(tenantId);
  return { activated: true, versionNumber: verRows[0].versao_num };
}

export async function listAuditTrail(tenantId, { limit = 100, methodologyId = null } = {}) {
  const params = [tenantId];
  let where = 'tenant_id = $1';
  if (methodologyId) {
    params.push(methodologyId);
    where += ` AND metodologia_id = $${params.length}`;
  }
  params.push(limit);

  const { rows } = await query(
    `SELECT * FROM gro_criterios_auditoria
     WHERE ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params,
  );

  return rows.map((r) => ({
    id: String(r.id),
    tenantId: r.tenant_id,
    methodologyId: r.metodologia_id ? String(r.metodologia_id) : null,
    versionId: r.versao_id ? String(r.versao_id) : null,
    action: r.acao,
    details: r.detalhes_json,
    userId: r.usuario_id ? String(r.usuario_id) : null,
    userName: r.usuario_nome,
    ip: r.ip,
    createdAt: r.created_at,
  }));
}

export async function getActiveDocumentation(tenantId) {
  const active = await getActiveCriteria(tenantId);
  return active.documentation;
}
