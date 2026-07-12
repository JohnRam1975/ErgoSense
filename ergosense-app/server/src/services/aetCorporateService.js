/**
 * AET Corporativo — versionamento, aprovação, assinaturas, integrações NR-01
 */
import crypto from 'crypto';
import { query } from '../db.js';
import { buildAetNormativeReport } from './aetReport.js';
import { logAetHistory, mapProcesso } from './aetUtils.js';
import { integrateFromAet } from './riskIntegrationHub.js';

export const AET_VERSION_STATUSES = ['RASCUNHO', 'EM_REVISAO', 'AGUARDANDO_APROVACAO', 'APROVADO', 'OBSOLETO'];
export const EDITABLE_AET_STATUSES = new Set(['RASCUNHO', 'EM_REVISAO']);
export const AET_SIGNATURE_TYPES = [
  'ELABORADOR',
  'RESPONSAVEL_TECNICO',
  'ERGONOMISTA',
  'REPRESENTANTE_LEGAL',
  'SESMT',
  'CIPA',
];
export const REQUIRED_AET_SIGNATURES = ['ELABORADOR', 'RESPONSAVEL_TECNICO', 'ERGONOMISTA'];

export function formatAetVersionNumber(sequential) {
  return `AET-${String(sequential).padStart(3, '0')}`;
}

