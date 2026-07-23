/**
 * Monitor regulatório — MTE · DOU · Fundacentro · eSocial
 * Detecta novas normas, revisões e revogações.
 * NUNCA aplica regras automaticamente.
 */
import { query } from '../db.js';
import {
  analyzeClientImpact,
  analyzeSystemImpact,
  flagModulesAfterApproval,
  generateAdequationTasks,
  persistClientImpacts,
  persistSystemImpacts,
} from './complianceImpactEngine.js';
import { fetchAllSourceItems } from './complianceSourceAdapters.js';
import {
  analyzeLegalImpact,
  ensureComplianceFontes,
  hashContent,
  logComplianceHistory,
  persistImpactos,
} from './complianceUtils.js';
import { ensureComplianceSchedule } from './complianceScheduler.js';

export async function seedComplianceCatalog(tenantId, user) {
  await ensureComplianceFontes(tenantId);
  await ensureComplianceSchedule(tenantId);
  const { rows: existing } = await query(
    `SELECT COUNT(*)::int AS c FROM compliance_normas WHERE tenant_id = $1 AND deleted_at IS NULL`,
    [tenantId],
  );
  if (existing[0]?.c > 0) return { seeded: false, count: existing[0].c };

  const catalog = [
    { codigo: 'NR-01', titulo: 'NR-01 — Gerenciamento de Riscos Ocupacionais', orgao: 'MTE', fonte: 'MTE', area: 'SST', modulos: ['PGR', 'GRO', 'INVENTARIO'], texto: 'Versão vigente NR-01 — PGR, GRO e inventário de riscos obrigatórios.' },
    { codigo: 'NR-17', titulo: 'NR-17 — Ergonomia', orgao: 'MTE', fonte: 'MTE', area: 'Ergonomia', modulos: ['NR17', 'AET'], texto: 'Versão vigente NR-17 — mobiliário, pausas, AET e organização do trabalho.' },
    { codigo: 'NR-06', titulo: 'NR-06 — EPI', orgao: 'MTE', fonte: 'MTE', area: 'SST', modulos: ['SST'], texto: 'Versão vigente NR-06 — equipamentos de proteção individual.' },
    { codigo: 'ESOCIAL-SST', titulo: 'eSocial — Eventos SST', orgao: 'RFB/MTE', fonte: 'ESOCIAL', area: 'eSocial', modulos: ['ESOCIAL', 'SST'], texto: 'Layout eSocial SST — S-2210, S-2220, S-2240.' },
    { codigo: 'NR-01-PSICO', titulo: 'NR-01 — Fatores psicossociais', orgao: 'MTE', fonte: 'MTE', area: 'Psicossocial', modulos: ['PSICOSSOCIAL', 'PGR'], texto: 'Inclusão de fatores psicossociais no inventário e PGR.' },
  ];

  for (const n of catalog) {
    const { rows: normRows } = await query(
      `INSERT INTO compliance_normas (tenant_id, codigo, titulo, orgao, fonte, area, modulos_impactados, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'VIGENTE') RETURNING id`,
      [tenantId, n.codigo, n.titulo, n.orgao, n.fonte, n.area, JSON.stringify(n.modulos)],
    );
    const normId = normRows[0].id;
    const hash = hashContent(`${n.codigo}-v1.0-${n.texto}`);
    const { rows: verRows } = await query(
      `INSERT INTO compliance_norma_versoes (tenant_id, norma_id, numero_versao, numero_sequencial, tipo_alteracao, texto_resumo, texto_completo, data_publicacao, data_vigencia, hash_conteudo, validada, validada_por, validada_em)
       VALUES ($1,$2,'1.0',1,'ORIGINAL',$3,$4,CURRENT_DATE,CURRENT_DATE,$5,TRUE,'Sistema (seed)',NOW()) RETURNING id`,
      [tenantId, normId, `Versão inicial — ${n.titulo}`, n.texto, hash],
    );
    await query(`UPDATE compliance_normas SET versao_atual_id = $2 WHERE id = $1`, [normId, verRows[0].id]);
  }

  await logComplianceHistory({ tenantId, entityType: 'CATALOGO', action: 'CATALOGO_INICIALIZADO', user, details: { count: catalog.length } });
  return { seeded: true, count: catalog.length };
}

