import crypto from 'crypto';
import { query } from '../db.js';

export const FONTES_PADRAO = [
  { codigo: 'MTE', nome: 'Ministério do Trabalho e Emprego', url: 'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao/seguranca-e-saude-no-trabalho/normas-regulamentadoras' },
  { codigo: 'DOU', nome: 'Diário Oficial da União', url: 'https://www.in.gov.br/consulta' },
  { codigo: 'FUNDACENTRO', nome: 'Fundacentro', url: 'https://www.gov.br/fundacentro/pt-br' },
  { codigo: 'ESOCIAL', nome: 'eSocial — Portal Gov.br', url: 'https://www.gov.br/esocial/pt-br' },
];

export const MODULOS_ERGOSENSE = ['PGR', 'GRO', 'INVENTARIO', 'SST', 'AET', 'PSICOSSOCIAL', 'ESOCIAL', 'NR17', 'COMPLIANCE'];

export async function logComplianceHistory({ tenantId, entityType, entityId, action, user, details }) {
  await query(
    `INSERT INTO compliance_historico (tenant_id, entidade_tipo, entidade_id, acao, usuario_nome, detalhes)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [tenantId, entityType, entityId ?? null, action, user?.name ?? user?.email ?? '', details ? JSON.stringify(details) : null],
  );
}

export async function ensureComplianceFontes(tenantId) {
  for (const f of FONTES_PADRAO) {
    await query(
      `INSERT INTO compliance_fontes (tenant_id, codigo, nome, url_monitoramento)
       VALUES ($1,$2,$3,$4) ON CONFLICT (tenant_id, codigo) DO NOTHING`,
      [tenantId, f.codigo, f.nome, f.url],
    );
  }
}

export function hashContent(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

export function mapFonte(row) {
  return {
    id: String(row.id),
    code: row.codigo,
    name: row.nome,
    monitorUrl: row.url_monitoramento,
    active: row.ativo,
    intervalHours: row.intervalo_horas,
    lastScan: row.ultima_varredura,
    lastStatus: row.ultimo_status,
  };
}

export function mapNorma(row, versao = null) {
  return {
    id: String(row.id),
    code: row.codigo,
    title: row.titulo,
    agency: row.orgao,
    source: row.fonte,
    area: row.area,
    status: row.status,
    impactedModules: row.modulos_impactados ?? [],
    currentVersion: versao,
    updatedAt: row.updated_at,
  };
}

export function mapVersao(row) {
  return {
    id: String(row.id),
    normId: String(row.norma_id),
    versionNumber: row.numero_versao,
    sequence: row.numero_sequencial,
    changeType: row.tipo_alteracao,
    summary: row.texto_resumo,
    fullText: row.texto_completo ?? row.texto_resumo ?? '',
    publishedAt: row.data_publicacao,
    effectiveAt: row.data_vigencia,
    douReference: row.referencia_dou,
    contentHash: row.hash_conteudo,
    validated: row.validada,
    validatedBy: row.validada_por,
    validatedAt: row.validada_em,
    createdAt: row.created_at,
  };
}

export function mapDeteccao(row) {
  return {
    id: String(row.id),
    source: row.fonte,
    eventType: row.tipo_evento,
    normId: row.norma_id ? String(row.norma_id) : null,
    normCode: row.codigo_norma,
    title: row.titulo,
    summary: row.resumo,
    originUrl: row.url_origem,
    publishedAt: row.data_publicacao,
    status: row.status,
    impactLevel: row.impacto_nivel,
    affectedModules: row.modulos_afetados ?? [],
    detectedAt: row.detectado_em,
  };
}

export function mapAlerta(row) {
  return {
    id: String(row.id),
    detectionId: row.deteccao_id ? String(row.deteccao_id) : null,
    severity: row.severidade,
    title: row.titulo,
    message: row.mensagem,
    read: row.lido,
    readAt: row.lido_em,
    createdAt: row.created_at,
  };
}

export function mapImpacto(row) {
  return {
    id: String(row.id),
    detectionId: String(row.deteccao_id),
    module: row.modulo,
    impactDescription: row.descricao_impacto,
    recommendedAction: row.acao_recomendada,
    deadlineDays: row.prazo_dias,
    legalRisk: row.risco_legal,
  };
}

export function mapValidacao(row) {
  return {
    id: String(row.id),
    detectionId: String(row.deteccao_id),
    decision: row.decisao,
    validatorName: row.validador_nome,
    validatorRole: row.validador_cargo,
    justification: row.justificativa,
    applyRules: row.aplicar_regras,
    createdAt: row.created_at,
  };
}

export async function buildComplianceDashboard(tenantId) {
  const { rows: detCounts } = await query(
    `SELECT status, COUNT(*)::int AS c FROM compliance_deteccoes WHERE tenant_id = $1 GROUP BY status`, [tenantId],
  );
  const { rows: alertCounts } = await query(
    `SELECT severidade, COUNT(*)::int AS c FROM compliance_alertas WHERE tenant_id = $1 AND lido = FALSE GROUP BY severidade`, [tenantId],
  );
  const { rows: normCounts } = await query(
    `SELECT status, COUNT(*)::int AS c FROM compliance_normas WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`, [tenantId],
  );
  const dash = {
    pendingValidation: 0,
    approved: 0,
    rejected: 0,
    unreadAlerts: 0,
    criticalAlerts: 0,
    vigenteNorms: 0,
    revokedNorms: 0,
    lastScan: null,
  };
  for (const r of detCounts) {
    if (r.status === 'PENDENTE_VALIDACAO') dash.pendingValidation = r.c;
    else if (r.status === 'APROVADA') dash.approved = r.c;
    else if (r.status === 'REJEITADA') dash.rejected = r.c;
  }
  for (const r of alertCounts) {
    dash.unreadAlerts += r.c;
    if (r.severidade === 'critico' || r.severidade === 'alto') dash.criticalAlerts += r.c;
  }
  for (const r of normCounts) {
    if (r.status === 'VIGENTE') dash.vigenteNorms = r.c;
    if (r.status === 'REVOGADA') dash.revokedNorms = r.c;
  }
  const { rows: scan } = await query(
    `SELECT MAX(ultima_varredura) AS last FROM compliance_fontes WHERE tenant_id = $1`, [tenantId],
  );
  dash.lastScan = scan[0]?.last ?? null;

  const { rows: tasks } = await query(
    `SELECT COUNT(*)::int AS c FROM compliance_adequacao_tarefas WHERE tenant_id = $1 AND status IN ('PENDENTE','EM_ANDAMENTO')`,
    [tenantId],
  );
  dash.pendingTasks = tasks[0]?.c ?? 0;

  dash.humanValidationRequired = true;
  dash.autoApplyDisabled = true;
  return dash;
}

/** Análise de impacto legal por módulo ErgoSense */
export function analyzeLegalImpact(detection) {
  const impacts = [];
  const code = (detection.codigo_norma ?? detection.code ?? '').toUpperCase();
  const title = (detection.titulo ?? detection.title ?? '').toUpperCase();
  const eventType = detection.tipo_evento ?? detection.eventType;

  const add = (modulo, desc, acao, prazo, risco) => {
    impacts.push({ modulo, descricao_impacto: desc, acao_recomendada: acao, prazo_dias: prazo, risco_legal: risco });
  };

  if (code.includes('NR-01') || title.includes('NR-01') || title.includes('PGR')) {
    add('PGR', 'Alteração normativa NR-01/PGR — revisar inventário, ciclo GRO e versão do PGR.', 'Gerar nova versão PGR após validação humana.', 30, 'alto');
    add('GRO', 'Workflow GRO e planos de ação podem exigir atualização.', 'Revisar indicadores e planos vinculados.', 30, 'medio');
    add('INVENTARIO', 'Matriz de riscos NR-01 pode necessitar recalibragem.', 'Auditar inventário de riscos.', 45, 'alto');
  }
  if (code.includes('NR-17') || title.includes('NR-17') || title.includes('ERGONOM')) {
    add('NR17', 'NR-17 alterada — métodos RULA/REBA/OWAS e laudos ergonômicos.', 'Revisar AET e análises posturais.', 30, 'alto');
    add('AET', 'Workflow AET e laudos normativos impactados.', 'Atualizar templates AET após validação.', 30, 'medio');
  }
  if (code.includes('NR-06') || title.includes('EPI')) {
    add('SST', 'NR-6/EPI — cadastro e entregas SST.', 'Revisar EPI/EPC e treinamentos.', 15, 'medio');
  }
  if (code.includes('ESOCIAL') || title.includes('ESOCIAL') || detection.fonte === 'ESOCIAL' || detection.source === 'ESOCIAL') {
    add('ESOCIAL', 'Layout ou eventos eSocial alterados.', 'Validar XML S-2210/S-2220/S-2240 — não enviar antes de homologação.', 20, 'critico');
  }
  if (title.includes('PSICOSSOCIAL') || title.includes('COPSOQ') || code.includes('NR-01')) {
    add('PSICOSSOCIAL', 'Fatores psicossociais MTE — questionários e plano de ação.', 'Revisar matriz psicossocial.', 45, 'medio');
  }
  if (eventType === 'REVOGACAO') {
    add('COMPLIANCE', 'Norma revogada — desativar referências obsoletas no dossiê.', 'Arquivar versão e comunicar stakeholders.', 7, 'alto');
  }
  if (!impacts.length) {
    add('COMPLIANCE', 'Alteração regulatória detectada — avaliar impacto transversal.', 'Análise jurídica e atualização de procedimentos internos.', 30, 'medio');
  }
  return impacts;
}

export async function persistImpactos(tenantId, deteccaoId, impacts) {
  for (const imp of impacts) {
    await query(
      `INSERT INTO compliance_impactos (tenant_id, deteccao_id, modulo, descricao_impacto, acao_recomendada, prazo_dias, risco_legal)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [tenantId, deteccaoId, imp.modulo, imp.descricao_impacto, imp.acao_recomendada, imp.prazo_dias, imp.risco_legal],
    );
  }
}