export function computeAetDocumentHash(payload) {
  const normalized = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function mapAetApproval(row) {
  return {
    id: String(row.id),
    versionId: String(row.versao_id),
    approverName: row.aprovador_nome,
    approverRole: row.aprovador_cargo ?? '',
    approverEmail: row.aprovador_email ?? '',
    status: row.status,
    decidedAt: row.data_decisao,
    notes: row.observacao ?? '',
    createdAt: row.created_at,
  };
}

export function mapAetSignature(row) {
  return {
    id: String(row.id),
    versionId: String(row.versao_id),
    type: row.tipo,
    name: row.nome,
    role: row.cargo ?? '',
    document: row.documento ?? '',
    statement: row.declaracao ?? '',
    documentHash: row.hash_documento ?? '',
    signedAt: row.assinado_em,
    userId: row.usuario_id ? String(row.usuario_id) : null,
  };
}

export function mapAetIntegration(row) {
  return {
    id: String(row.id),
    processId: String(row.processo_id),
    versionId: row.versao_id ? String(row.versao_id) : null,
    module: row.modulo,
    entityId: String(row.entidade_id),
    reference: row.referencia ?? '',
    details: row.detalhes_json ?? {},
    createdAt: row.created_at,
  };
}

export function mapAetVersion(row, extras = {}) {
  return {
    id: String(row.id),
    tenantId: row.tenant_id,
    processId: String(row.processo_id),
    number: row.numero,
    sequential: row.numero_sequencial,
    status: row.status,
    snapshot: row.snapshot_json ?? {},
    report: row.relatorio_json,
    documentHash: row.hash_documento ?? '',
    preparedBy: row.elaborado_por ?? '',
    reviewedBy: row.revisado_por ?? '',
    preparedAt: row.data_elaboracao ? row.data_elaboracao.toISOString().slice(0, 10) : null,
    reviewedAt: row.data_revisao ? row.data_revisao.toISOString().slice(0, 10) : null,
    nextReviewAt: row.proxima_revisao ? row.proxima_revisao.toISOString().slice(0, 10) : null,
    reviewReason: row.motivo_revisao ?? '',
    notes: row.observacoes ?? '',
    technicalResponsible: row.responsavel_tecnico_nome ?? '',
    technicalResponsibleCrea: row.responsavel_tecnico_crea ?? '',
    technicalResponsibleArt: row.responsavel_tecnico_art ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...extras,
  };
}

async function loadFurniture(tenantId, ids) {
  if (!ids?.length) return [];
  const { rows } = await query(
    `SELECT * FROM aet_mobiliario WHERE tenant_id = $1 AND id = ANY($2::bigint[]) AND deleted_at IS NULL`,
    [tenantId, ids],
  );
  return rows;
}

async function loadEquipment(tenantId, ids) {
  if (!ids?.length) return [];
  const { rows } = await query(
    `SELECT * FROM aet_equipamentos WHERE tenant_id = $1 AND id = ANY($2::bigint[]) AND deleted_at IS NULL`,
    [tenantId, ids],
  );
  return rows;
}

export async function buildAetIntegrationSnapshot(tenantId, processoRow) {
  const snapshot = {
    inventario: null,
    gro: [],
    pgr: null,
    psicossocial: [],
    generatedAt: new Date().toISOString(),
  };

  if (processoRow.inventario_risco_id) {
    const { rows } = await query(
      `SELECT id, tipo, perigo, consequencia, probabilidade, severidade, nivel_risco, fonte_geradora, medidas_controle
       FROM inventario_riscos WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [processoRow.inventario_risco_id, tenantId],
    );
    if (rows[0]) {
      snapshot.inventario = {
        id: String(rows[0].id),
        tipo: rows[0].tipo,
        perigo: rows[0].perigo,
        consequencia: rows[0].consequencia,
        probabilidade: rows[0].probabilidade,
        severidade: rows[0].severidade,
        nivel: rows[0].nivel_risco,
        fonteGeradora: rows[0].fonte_geradora,
        medidasControle: rows[0].medidas_controle,
      };

      const { rows: plans } = await query(
        `SELECT id, descricao, tipo_controle, responsavel, prazo, status
         FROM gro_plano_acao WHERE tenant_id = $1 AND inventario_risco_id = $2 AND deleted_at IS NULL
         ORDER BY created_at DESC LIMIT 10`,
        [tenantId, processoRow.inventario_risco_id],
      );
      snapshot.gro = plans.map((p) => ({
        id: String(p.id),
        descricao: p.descricao,
        tipoControle: p.tipo_controle,
        responsavel: p.responsavel,
        prazo: p.prazo ? p.prazo.toISOString().slice(0, 10) : null,
        status: p.status,
      }));
    }
  }

  const { rows: pgrRows } = await query(
    `SELECT v.id, v.numero, v.status, p.titulo
     FROM pgr_programas p
     JOIN pgr_versoes v ON v.id = p.versao_ativa_id
     WHERE p.tenant_id = $1 AND p.deleted_at IS NULL LIMIT 1`,
    [tenantId],
  );
  if (pgrRows[0]) {
    snapshot.pgr = {
      id: String(pgrRows[0].id),
      numero: pgrRows[0].numero,
      status: pgrRows[0].status,
      titulo: pgrRows[0].titulo,
    };
  }

  if (processoRow.setor_id) {
    const { rows: psico } = await query(
      `SELECT id, fator_codigo, probabilidade, severidade, nivel_risco
       FROM psico_fatores_mte WHERE tenant_id = $1 AND setor_id = $2
       ORDER BY updated_at DESC LIMIT 10`,
      [tenantId, processoRow.setor_id],
    );
    snapshot.psicossocial = psico.map((f) => ({
      id: String(f.id),
      fatorCodigo: f.fator_codigo,
      probabilidade: f.probabilidade,
      severidade: f.severidade,
      nivel: f.nivel_risco,
    }));

    if (processoRow.psico_campanha_id) {
      const { rows: camp } = await query(
        `SELECT id, titulo, status FROM psico_campanhas WHERE id = $1 AND tenant_id = $2`,
        [processoRow.psico_campanha_id, tenantId],
      );
      if (camp[0]) {
        snapshot.psicossocialCampanha = {
          id: String(camp[0].id),
          titulo: camp[0].titulo,
          status: camp[0].status,
        };
      }
    }
  }

  return snapshot;
}

export async function buildAetProcessSnapshot(tenantId, processoRow, furnitureRows, equipmentRows) {
  const proc = mapProcesso(processoRow);
  const integrations = await buildAetIntegrationSnapshot(tenantId, processoRow);
  return {
    generatedAt: new Date().toISOString(),
    norma: 'NR-17 · NR-01',
    processo: {
      id: proc.id,
      title: proc.title,
      status: proc.status,
      stage: proc.stage,
      collaboratorId: proc.collaboratorId,
      sectorId: proc.sectorId,
      analysisId: proc.analysisId,
    },
    responsavelTecnico: {
      nome: processoRow.responsavel_tecnico_nome ?? '',
      crea: processoRow.responsavel_tecnico_crea ?? '',
      art: processoRow.responsavel_tecnico_art ?? '',
    },
    org: {
      unidadeId: processoRow.unidade_id ? String(processoRow.unidade_id) : null,
      postoTrabalhoId: processoRow.posto_trabalho_id ? String(processoRow.posto_trabalho_id) : null,
      funcaoId: processoRow.funcao_id ? String(processoRow.funcao_id) : null,
    },
    avaliacoes: {
      characterization: proc.characterization,
      methods: proc.methods,
      wholeBodyVibration: proc.wholeBodyVibration,
      handArmVibration: proc.handArmVibration,
      telework: proc.telework,
      workOrganization: proc.workOrganization,
      actionPlan: proc.actionPlan,
    },
    mobiliario: furnitureRows.map((r) => ({
      id: String(r.id),
      tipo: r.tipo,
      descricao: r.descricao,
      conformidade: r.conformidade_nr17,
    })),
    equipamentos: equipmentRows.map((r) => ({
      id: String(r.id),
      tipo: r.tipo,
      identificacao: r.identificacao,
      emiteVibracao: r.emite_vibracao,
      conformidade: r.conformidade_nr17,
    })),
    integracoes: integrations,
  };
}

async function getVersionFull(tenantId, versionId) {
  const { rows } = await query(`SELECT * FROM aet_versoes WHERE id = $1 AND tenant_id = $2`, [versionId, tenantId]);
  if (!rows[0]) return null;

  const { rows: approvals } = await query(`SELECT * FROM aet_aprovacoes WHERE versao_id = $1 ORDER BY created_at`, [versionId]);
  const { rows: signatures } = await query(`SELECT * FROM aet_assinaturas WHERE versao_id = $1 ORDER BY assinado_em`, [versionId]);

  return mapAetVersion(rows[0], {
    approvals: approvals.map(mapAetApproval),
    signatures: signatures.map(mapAetSignature),
  });
}

export async function listAetVersions(tenantId, processoId) {
  const { rows } = await query(
    `SELECT * FROM aet_versoes WHERE tenant_id = $1 AND processo_id = $2 ORDER BY numero_sequencial DESC`,
    [tenantId, processoId],
  );
  return Promise.all(rows.map((r) => getVersionFull(tenantId, r.id)));
}

export async function createAetVersion(tenantId, processoId, user, options = {}) {
  const { rows: procRows } = await query(
    `SELECT * FROM aet_processos WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [processoId, tenantId],
  );
  const proc = procRows[0];
  if (!proc) throw new Error('Processo AET não encontrado');

  const { rows: last } = await query(
    `SELECT MAX(numero_sequencial)::int AS max_seq FROM aet_versoes WHERE processo_id = $1`,
    [processoId],
  );
  const sequential = (last[0]?.max_seq ?? 0) + 1;
  const numero = formatAetVersionNumber(sequential);

  const furniture = await loadFurniture(tenantId, proc.mobiliario_ids);
  const equipment = await loadEquipment(tenantId, proc.equipamento_ids);
  const snapshot = await buildAetProcessSnapshot(tenantId, proc, furniture, equipment);

  const motivo =
    options.reviewReason ||
    (options.fromVersionId ? `Revisão corporativa — versão anterior #${options.fromVersionId}` : 'Elaboração inicial AET');

  const { rows } = await query(
    `INSERT INTO aet_versoes (
       tenant_id, processo_id, numero, numero_sequencial, status, snapshot_json,
       elaborado_por, data_elaboracao, motivo_revisao, proxima_revisao, observacoes,
       responsavel_tecnico_nome, responsavel_tecnico_crea, responsavel_tecnico_art
     ) VALUES ($1,$2,$3,$4,'RASCUNHO',$5,$6,CURRENT_DATE,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      tenantId,
      processoId,
      numero,
      sequential,
      JSON.stringify(snapshot),
      user?.name || user?.email || proc.elaborado_por || '',
      motivo,
      options.nextReviewAt?.slice(0, 10) || null,
      options.notes || null,
      proc.responsavel_tecnico_nome || options.technicalResponsible || null,
      proc.responsavel_tecnico_crea || options.technicalResponsibleCrea || null,
      proc.responsavel_tecnico_art || options.technicalResponsibleArt || null,
    ],
  );

  await query(`UPDATE aet_processos SET versao_ativa_id = $1, status = 'EM_REVISAO', updated_at = NOW() WHERE id = $2`, [
    rows[0].id,
    processoId,
  ]);

  await logAetHistory({
    tenantId,
    processoId,
    action: 'VERSAO_CRIADA',
    user,
    details: { versaoId: rows[0].id, numero },
    versionId: rows[0].id,
  });

  return getVersionFull(tenantId, rows[0].id);
}

export async function refreshAetVersionSnapshot(tenantId, versionId, user) {
  const { rows: ver } = await query(`SELECT * FROM aet_versoes WHERE id = $1 AND tenant_id = $2`, [versionId, tenantId]);
  if (!ver[0]) throw new Error('Versão não encontrada');
  if (!EDITABLE_AET_STATUSES.has(ver[0].status)) throw new Error('Versão não editável neste status');

  const { rows: procRows } = await query(`SELECT * FROM aet_processos WHERE id = $1`, [ver[0].processo_id]);
  const furniture = await loadFurniture(tenantId, procRows[0].mobiliario_ids);
  const equipment = await loadEquipment(tenantId, procRows[0].equipamento_ids);
  const snapshot = await buildAetProcessSnapshot(tenantId, procRows[0], furniture, equipment);

  await query(`UPDATE aet_versoes SET snapshot_json = $1, updated_at = NOW() WHERE id = $2`, [
    JSON.stringify(snapshot),
    versionId,
  ]);

  await logAetHistory({
    tenantId,
    processoId: ver[0].processo_id,
    action: 'SNAPSHOT_ATUALIZADO',
    user,
    versionId,
  });

  return getVersionFull(tenantId, versionId);
}

export async function generateAetVersionReport(tenantId, versionId, user) {
  const { rows: ver } = await query(`SELECT * FROM aet_versoes WHERE id = $1 AND tenant_id = $2`, [versionId, tenantId]);
  if (!ver[0]) throw new Error('Versão não encontrada');
  if (!EDITABLE_AET_STATUSES.has(ver[0].status)) throw new Error('Versão não editável neste status');

  const { rows: procRows } = await query(`SELECT * FROM aet_processos WHERE id = $1`, [ver[0].processo_id]);
  const proc = mapProcesso(procRows[0]);
  const furniture = (await loadFurniture(tenantId, procRows[0].mobiliario_ids)).map((r) => ({
    id: String(r.id),
    type: r.tipo,
    description: r.descricao,
    nr17Compliance: r.conformidade_nr17,
  }));
  const equipment = (await loadEquipment(tenantId, procRows[0].equipamento_ids)).map((r) => ({
    id: String(r.id),
    type: r.tipo,
    identification: r.identificacao,
    emitsVibration: r.emite_vibracao,
    nr17Compliance: r.conformidade_nr17,
  }));

  const integrations = ver[0].snapshot_json?.integracoes ?? (await buildAetIntegrationSnapshot(tenantId, procRows[0]));
  const report = buildAetNormativeReport(proc, {
    furniture,
    equipment,
    versionNumber: ver[0].numero,
    technicalResponsible: {
      nome: ver[0].responsavel_tecnico_nome ?? procRows[0].responsavel_tecnico_nome,
      crea: ver[0].responsavel_tecnico_crea ?? procRows[0].responsavel_tecnico_crea,
      art: ver[0].responsavel_tecnico_art ?? procRows[0].responsavel_tecnico_art,
    },
    integrations,
  });

  await query(`UPDATE aet_versoes SET relatorio_json = $1, updated_at = NOW() WHERE id = $2`, [
    JSON.stringify(report),
    versionId,
  ]);
  await query(`UPDATE aet_processos SET relatorio_json = $1, updated_at = NOW() WHERE id = $2`, [
    JSON.stringify(report),
    ver[0].processo_id,
  ]);

  await logAetHistory({
    tenantId,
    processoId: ver[0].processo_id,
    action: 'RELATORIO_VERSAO_GERADO',
    user,
    versionId,
  });

  return report;
}

export async function submitAetApproval(tenantId, versionId, user, { approverName, approverRole, approverEmail }) {
  const { rows } = await query(`SELECT status, processo_id FROM aet_versoes WHERE id = $1 AND tenant_id = $2`, [
    versionId,
    tenantId,
  ]);
  if (!rows[0]) throw new Error('Versão não encontrada');
  if (!EDITABLE_AET_STATUSES.has(rows[0].status)) throw new Error('Versão não pode ser enviada para aprovação');

  await query(`UPDATE aet_versoes SET status = 'AGUARDANDO_APROVACAO', updated_at = NOW() WHERE id = $1`, [versionId]);
  await query(
    `INSERT INTO aet_aprovacoes (tenant_id, versao_id, aprovador_nome, aprovador_cargo, aprovador_email)
     VALUES ($1,$2,$3,$4,$5)`,
    [tenantId, versionId, approverName, approverRole || null, approverEmail || null],
  );

  await logAetHistory({
    tenantId,
    processoId: rows[0].processo_id,
    action: 'ENVIADO_APROVACAO',
    user,
    versionId,
  });

  return getVersionFull(tenantId, versionId);
}

async function recordIntegration(tenantId, processoId, versionId, modulo, entidadeId, referencia, detalhes = {}) {
  await query(
    `INSERT INTO aet_integracoes (tenant_id, processo_id, versao_id, modulo, entidade_id, referencia, detalhes_json)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [tenantId, processoId, versionId, modulo, entidadeId, referencia, JSON.stringify(detalhes)],
  );
}

export async function approveAetVersion(tenantId, versionId, user, notes = null) {
  const { rows } = await query(
    `SELECT v.*, p.setor_id FROM aet_versoes v
     JOIN aet_processos p ON p.id = v.processo_id
     WHERE v.id = $1 AND v.tenant_id = $2`,
    [versionId, tenantId],
  );
  if (!rows[0]) throw new Error('Versão não encontrada');
  if (rows[0].status !== 'AGUARDANDO_APROVACAO') throw new Error('Versão não está aguardando aprovação');

  const ver = rows[0];
  const hashPayload = {
    snapshot: ver.snapshot_json,
    report: ver.relatorio_json,
    version: ver.numero,
    approvedAt: new Date().toISOString(),
  };
  const hash = computeAetDocumentHash(hashPayload);

  await query(
    `UPDATE aet_aprovacoes SET status = 'APROVADO', data_decisao = NOW(), observacao = $2
     WHERE versao_id = $1 AND status = 'PENDENTE'`,
    [versionId, notes],
  );

  await query(
    `UPDATE aet_versoes SET status = 'APROVADO', data_revisao = CURRENT_DATE, hash_documento = $2, updated_at = NOW()
     WHERE id = $1`,
    [versionId, hash],
  );

  await query(
    `UPDATE aet_versoes SET status = 'OBSOLETO', updated_at = NOW()
     WHERE processo_id = $1 AND id != $2 AND status = 'APROVADO'`,
    [ver.processo_id, versionId],
  );

  await query(
    `UPDATE aet_processos SET versao_ativa_id = $1, hash_documento = $2, status = 'EM_REVISAO', updated_at = NOW()
     WHERE id = $3`,
    [versionId, hash, ver.processo_id],
  );

  let integrationResult = null;
  try {
    integrationResult = await integrateFromAet(null, tenantId, ver.processo_id, user);
  } catch (e) {
    console.warn('integrateFromAet on approve:', e.message);
  }

  if (integrationResult?.inventarioRiscoId) {
    await recordIntegration(
      tenantId,
      ver.processo_id,
      versionId,
      'INVENTARIO',
      integrationResult.inventarioRiscoId,
      `Risco ergonômico AET v${ver.numero}`,
      { origem: 'AET' },
    );
  }
  if (integrationResult?.groPlanoId) {
    await recordIntegration(
      tenantId,
      ver.processo_id,
      versionId,
      'GRO',
      integrationResult.groPlanoId,
      'Plano de ação GRO vinculado',
      {},
    );
  }
  if (integrationResult?.pgrVersaoId) {
    await recordIntegration(
      tenantId,
      ver.processo_id,
      versionId,
      'PGR',
      integrationResult.pgrVersaoId,
      'Snapshot PGR atualizado',
      {},
    );
  }

  const psicoLinks = ver.snapshot_json?.integracoes?.psicossocial ?? [];
  for (const f of psicoLinks.slice(0, 5)) {
    await recordIntegration(
      tenantId,
      ver.processo_id,
      versionId,
      'PSICOSSOCIAL',
      Number(f.id),
      `Fator MTE ${f.fatorCodigo}`,
      { nivel: f.nivel },
    );
  }

  await logAetHistory({
    tenantId,
    processoId: ver.processo_id,
    action: 'VERSAO_APROVADA',
    user,
    versionId,
    details: { hash, integracao: !!integrationResult },
  });

  return getVersionFull(tenantId, versionId);
}

export async function rejectAetVersion(tenantId, versionId, user, notes = 'Rejeitado') {
  const { rows } = await query(`SELECT processo_id FROM aet_versoes WHERE id = $1 AND tenant_id = $2`, [versionId, tenantId]);
  if (!rows[0]) throw new Error('Versão não encontrada');

  await query(
    `UPDATE aet_aprovacoes SET status = 'REJEITADO', data_decisao = NOW(), observacao = $2
     WHERE versao_id = $1 AND status = 'PENDENTE'`,
    [versionId, notes],
  );
  await query(`UPDATE aet_versoes SET status = 'EM_REVISAO', updated_at = NOW() WHERE id = $1`, [versionId]);

  await logAetHistory({
    tenantId,
    processoId: rows[0].processo_id,
    action: 'VERSAO_REJEITADA',
    user,
    versionId,
  });

  return getVersionFull(tenantId, versionId);
}

export async function signAetVersion(tenantId, versionId, user, { type, name, role, document, statement }) {
  if (!AET_SIGNATURE_TYPES.includes(type)) throw new Error('Tipo de assinatura inválido');
  if (!name) throw new Error('Nome obrigatório');

  const { rows: ver } = await query(`SELECT * FROM aet_versoes WHERE id = $1 AND tenant_id = $2`, [versionId, tenantId]);
  if (!ver[0]) throw new Error('Versão não encontrada');

  const hash = ver[0].hash_documento || computeAetDocumentHash({ snapshot: ver[0].snapshot_json, report: ver[0].relatorio_json });
  const declaracao =
    statement ||
    `Declaro ter participado da elaboração/revisão desta AET (${ver[0].numero}) e responsabilizo-me pelo conteúdo técnico, conforme NR-17.`;

  const { rows } = await query(
    `INSERT INTO aet_assinaturas (tenant_id, versao_id, tipo, nome, cargo, documento, declaracao, hash_documento, usuario_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [tenantId, versionId, type, name, role || null, document || null, declaracao, hash, user?.id ?? null],
  );

  await logAetHistory({
    tenantId,
    processoId: ver[0].processo_id,
    action: 'ASSINATURA_REGISTRADA',
    user,
    versionId,
    details: { tipo: type, nome: name, crea: document },
  });

  const { rows: allSigs } = await query(`SELECT tipo FROM aet_assinaturas WHERE versao_id = $1`, [versionId]);
  const signedTypes = new Set(allSigs.map((s) => s.tipo));
  const allRequired = REQUIRED_AET_SIGNATURES.every((t) => signedTypes.has(t));

  if (allRequired && ver[0].status === 'APROVADO') {
    await query(
      `UPDATE aet_processos SET status = 'ASSINADO', etapa_atual = 'ASSINADO', assinado_em = NOW(),
         ergonomista_nome = COALESCE($2, ergonomista_nome),
         ergonomista_registro = COALESCE($3, ergonomista_registro),
         updated_at = NOW()
       WHERE id = $1`,
      [
        ver[0].processo_id,
        type === 'ERGONOMISTA' ? name : null,
        type === 'ERGONOMISTA' ? document : null,
      ],
    );
    await logAetHistory({
      tenantId,
      processoId: ver[0].processo_id,
      action: 'AET_FINALIZADA',
      stage: 'ASSINADO',
      user,
      versionId,
      details: { hash },
    });
  }

  return mapAetSignature(rows[0]);
}

export async function startAetRevision(tenantId, fromVersionId, user, options = {}) {
  const { rows } = await query(`SELECT processo_id FROM aet_versoes WHERE id = $1 AND tenant_id = $2`, [
    fromVersionId,
    tenantId,
  ]);
  if (!rows[0]) throw new Error('Versão base não encontrada');

  return createAetVersion(tenantId, rows[0].processo_id, user, {
    fromVersionId,
    reviewReason: options.reviewReason || `Revisão programada — versão anterior`,
    nextReviewAt: options.nextReviewAt,
  });
}

export async function listAetIntegrations(tenantId, processoId) {
  const { rows } = await query(
    `SELECT * FROM aet_integracoes WHERE tenant_id = $1 AND processo_id = $2 ORDER BY created_at DESC`,
    [tenantId, processoId],
  );
  return rows.map(mapAetIntegration);
}

export async function updateAetTechnicalResponsible(tenantId, processoId, data, user) {
  await query(
    `UPDATE aet_processos SET
       responsavel_tecnico_nome = COALESCE($3, responsavel_tecnico_nome),
       responsavel_tecnico_crea = COALESCE($4, responsavel_tecnico_crea),
       responsavel_tecnico_art = COALESCE($5, responsavel_tecnico_art),
       unidade_id = COALESCE($6, unidade_id),
       posto_trabalho_id = COALESCE($7, posto_trabalho_id),
       funcao_id = COALESCE($8, funcao_id),
       psico_campanha_id = COALESCE($9, psico_campanha_id),
       updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2`,
    [
      processoId,
      tenantId,
      data.technicalResponsible || null,
      data.technicalResponsibleCrea || null,
      data.technicalResponsibleArt || null,
      data.unitId ? Number(data.unitId) : null,
      data.workstationId ? Number(data.workstationId) : null,
      data.jobRoleId ? Number(data.jobRoleId) : null,
      data.psicoCampaignId ? Number(data.psicoCampaignId) : null,
    ],
  );

  await logAetHistory({
    tenantId,
    processoId,
    action: 'RESPONSAVEL_TECNICO_ATUALIZADO',
    user,
    details: { crea: data.technicalResponsibleCrea },
  });
}

export { getVersionFull };
