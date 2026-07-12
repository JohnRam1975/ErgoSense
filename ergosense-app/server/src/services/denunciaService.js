/**
 * Canal de Denúncia Corporativo — LGPD · integração NR-01
 */
import crypto from 'crypto';
import { query as defaultQuery } from '../db.js';
import { integrateFromDenuncia } from './riskIntegrationHub.js';

export const DENUNCIA_TIPOS = [
  'ASSEDIO_MORAL',
  'ASSEDIO_SEXUAL',
  'VIOLENCIA',
  'DISCRIMINACAO',
  'SOBRECARGA_PSICOLOGICA',
];

export const DENUNCIA_STATUS = [
  'RECEBIDA',
  'EM_TRIAGEM',
  'EM_INVESTIGACAO',
  'EM_TRATATIVA',
  'CONCLUIDA',
  'ARQUIVADA',
];

export const DENUNCIA_TIPO_LABELS = {
  ASSEDIO_MORAL: 'Assédio moral',
  ASSEDIO_SEXUAL: 'Assédio sexual',
  VIOLENCIA: 'Violência',
  DISCRIMINACAO: 'Discriminação',
  SOBRECARGA_PSICOLOGICA: 'Sobrecarga psicológica',
};

export const PSICO_FATOR_BY_TIPO = {
  ASSEDIO_MORAL: 'F02',
  ASSEDIO_SEXUAL: 'F02',
  VIOLENCIA: 'F11',
  DISCRIMINACAO: 'F10',
  SOBRECARGA_PSICOLOGICA: 'F01',
};

export const LGPD_DENUNCIA_BASE_LEGAL = 'obrigacao_legal';
export const LGPD_DENUNCIA_FINALIDADE =
  'Recebimento, triagem, investigação e tratativa de denúncias no ambiente de trabalho (NR-01, CLT, LGPD art. 7º II).';

export function hashAccessToken(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

export function generateAccessToken() {
  return crypto.randomBytes(24).toString('hex');
}

export function anonymizeIp(ip) {
  if (!ip || ip === 'unknown') return null;
  const parts = ip.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.xxx.xxx`;
  return ip.slice(0, Math.min(ip.length, 12)) + '…';
}

export function defaultRetentionDate(years = 5) {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

export function suggestGravidade(tipo) {
  if (['ASSEDIO_SEXUAL', 'VIOLENCIA'].includes(tipo)) return 'critico';
  if (['ASSEDIO_MORAL', 'DISCRIMINACAO'].includes(tipo)) return 'alto';
  return 'medio';
}

function q(client) {
  return client?.query ? client.query.bind(client) : defaultQuery;
}

export async function nextProtocol(runQuery, tenantId) {
  const year = new Date().getFullYear();
  const { rows } = await runQuery(
    `SELECT COUNT(*)::int AS c FROM denuncias
     WHERE tenant_id = $1 AND protocolo LIKE $2`,
    [tenantId, `DEN-${year}-%`],
  );
  const seq = (rows[0]?.c ?? 0) + 1;
  return `DEN-${year}-${String(seq).padStart(5, '0')}`;
}

export function mapDenunciaRow(row) {
  return {
    id: String(row.id),
    tenantId: row.tenant_id,
    protocol: row.protocolo,
    type: row.tipo,
    typeLabel: DENUNCIA_TIPO_LABELS[row.tipo] ?? row.tipo,
    modality: row.modalidade,
    status: row.status,
    severity: row.gravidade,
    sectorId: row.setor_id ? String(row.setor_id) : null,
    sectorName: row.setor_nome ?? null,
    unitId: row.unidade_id ? String(row.unidade_id) : null,
    description: row.descricao,
    location: row.relato_local ?? '',
    occurrenceDate: row.data_ocorrencia ? row.data_ocorrencia.toISOString().slice(0, 10) : null,
    reporterName: row.modalidade === 'ANONIMA' ? null : row.denunciante_nome ?? null,
    reporterEmail: row.modalidade === 'ANONIMA' ? null : row.denunciante_email ?? null,
    reporterPhone: row.modalidade === 'ANONIMA' ? null : row.denunciante_telefone ?? null,
    collaboratorId: row.colaborador_id ? String(row.colaborador_id) : null,
    lgpd: {
      consent: row.lgpd_consentimento,
      legalBasis: row.lgpd_base_legal,
      purpose: row.lgpd_finalidade,
      retentionUntil: row.lgpd_retencao_ate ? row.lgpd_retencao_ate.toISOString().slice(0, 10) : null,
    },
    inventoryRiskId: row.inventario_risco_id ? String(row.inventario_risco_id) : null,
    groActionPlanId: row.gro_plano_acao_id ? String(row.gro_plano_acao_id) : null,
    psicoFactorId: row.psico_fator_id ? String(row.psico_fator_id) : null,
    investigatorName: row.investigador_nome ?? null,
    conclusion: row.conclusao ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function logDenunciaHistory(runQuery, tenantId, denunciaId, acao, user, detalhes = null) {
  await runQuery(
    `INSERT INTO denuncia_historico (tenant_id, denuncia_id, acao, usuario_id, usuario_nome, detalhes)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      tenantId,
      denunciaId,
      acao,
      user?.id ?? null,
      user?.name ?? user?.email ?? null,
      detalhes ? JSON.stringify(detalhes) : null,
    ],
  );
}