async function createDetection(tenantId, item, user, varreduraId) {
  const hash = hashContent(`${item.fonte}:${item.codigo}:${item.tipo}:${item.titulo}:${item.dataPublicacao ?? ''}`);
  const { rows: dup } = await query(`SELECT id FROM compliance_deteccoes WHERE tenant_id = $1 AND hash_deteccao = $2`, [tenantId, hash]);
  if (dup.length) return { duplicate: true };

  const { rows: norm } = await query(
    `SELECT id FROM compliance_normas WHERE tenant_id = $1 AND codigo = $2 AND deleted_at IS NULL`,
    [tenantId, item.codigo],
  );

  const dadosJson = {
    textoCompleto: item.textoCompleto ?? item.resumo,
    referenciaDou: item.referenciaDou ?? null,
    autoApply: false,
  };

  const { rows } = await query(
    `INSERT INTO compliance_deteccoes (tenant_id, fonte, tipo_evento, norma_id, codigo_norma, titulo, resumo, url_origem, data_publicacao, hash_deteccao, status, impacto_nivel, modulos_afetados, dados_json, varredura_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'PENDENTE_VALIDACAO',$11,$12,$13,$14) RETURNING *`,
    [
      tenantId,
      item.fonte,
      item.tipo,
      norm[0]?.id ?? null,
      item.codigo,
      item.titulo,
      item.resumo,
      item.url,
      item.dataPublicacao ?? null,
      hash,
      item.impacto,
      JSON.stringify(item.modulos),
      JSON.stringify(dadosJson),
      varreduraId ?? null,
    ],
  );

  const det = rows[0];
  const legalImpacts = analyzeLegalImpact(det);
  await persistImpactos(tenantId, det.id, legalImpacts);
  await persistSystemImpacts(tenantId, det.id, analyzeSystemImpact(det));
  await persistClientImpacts(tenantId, det.id, analyzeClientImpact(det));
  await generateAdequationTasks(tenantId, det.id, legalImpacts, 'DETECCAO');

  const sev = item.impacto === 'critico' ? 'critico' : item.impacto === 'alto' ? 'alto' : item.tipo === 'REVOGACAO' ? 'alto' : 'atencao';
  await query(
    `INSERT INTO compliance_alertas (tenant_id, deteccao_id, severidade, titulo, mensagem) VALUES ($1,$2,$3,$4,$5)`,
    [tenantId, det.id, sev, `[${item.tipo}] ${item.titulo}`, `${item.resumo} — Requer validação humana. Nenhuma regra será aplicada automaticamente.`],
  );

  await logComplianceHistory({ tenantId, entityType: 'DETECCAO', entityId: det.id, action: 'DETECCAO_CRIADA', user, details: { autoApply: false, tarefasGeradas: legalImpacts.length } });
  return { duplicate: false, detection: det };
}

export async function runComplianceScan(tenantId, user, options = {}) {
  const started = Date.now();
  await seedComplianceCatalog(tenantId, user);

  const fontesAtivas =
    options.fontes ??
    (
      await query(`SELECT codigo FROM compliance_fontes WHERE tenant_id = $1 AND ativo = TRUE`, [tenantId])
    ).rows.map((r) => r.codigo);

  const scanType = options.scanType ?? 'MANUAL';
  const { rows: scanRows } = await query(
    `INSERT INTO compliance_varreduras (tenant_id, tipo, fontes, status) VALUES ($1,$2,$3,'EXECUTANDO') RETURNING id`,
    [tenantId, scanType, JSON.stringify(fontesAtivas)],
  );
  const varreduraId = scanRows[0].id;

  const items = await fetchAllSourceItems(fontesAtivas);
  const detected = [];
  let duplicates = 0;

  for (const item of items) {
    const result = await createDetection(tenantId, item, user, varreduraId);
    if (result?.duplicate) duplicates += 1;
    else if (result?.detection) detected.push(result.detection);
  }

  for (const cod of fontesAtivas) {
    await query(
      `UPDATE compliance_fontes SET ultima_varredura = NOW(), ultimo_status = 'OK', updated_at = NOW() WHERE tenant_id = $1 AND codigo = $2`,
      [tenantId, cod],
    );
  }

  const durationMs = Date.now() - started;
  await query(
    `UPDATE compliance_varreduras SET detectadas = $2, duplicadas = $3, status = 'CONCLUIDA', duracao_ms = $4, concluida_em = NOW(),
       detalhes_json = $5 WHERE id = $1`,
    [varreduraId, detected.length, duplicates, durationMs, JSON.stringify({ autoApply: false, fontes: fontesAtivas })],
  );

  await logComplianceHistory({
    tenantId,
    entityType: 'MONITOR',
    action: 'VARREDURA_EXECUTADA',
    user,
    details: { detectadas: detected.length, duplicadas: duplicates, tipo: scanType, autoApply: false },
  });

  return { scannedSources: fontesAtivas.length, newDetections: detected.length, duplicates, scanId: String(varreduraId), durationMs };
}

