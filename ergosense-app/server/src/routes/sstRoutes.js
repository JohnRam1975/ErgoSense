/**
 * SST — APR · EPI · EPC · Inspeções · Auditorias · NC · CAPA · Treinamentos
 */
import { requirePermission } from '../auth/rbac.js';
import { sanitizePlainText } from '../auth/sanitize.js';
import { query } from '../db.js';
import {
  integrateCapaToGro,
  integrateFromAuditoriaFinding,
  integrateFromInspecao,
  integrateFromNc,
} from '../services/riskIntegrationHub.js';
import {
  buildSstDashboard,
  buildSstReport,
  logSstHistory,
  mapApr,
  mapAuditoria,
  mapCapa,
  mapEpi,
  mapEpc,
  mapInspecao,
  mapNc,
  mapTreinamento,
} from '../services/sstUtils.js';

export function registerSstRoutes(app, { resolveOperationalTenant }) {
  app.get('/api/sst/dashboard', requirePermission('sst:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'SST');
    if (!tenantId) return;
    const dash = await buildSstDashboard(tenantId);
    const { rows: hist } = await query(
      `SELECT * FROM sst_historico WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 15`, [tenantId],
    );
    res.json({ ...dash, recentHistory: hist.map((h) => ({ id: String(h.id), action: h.acao, entityType: h.entidade_tipo, createdAt: h.created_at })) });
  });

  app.post('/api/sst/relatorios/gerar', requirePermission('sst:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'SST');
    if (!tenantId) return;
    const report = await buildSstReport(tenantId);
    const { rows } = await query(
      `INSERT INTO sst_relatorios (tenant_id, tipo, titulo, conteudo_json, gerado_por) VALUES ($1,'SST_INTEGRADO',$2,$3,$4) RETURNING id`,
      [tenantId, report.title, JSON.stringify(report), req.user?.name ?? ''],
    );
    await logSstHistory({ tenantId, entityType: 'RELATORIO', entityId: rows[0].id, action: 'RELATORIO_GERADO', user: req.user });
    res.json({ ...report, id: String(rows[0].id) });
  });

  app.get('/api/sst/relatorios', requirePermission('sst:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'SST');
    if (!tenantId) return;
    const { rows } = await query(`SELECT id, tipo, titulo, gerado_por, created_at FROM sst_relatorios WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 20`, [tenantId]);
    res.json(rows.map((r) => ({ id: String(r.id), type: r.tipo, title: r.titulo, generatedBy: r.gerado_por, createdAt: r.created_at })));
  });

  // ── APR ──
  app.get('/api/sst/apr', requirePermission('sst:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'SST');
    if (!tenantId) return;
    const { rows } = await query(
      `SELECT a.*, s.nome AS setor_nome FROM sst_apr a LEFT JOIN setores s ON s.id = a.setor_id
       WHERE a.tenant_id = $1 AND a.deleted_at IS NULL ORDER BY a.updated_at DESC`, [tenantId],
    );
    res.json(rows.map(mapApr));
  });

  app.post('/api/sst/apr', requirePermission('sst:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'SST');
    if (!tenantId) return;
    const titulo = sanitizePlainText(req.body?.title ?? 'APR', 512);
    const { rows } = await query(
      `INSERT INTO sst_apr (tenant_id, titulo, setor_id, colaborador_id, inventario_risco_id, atividade, local_trabalho, etapas_json, riscos_json, medidas_json, elaborado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [tenantId, titulo, req.body?.sectorId ? Number(req.body.sectorId) : null, req.body?.collaboratorId ? Number(req.body.collaboratorId) : null,
        req.body?.riskId ? Number(req.body.riskId) : null, sanitizePlainText(req.body?.activity ?? '', 2000), sanitizePlainText(req.body?.workplace ?? '', 255),
        JSON.stringify(req.body?.steps ?? []), JSON.stringify(req.body?.risks ?? []), JSON.stringify(req.body?.measures ?? []), req.user?.name ?? ''],
    );
    await logSstHistory({ tenantId, entityType: 'APR', entityId: rows[0].id, action: 'APR_CRIADA', user: req.user });
    res.status(201).json(mapApr(rows[0]));
  });

  app.put('/api/sst/apr/:id', requirePermission('sst:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'SST');
    if (!tenantId) return;
    const { rows } = await query(
      `UPDATE sst_apr SET titulo=COALESCE($3,titulo), atividade=COALESCE($4,atividade), riscos_json=COALESCE($5,riscos_json),
       medidas_json=COALESCE($6,medidas_json), inventario_risco_id=COALESCE($7,inventario_risco_id), status=COALESCE($8,status), updated_at=NOW()
       WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL RETURNING *`,
      [Number(req.params.id), tenantId, req.body?.title ? sanitizePlainText(req.body.title, 512) : null,
        req.body?.activity != null ? sanitizePlainText(req.body.activity, 2000) : null,
        req.body?.risks ? JSON.stringify(req.body.risks) : null, req.body?.measures ? JSON.stringify(req.body.measures) : null,
        req.body?.riskId != null ? Number(req.body.riskId) : null, req.body?.status ?? null],
    );
    if (!rows.length) return res.status(404).json({ error: 'APR não encontrada' });
    res.json(mapApr(rows[0]));
  });

  // ── EPI ──
  app.get('/api/sst/epi', requirePermission('sst:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'SST');
    if (!tenantId) return;
    const { rows } = await query(`SELECT * FROM sst_epi WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY descricao`, [tenantId]);
    res.json(rows.map(mapEpi));
  });

  app.post('/api/sst/epi', requirePermission('sst:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'SST');
    if (!tenantId) return;
    const desc = sanitizePlainText(req.body?.description ?? '', 512);
    if (!desc) return res.status(400).json({ error: 'description obrigatório' });
    const { rows } = await query(
      `INSERT INTO sst_epi (tenant_id, ca, tipo, descricao, fabricante, validade_ca, inventario_risco_id, observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [tenantId, sanitizePlainText(req.body?.ca ?? '', 64), sanitizePlainText(req.body?.type ?? 'EPI', 128), desc,
        sanitizePlainText(req.body?.manufacturer ?? '', 255), req.body?.caExpiry ?? null, req.body?.riskId ? Number(req.body.riskId) : null, sanitizePlainText(req.body?.notes ?? '', 2000)],
    );
    await logSstHistory({ tenantId, entityType: 'EPI', entityId: rows[0].id, action: 'EPI_CADASTRADO', user: req.user });
    res.status(201).json(mapEpi(rows[0]));
  });

  app.post('/api/sst/epi/:id/entrega', requirePermission('sst:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'SST');
    if (!tenantId) return;
    const colaboradorId = Number(req.body?.collaboratorId);
    if (!colaboradorId) return res.status(400).json({ error: 'collaboratorId obrigatório' });
    await query(
      `INSERT INTO sst_epi_entregas (tenant_id, epi_id, colaborador_id, quantidade, substituicao_prevista, assinatura_confirmada)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [tenantId, Number(req.params.id), colaboradorId, req.body?.quantity ?? 1, req.body?.replacementDate ?? null, req.body?.signed === true],
    );
    await logSstHistory({ tenantId, entityType: 'EPI', entityId: Number(req.params.id), action: 'EPI_ENTREGUE', user: req.user, details: { colaboradorId } });
    res.status(201).json({ ok: true });
  });

  // ── EPC ──
  app.get('/api/sst/epc', requirePermission('sst:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'SST');
    if (!tenantId) return;
    const { rows } = await query(`SELECT * FROM sst_epc WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY descricao`, [tenantId]);
    res.json(rows.map(mapEpc));
  });

  app.post('/api/sst/epc', requirePermission('sst:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'SST');
    if (!tenantId) return;
    const { rows } = await query(
      `INSERT INTO sst_epc (tenant_id, setor_id, inventario_risco_id, tipo, descricao, localizacao, conformidade, observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [tenantId, req.body?.sectorId ? Number(req.body.sectorId) : null, req.body?.riskId ? Number(req.body.riskId) : null,
        sanitizePlainText(req.body?.type ?? 'EPC', 128), sanitizePlainText(req.body?.description ?? '', 512),
        sanitizePlainText(req.body?.location ?? '', 255), req.body?.compliance ?? 'nao_avaliado', sanitizePlainText(req.body?.notes ?? '', 2000)],
    );
    res.status(201).json(mapEpc(rows[0]));
  });

  // ── Inspeções ──
  app.get('/api/sst/inspecoes', requirePermission('sst:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'SST');
    if (!tenantId) return;
    const { rows } = await query(`SELECT * FROM sst_inspecoes WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY data_programada DESC NULLS LAST`, [tenantId]);
    res.json(rows.map(mapInspecao));
  });

  app.post('/api/sst/inspecoes', requirePermission('sst:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'SST');
    if (!tenantId) return;
    const { rows } = await query(
      `INSERT INTO sst_inspecoes (tenant_id, titulo, tipo, setor_id, inventario_risco_id, data_programada, responsavel, checklist_json)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [tenantId, sanitizePlainText(req.body?.title ?? 'Inspeção', 512), req.body?.type ?? 'ROTINA',
        req.body?.sectorId ? Number(req.body.sectorId) : null, req.body?.riskId ? Number(req.body.riskId) : null,
        req.body?.scheduledDate ?? null, sanitizePlainText(req.body?.responsible ?? '', 255), JSON.stringify(req.body?.checklist ?? [])],
    );
    res.status(201).json(mapInspecao(rows[0]));
  });

  app.put('/api/sst/inspecoes/:id/realizar', requirePermission('sst:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'SST');
    if (!tenantId) return;
    const resultado = req.body?.result ?? 'conforme';
    const { rows } = await query(
      `UPDATE sst_inspecoes SET data_realizada=CURRENT_DATE, resultado=$3, status='realizada', checklist_json=COALESCE($4,checklist_json), updated_at=NOW()
       WHERE id=$1 AND tenant_id=$2 RETURNING *`,
      [Number(req.params.id), tenantId, resultado, req.body?.checklist ? JSON.stringify(req.body.checklist) : null],
    );
    if (!rows.length) return res.status(404).json({ error: 'Inspeção não encontrada' });
    if (resultado === 'nao_conforme' || resultado === 'parcial') {
      const { rows: ncRows } = await query(
        `INSERT INTO sst_nao_conformidades (tenant_id, titulo, descricao, origem_tipo, origem_id, inventario_risco_id, severidade, responsavel)
         VALUES ($1,$2,$3,'INSPECAO',$4,$5,'medio',$6) RETURNING *`,
        [tenantId, `NC — ${rows[0].titulo}`, req.body?.ncDescription ?? 'Não conformidade identificada em inspeção', rows[0].id, rows[0].inventario_risco_id, rows[0].responsavel],
      );
      try {
        await integrateFromInspecao(null, tenantId, rows[0], ncRows[0].id, req.user);
        await integrateFromNc(null, tenantId, ncRows[0], req.user);
      } catch (e) {
        console.warn('integrateFromInspecao/Nc:', e.message);
      }
    }
    res.json(mapInspecao(rows[0]));
  });

  // ── Auditorias ──
  app.get('/api/sst/auditorias', requirePermission('sst:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'SST');
    if (!tenantId) return;
    const { rows } = await query(`SELECT * FROM sst_auditorias WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY data_inicio DESC NULLS LAST`, [tenantId]);
    res.json(rows.map(mapAuditoria));
  });

  app.post('/api/sst/auditorias', requirePermission('sst:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'SST');
    if (!tenantId) return;
    const { rows } = await query(
      `INSERT INTO sst_auditorias (tenant_id, titulo, escopo, norma_referencia, data_inicio, data_fim, auditores, achados_json)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [tenantId, sanitizePlainText(req.body?.title ?? 'Auditoria', 512), sanitizePlainText(req.body?.scope ?? '', 2000),
        req.body?.standard ?? 'NR-01 / ISO 45001', req.body?.startDate ?? null, req.body?.endDate ?? null,
        sanitizePlainText(req.body?.auditors ?? '', 512), JSON.stringify(req.body?.findings ?? [])],
    );
    const findings = req.body?.findings ?? [];
    for (const f of findings) {
      if (f && (f.severity === 'critico' || f.severity === 'alto' || f.severidade === 'critico' || f.severidade === 'alto' || f.requiresAction)) {
        try {
          await integrateFromAuditoriaFinding(null, tenantId, rows[0].id, f, req.user);
        } catch (e) {
          console.warn('integrateFromAuditoriaFinding:', e.message);
        }
      }
    }
    res.status(201).json(mapAuditoria(rows[0]));
  });

  // ── Não Conformidades ──
  app.get('/api/sst/nc', requirePermission('sst:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'SST');
    if (!tenantId) return;
    const { rows } = await query(`SELECT * FROM sst_nao_conformidades WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY data_identificacao DESC`, [tenantId]);
    res.json(rows.map(mapNc));
  });

  app.post('/api/sst/nc', requirePermission('sst:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'SST');
    if (!tenantId) return;
    const desc = sanitizePlainText(req.body?.description ?? '', 2000);
    if (!desc) return res.status(400).json({ error: 'description obrigatório' });
    const { rows } = await query(
      `INSERT INTO sst_nao_conformidades (tenant_id, titulo, descricao, origem_tipo, origem_id, inventario_risco_id, severidade, responsavel, prazo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [tenantId, sanitizePlainText(req.body?.title ?? 'Não conformidade', 512), desc, req.body?.originType ?? 'INTERNA',
        req.body?.originId ? Number(req.body.originId) : null, req.body?.riskId ? Number(req.body.riskId) : null,
        req.body?.severity ?? 'medio', sanitizePlainText(req.body?.responsible ?? '', 255), req.body?.dueDate ?? null],
    );
    await logSstHistory({ tenantId, entityType: 'NC', entityId: rows[0].id, action: 'NC_REGISTRADA', user: req.user });
    try {
      await integrateFromNc(null, tenantId, rows[0], req.user);
    } catch (e) {
      console.warn('integrateFromNc:', e.message);
    }
    res.status(201).json(mapNc(rows[0]));
  });

  // ── CAPA ──
  app.get('/api/sst/capa', requirePermission('sst:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'SST');
    if (!tenantId) return;
    const { rows } = await query(`SELECT * FROM sst_capa WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY prazo NULLS LAST`, [tenantId]);
    res.json(rows.map(mapCapa));
  });

  app.post('/api/sst/capa', requirePermission('sst:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'SST');
    if (!tenantId) return;
    const desc = sanitizePlainText(req.body?.description ?? '', 2000);
    if (!desc) return res.status(400).json({ error: 'description obrigatório' });
    const { rows } = await query(
      `INSERT INTO sst_capa (tenant_id, nc_id, inventario_risco_id, tipo, descricao, causa_raiz, acao, responsavel, prazo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [tenantId, req.body?.ncId ? Number(req.body.ncId) : null, req.body?.riskId ? Number(req.body.riskId) : null,
        req.body?.type ?? 'CORRETIVA', desc, sanitizePlainText(req.body?.rootCause ?? '', 2000),
        sanitizePlainText(req.body?.action ?? '', 2000), sanitizePlainText(req.body?.responsible ?? '', 255), req.body?.dueDate ?? null],
    );
    if (req.body?.syncGro !== false && rows[0].inventario_risco_id) {
      await integrateCapaToGro(tenantId, rows[0], req.user);
    }
    if (req.body?.ncId) {
      await query(`UPDATE sst_nao_conformidades SET status='tratamento' WHERE id=$1`, [Number(req.body.ncId)]);
    }
    await logSstHistory({ tenantId, entityType: 'CAPA', entityId: rows[0].id, action: 'CAPA_CRIADA', user: req.user });
    res.status(201).json(mapCapa(rows[0]));
  });

  app.put('/api/sst/capa/:id', requirePermission('sst:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'SST');
    if (!tenantId) return;
    const { rows } = await query(
      `UPDATE sst_capa SET status=COALESCE($3,status), evidencia=COALESCE($4,evidencia), data_conclusao=CASE WHEN $3 IN ('concluido','verificado') THEN CURRENT_DATE ELSE data_conclusao END, updated_at=NOW()
       WHERE id=$1 AND tenant_id=$2 RETURNING *`,
      [Number(req.params.id), tenantId, req.body?.status ?? null, req.body?.evidence != null ? sanitizePlainText(req.body.evidence, 2000) : null],
    );
    if (!rows.length) return res.status(404).json({ error: 'CAPA não encontrada' });
    res.json(mapCapa(rows[0]));
  });

  // ── Treinamentos ──
  app.get('/api/sst/treinamentos', requirePermission('sst:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'SST');
    if (!tenantId) return;
    const { rows } = await query(
      `SELECT t.*, (SELECT COUNT(*)::int FROM sst_treinamento_participantes p WHERE p.treinamento_id = t.id) AS participantes
       FROM sst_treinamentos t WHERE t.tenant_id = $1 AND t.deleted_at IS NULL ORDER BY t.data_programada DESC NULLS LAST`, [tenantId],
    );
    res.json(rows.map(mapTreinamento));
  });

  app.post('/api/sst/treinamentos', requirePermission('sst:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'SST');
    if (!tenantId) return;
    const { rows } = await query(
      `INSERT INTO sst_treinamentos (tenant_id, titulo, tipo, conteudo, carga_horaria, data_programada, instrutor, inventario_risco_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [tenantId, sanitizePlainText(req.body?.title ?? 'Treinamento', 512), req.body?.type ?? 'NR',
        sanitizePlainText(req.body?.content ?? '', 2000), req.body?.hours ?? null, req.body?.scheduledDate ?? null,
        sanitizePlainText(req.body?.instructor ?? '', 255), req.body?.riskId ? Number(req.body.riskId) : null],
    );
    res.status(201).json(mapTreinamento({ ...rows[0], participantes: 0 }));
  });

  app.put('/api/sst/treinamentos/:id/realizar', requirePermission('sst:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'SST');
    if (!tenantId) return;
    const id = Number(req.params.id);
    await query(`UPDATE sst_treinamentos SET data_realizada=CURRENT_DATE, status='realizado', updated_at=NOW() WHERE id=$1 AND tenant_id=$2`, [id, tenantId]);
    const participants = req.body?.participants ?? [];
    for (const p of participants) {
      await query(
        `INSERT INTO sst_treinamento_participantes (tenant_id, treinamento_id, colaborador_id, presente, certificado_em)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (treinamento_id, colaborador_id) DO UPDATE SET
           presente = EXCLUDED.presente,
           certificado_em = EXCLUDED.certificado_em`,
        [tenantId, id, Number(p.collaboratorId), p.present !== false, p.certifiedAt ?? null],
      );
    }
    const { rows } = await query(`SELECT * FROM sst_treinamentos WHERE id=$1`, [id]);
    res.json(mapTreinamento({ ...rows[0], participantes: participants.length }));
  });

  app.get('/api/sst/historico', requirePermission('sst:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'SST');
    if (!tenantId) return;
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const { rows } = await query(`SELECT * FROM sst_historico WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`, [tenantId, limit]);
    res.json(rows.map((h) => ({ id: String(h.id), entityType: h.entidade_tipo, entityId: h.entidade_id ? String(h.entidade_id) : null, action: h.acao, userName: h.usuario_nome, createdAt: h.created_at })));
  });
}