export async function buildDenunciaDashboard(tenantId) {
  const { rows: stats } = await defaultQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status NOT IN ('CONCLUIDA','ARQUIVADA'))::int AS abertas,
       COUNT(*) FILTER (WHERE status = 'CONCLUIDA')::int AS concluidas,
       COUNT(*) FILTER (WHERE modalidade = 'ANONIMA')::int AS anonimas,
       COUNT(*) FILTER (WHERE modalidade = 'IDENTIFICADA')::int AS identificadas,
       COUNT(*) FILTER (WHERE gravidade = 'critico')::int AS criticas,
       COUNT(*) FILTER (WHERE gravidade IN ('critico','alto'))::int AS alta_gravidade,
       COUNT(*) FILTER (WHERE inventario_risco_id IS NOT NULL)::int AS integradas_inventario
     FROM denuncias WHERE tenant_id = $1 AND deleted_at IS NULL`,
    [tenantId],
  );

  const { rows: byType } = await defaultQuery(
    `SELECT tipo, COUNT(*)::int AS count FROM denuncias
     WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY tipo ORDER BY count DESC`,
    [tenantId],
  );

  const { rows: byStatus } = await defaultQuery(
    `SELECT status, COUNT(*)::int AS count FROM denuncias
     WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`,
    [tenantId],
  );

  const { rows: avgDays } = await defaultQuery(
    `SELECT ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400)::numeric, 1) AS media
     FROM denuncias WHERE tenant_id = $1 AND status = 'CONCLUIDA' AND deleted_at IS NULL`,
    [tenantId],
  );

  const { rows: recent } = await defaultQuery(
    `SELECT d.*, s.nome AS setor_nome FROM denuncias d
     LEFT JOIN setores s ON s.id = d.setor_id
     WHERE d.tenant_id = $1 AND d.deleted_at IS NULL
     ORDER BY d.created_at DESC LIMIT 8`,
    [tenantId],
  );

  const { rows: tratativasAbertas } = await defaultQuery(
    `SELECT COUNT(*)::int AS c FROM denuncia_tratativas t
     JOIN denuncias d ON d.id = t.denuncia_id AND d.deleted_at IS NULL
     WHERE t.tenant_id = $1 AND t.status IN ('aberto','andamento')`,
    [tenantId],
  );

  const s = stats[0] ?? {};
  return {
    total: s.total ?? 0,
    open: s.abertas ?? 0,
    completed: s.concluidas ?? 0,
    anonymous: s.anonimas ?? 0,
    identified: s.identificadas ?? 0,
    critical: s.criticas ?? 0,
    highSeverity: s.alta_gravidade ?? 0,
    integratedInventory: s.integradas_inventario ?? 0,
    openTreatments: tratativasAbertas[0]?.c ?? 0,
    avgResolutionDays: avgDays[0]?.media != null ? Number(avgDays[0].media) : null,
    byType: Object.fromEntries(byType.map((r) => [r.tipo, r.count])),
    byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.count])),
    indicators: {
      taxaConclusao: s.total ? Math.round(((s.concluidas ?? 0) / s.total) * 100) : 0,
      taxaAnonimato: s.total ? Math.round(((s.anonimas ?? 0) / s.total) * 100) : 0,
      taxaIntegracaoGro: s.total ? Math.round(((s.integradas_inventario ?? 0) / s.total) * 100) : 0,
    },
    recent: recent.map(mapDenunciaRow),
    lgpd: {
      baseLegal: LGPD_DENUNCIA_BASE_LEGAL,
      purpose: LGPD_DENUNCIA_FINALIDADE,
      anonymousDataMinimization: true,
    },
  };
}

export async function syncDenunciaIntegrations(client, tenantId, denunciaId, user) {
  const runQuery = q(client);
  const { rows } = await runQuery(
    `SELECT * FROM denuncias WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [denunciaId, tenantId],
  );
  const den = rows[0];
  if (!den) return null;

  const result = await integrateFromDenuncia(client, tenantId, den, user);
  if (result?.riskId) {
    await runQuery(
      `UPDATE denuncias SET
         inventario_risco_id = $1,
         gro_plano_acao_id = COALESCE($2, gro_plano_acao_id),
         psico_fator_id = COALESCE($3, psico_fator_id),
         updated_at = NOW()
       WHERE id = $4`,
      [result.riskId, result.planId ?? null, result.psicoFatorId ?? null, denunciaId],
    );
  }
  return result;
}