export async function buildComplianceReport(tenantId) {
  const dash = await buildComplianceDashboard(tenantId);
  const { rows: pending } = await query(
    `SELECT * FROM compliance_deteccoes WHERE tenant_id = $1 AND status = 'PENDENTE_VALIDACAO' ORDER BY detectado_em DESC LIMIT 20`, [tenantId],
  );
  const { rows: norms } = await query(
    `SELECT n.*, v.numero_versao, v.data_publicacao AS versao_data
     FROM compliance_normas n
     LEFT JOIN compliance_norma_versoes v ON v.id = n.versao_atual_id
     WHERE n.tenant_id = $1 AND n.deleted_at IS NULL ORDER BY n.codigo`, [tenantId],
  );
  const { rows: impacts } = await query(
    `SELECT i.*, d.titulo AS deteccao_titulo FROM compliance_impactos i
     JOIN compliance_deteccoes d ON d.id = i.deteccao_id
     WHERE i.tenant_id = $1 ORDER BY i.created_at DESC LIMIT 30`, [tenantId],
  );
  const { rows: tasks } = await query(
    `SELECT * FROM compliance_adequacao_tarefas WHERE tenant_id = $1 ORDER BY prazo NULLS LAST, created_at DESC LIMIT 30`,
    [tenantId],
  );
  const { rows: sysImp } = await query(
    `SELECT * FROM compliance_impacto_sistema WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [tenantId],
  );
  const { rows: cliImp } = await query(
    `SELECT * FROM compliance_impacto_clientes WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [tenantId],
  );

  const { mapAdequationTask, mapClientImpact, mapSystemImpact } = await import('./complianceImpactEngine.js');

  return {
    title: 'Relatório Compliance Intelligence Engine',
    generatedAt: new Date().toISOString(),
    disclaimer: 'Análise de apoio — não substitui parecer jurídico. Regras do sistema NUNCA são atualizadas automaticamente.',
    dashboard: dash,
    pendingDetections: pending.map(mapDeteccao),
    norms: norms.map((n) => mapNorma(n, n.numero_versao ? { number: n.numero_versao, publishedAt: n.versao_data } : null)),
    legalImpacts: impacts.map((r) => ({ ...mapImpacto(r), detectionTitle: r.deteccao_titulo })),
    systemImpacts: sysImp.map(mapSystemImpact),
    clientImpacts: cliImp.map(mapClientImpact),
    adequationTasks: tasks.map(mapAdequationTask),
    policy: {
      humanValidationRequired: true,
      autoApplyRules: false,
      sources: FONTES_PADRAO.map((f) => f.codigo),
    },
  };
}