export async function validateDetection(tenantId, deteccaoId, payload, user) {
  const { decision, justification, validatorName, validatorRole, applyRules } = payload;
  const { rows: det } = await query(`SELECT * FROM compliance_deteccoes WHERE id = $1 AND tenant_id = $2`, [deteccaoId, tenantId]);
  if (!det.length) return null;
  if (det[0].status !== 'PENDENTE_VALIDACAO' && decision !== 'SOLICITAR_REVISAO') {
    throw new Error('Detecção já validada');
  }

  await query(
    `INSERT INTO compliance_validacoes (tenant_id, deteccao_id, decisao, validador_nome, validador_cargo, justificativa, aplicar_regras)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [tenantId, deteccaoId, decision, validatorName, validatorRole ?? '', justification, applyRules === true],
  );

  const newStatus =
    decision === 'APROVAR' ? 'APROVADA' : decision === 'REJEITAR' ? 'REJEITADA' : 'PENDENTE_VALIDACAO';
  await query(`UPDATE compliance_deteccoes SET status = $3 WHERE id = $1 AND tenant_id = $2`, [deteccaoId, tenantId, newStatus]);

  let flaggedModules = [];
  if (decision === 'APROVAR') {
    const dados = det[0].dados_json ?? {};
    const textoCompleto = dados.textoCompleto ?? det[0].resumo ?? '';

    let normId = det[0].norma_id;
    if (!normId && det[0].codigo_norma) {
      const modulosImpactados =
        typeof det[0].modulos_afetados === 'string'
          ? det[0].modulos_afetados
          : JSON.stringify(det[0].modulos_afetados ?? []);
      const { rows: nr } = await query(
        `INSERT INTO compliance_normas (tenant_id, codigo, titulo, orgao, fonte, modulos_impactados, status)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb,'VIGENTE') RETURNING id`,
        [tenantId, det[0].codigo_norma, det[0].titulo, det[0].fonte, det[0].fonte, modulosImpactados],
      );
      normId = nr[0].id;
    }
    if (normId) {
      const { rows: lastVer } = await query(
        `SELECT numero_sequencial, texto_completo, texto_resumo FROM compliance_norma_versoes WHERE norma_id = $1 ORDER BY numero_sequencial DESC LIMIT 1`,
        [normId],
      );
      const seq = (lastVer[0]?.numero_sequencial ?? 0) + 1;
      const tipoMap = { NOVA_NORMA: 'ORIGINAL', REVISAO: 'REVISAO', REVOGACAO: 'REVOGACAO', RETIFICACAO: 'RETIFICACAO' };
      const { rows: ver } = await query(
        `INSERT INTO compliance_norma_versoes (tenant_id, norma_id, numero_versao, numero_sequencial, tipo_alteracao, texto_resumo, texto_completo, data_publicacao, data_vigencia, referencia_dou, hash_conteudo, validada, validada_por, validada_em)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,TRUE,$12,NOW()) RETURNING id`,
        [
          tenantId,
          normId,
          `${seq}.0`,
          seq,
          tipoMap[det[0].tipo_evento] ?? 'REVISAO',
          det[0].resumo,
          textoCompleto,
          det[0].data_publicacao ?? new Date().toISOString().slice(0, 10),
          det[0].data_publicacao ?? new Date().toISOString().slice(0, 10),
          dados.referenciaDou ?? null,
          hashContent(`${det[0].codigo}-${seq}-${textoCompleto}`),
          validatorName,
        ],
      );
      await query(`UPDATE compliance_normas SET versao_atual_id = $2, updated_at = NOW() WHERE id = $1`, [normId, ver[0].id]);
      if (det[0].tipo_evento === 'REVOGACAO') await query(`UPDATE compliance_normas SET status = 'REVOGADA' WHERE id = $1`, [normId]);
    }

    flaggedModules = await flagModulesAfterApproval(tenantId, det[0], user);

    const { rows: impacts } = await query(`SELECT * FROM compliance_impactos WHERE deteccao_id = $1`, [deteccaoId]);
    await generateAdequationTasks(
      tenantId,
      deteccaoId,
      impacts.map((r) => ({
        id: r.id,
        modulo: r.modulo,
        descricao_impacto: r.descricao_impacto,
        acao_recomendada: r.acao_recomendada,
        prazo_dias: r.prazo_dias,
        risco_legal: r.risco_legal,
      })),
      'APROVACAO',
    );
  }

  await logComplianceHistory({
    tenantId,
    entityType: 'VALIDACAO',
    entityId: deteccaoId,
    action: `VALIDACAO_${decision}`,
    user,
    details: { autoApplyExecuted: false, applyRulesRequested: applyRules === true, flaggedModules },
  });

  return { status: newStatus, autoApplyExecuted: false, flaggedModules };
}

export async function markAlertRead(tenantId, alertId) {
  await query(`UPDATE compliance_alertas SET lido = TRUE, lido_em = NOW() WHERE id = $1 AND tenant_id = $2`, [alertId, tenantId]);
}

export async function updateAdequationTask(tenantId, taskId, patch, user) {
  const { rows } = await query(
    `UPDATE compliance_adequacao_tarefas SET
       status = COALESCE($3, status),
       responsavel = COALESCE($4, responsavel),
       descricao = COALESCE($5, descricao),
       updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 RETURNING *`,
    [taskId, tenantId, patch.status ?? null, patch.responsible ?? null, patch.description ?? null],
  );
  if (!rows[0]) return null;
  await logComplianceHistory({
    tenantId,
    entityType: 'TAREFA',
    entityId: taskId,
    action: 'TAREFA_ATUALIZADA',
    user,
    details: { status: patch.status },
  });
  return rows[0];
}