export async function createDenuncia(client, payload, user, ip) {
  const runQuery = q(client);
  const {
    tenantId,
    type,
    modality,
    description,
    location,
    occurrenceDate,
    reporterName,
    reporterEmail,
    reporterPhone,
    collaboratorId,
    sectorId,
    unitId,
    lgpdConsent,
    severity,
  } = payload;

  if (!DENUNCIA_TIPOS.includes(type)) throw new Error('Tipo de denúncia inválido');
  if (!['ANONIMA', 'IDENTIFICADA'].includes(modality)) throw new Error('Modalidade inválida');
  if (!lgpdConsent) throw new Error('Consentimento LGPD obrigatório para registro da denúncia');
  if (!description?.trim()) throw new Error('Descrição obrigatória');

  const protocol = await nextProtocol(runQuery, tenantId);
  const accessToken = modality === 'ANONIMA' ? generateAccessToken() : null;
  const gravidade = severity ?? suggestGravidade(type);

  const { rows } = await runQuery(
    `INSERT INTO denuncias (
       tenant_id, protocolo, tipo, modalidade, status, gravidade,
       setor_id, unidade_id, descricao, relato_local, data_ocorrencia,
       denunciante_nome, denunciante_email, denunciante_telefone, colaborador_id,
       lgpd_consentimento, lgpd_base_legal, lgpd_finalidade, lgpd_retencao_ate,
       ip_anonimizado, acesso_token_hash
     ) VALUES ($1,$2,$3,$4,'RECEBIDA',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
     RETURNING *`,
    [
      tenantId,
      protocol,
      type,
      modality,
      gravidade,
      sectorId ?? null,
      unitId ?? null,
      description.trim(),
      location?.trim() || null,
      occurrenceDate ?? null,
      modality === 'ANONIMA' ? null : reporterName?.trim() || null,
      modality === 'ANONIMA' ? null : reporterEmail?.trim() || null,
      modality === 'ANONIMA' ? null : reporterPhone?.trim() || null,
      modality === 'ANONIMA' ? null : collaboratorId ?? null,
      true,
      LGPD_DENUNCIA_BASE_LEGAL,
      LGPD_DENUNCIA_FINALIDADE,
      defaultRetentionDate(),
      anonymizeIp(ip),
      accessToken ? hashAccessToken(accessToken) : null,
    ],
  );

  const denuncia = rows[0];

  await runQuery(
    `INSERT INTO denuncia_tratativas (tenant_id, denuncia_id, tipo, descricao, responsavel, status)
     VALUES ($1,$2,'TRIAGEM','Triagem inicial do protocolo ${protocol}','Equipe de Compliance','aberto')`,
    [tenantId, denuncia.id],
  );

  await logDenunciaHistory(runQuery, tenantId, denuncia.id, 'DENUNCIA_REGISTRADA', user, {
    tipo: type,
    modalidade: modality,
    protocolo: protocol,
  });

  if (['critico', 'alto'].includes(gravidade) || ['ASSEDIO_SEXUAL', 'VIOLENCIA'].includes(type)) {
    await syncDenunciaIntegrations(client, tenantId, denuncia.id, user);
  }

  const mapped = mapDenunciaRow(denuncia);
  return {
    ...mapped,
    accessToken: accessToken ?? undefined,
  };
}
