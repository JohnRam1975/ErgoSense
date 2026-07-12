/**
 * eSocial — S-2210 · S-2220 · S-2240
 * XML · Validação · Assinaturas · gov.br (preparado)
 */
import { requirePermission } from '../auth/rbac.js';
import { sanitizePlainText } from '../auth/sanitize.js';
import { query } from '../db.js';
import {
  buildEsocialDashboard,
  buildPayloadFromAnalysis,
  ensureEsocialConfig,
  generateEventXml,
  logEsocialHistory,
  mapAssinatura,
  mapConfig,
  mapEvento,
  mapHistorico,
  prepareGovbrSend,
  signEvent,
  validateAndPersistEvent,
} from '../services/esocialUtils.js';
import {
  consultProcessingStatus,
  listTransmissions,
  resendEvent,
  transmitEvent,
} from '../services/esocialTransmissionService.js';

function clientIp(req) {
  return req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? null;
}

export function registerEsocialRoutes(app, { resolveOperationalTenant }) {
  app.get('/api/esocial/dashboard', requirePermission('esocial:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'eSocial');
    if (!tenantId) return;
    const dash = await buildEsocialDashboard(tenantId);
    const { rows: hist } = await query(
      `SELECT * FROM esocial_historico WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 12`, [tenantId],
    );
    res.json({ ...dash, recentHistory: hist.map(mapHistorico) });
  });

  app.get('/api/esocial/config', requirePermission('esocial:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'eSocial');
    if (!tenantId) return;
    const cfg = await ensureEsocialConfig(tenantId);
    res.json(mapConfig(cfg));
  });

  app.put('/api/esocial/config', requirePermission('esocial:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'eSocial');
    if (!tenantId) return;
    await ensureEsocialConfig(tenantId);
    const b = req.body ?? {};
    const { rows } = await query(
      `UPDATE esocial_config SET
         tp_insc = COALESCE($2, tp_insc),
         nr_insc = COALESCE($3, nr_insc),
         razao_social = COALESCE($4, razao_social),
         ambiente = COALESCE($5, ambiente),
         proc_emi = COALESCE($6, proc_emi),
         ver_proc = COALESCE($7, ver_proc),
         certificado_serial = COALESCE($8, certificado_serial),
         certificado_validade = COALESCE($9, certificado_validade),
         govbr_habilitado = COALESCE($10, govbr_habilitado),
         certificado_pfx_path = COALESCE($11, certificado_pfx_path),
         certificado_senha_env = COALESCE($12, certificado_senha_env),
         govbr_modo = COALESCE($13, govbr_modo),
         updated_at = NOW()
       WHERE tenant_id = $1 RETURNING *`,
      [tenantId, b.tpInsc ?? null, b.nrInsc ? sanitizePlainText(b.nrInsc, 20) : null,
        b.razaoSocial != null ? sanitizePlainText(b.razaoSocial, 255) : null, b.ambiente ?? null,
        b.procEmi ?? null, b.verProc != null ? sanitizePlainText(b.verProc, 20) : null,
        b.certificadoSerial != null ? sanitizePlainText(b.certificadoSerial, 128) : null,
        b.certificadoValidade ?? null, b.govbrHabilitado ?? null,
        b.certificadoPfxPath != null ? sanitizePlainText(b.certificadoPfxPath, 512) : null,
        b.certificadoSenhaEnv != null ? sanitizePlainText(b.certificadoSenhaEnv, 64) : null,
        b.govbrModo ?? null],
    );
    await logEsocialHistory({ tenantId, action: 'CONFIG_ATUALIZADA', user: req.user, details: { ambiente: rows[0]?.ambiente } });
    res.json(mapConfig(rows[0]));
  });

  app.get('/api/esocial/eventos', requirePermission('esocial:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'eSocial');
    if (!tenantId) return;
    const tipo = req.query.tipo?.toString();
    const params = [tenantId];
    let sql = `SELECT e.*, c.nome AS colaborador_nome FROM esocial_eventos e
      LEFT JOIN colaboradores c ON c.id = e.colaborador_id
      WHERE e.tenant_id = $1 AND e.deleted_at IS NULL`;
    if (tipo) { sql += ` AND e.tipo_evento = $2`; params.push(tipo); }
    sql += ` ORDER BY e.updated_at DESC LIMIT 100`;
    const { rows } = await query(sql, params);
    res.json(rows.map((r) => mapEvento(r, { nome: r.colaborador_nome })));
  });

  app.get('/api/esocial/eventos/:id', requirePermission('esocial:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'eSocial');
    if (!tenantId) return;
    const id = Number(req.params.id);
    const { rows } = await query(
      `SELECT e.*, c.nome AS colaborador_nome FROM esocial_eventos e
       LEFT JOIN colaboradores c ON c.id = e.colaborador_id
       WHERE e.id = $1 AND e.tenant_id = $2 AND e.deleted_at IS NULL`, [id, tenantId],
    );
    if (!rows.length) return res.status(404).json({ error: 'Evento não encontrado' });
    const { rows: assin } = await query(`SELECT * FROM esocial_assinaturas WHERE evento_id = $1 ORDER BY assinado_em DESC`, [id]);
    const event = mapEvento(rows[0], { nome: rows[0].colaborador_nome });
    event.signatures = assin.map(mapAssinatura);
    if (req.query.includeXml === '1') {
      event.xml = rows[0].xml_assinado ?? rows[0].xml_gerado;
    }
    res.json(event);
  });

  app.post('/api/esocial/eventos', requirePermission('esocial:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'eSocial');
    if (!tenantId) return;
    const tipo = req.body?.eventType ?? req.body?.tipoEvento;
    if (!['S-2210', 'S-2220', 'S-2240'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de evento inválido' });
    }
    let payload = req.body?.payload ?? req.body?.data ?? {};
    if (req.body?.analysisId) {
      const fromAnalysis = await buildPayloadFromAnalysis(tenantId, Number(req.body.analysisId), tipo);
      if (fromAnalysis) payload = { ...fromAnalysis, ...payload };
    }
    const { eventId, xml, hash } = await generateEventXml(tenantId, tipo, payload);
    const { rows } = await query(
      `INSERT INTO esocial_eventos (tenant_id, tipo_evento, evento_id, colaborador_id, analise_id, inventario_risco_id, dados_json, xml_gerado, hash_documento, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'RASCUNHO') RETURNING *`,
      [tenantId, tipo, eventId,
        req.body?.collaboratorId ? Number(req.body.collaboratorId) : null,
        req.body?.analysisId ? Number(req.body.analysisId) : null,
        req.body?.riskId ? Number(req.body.riskId) : null,
        JSON.stringify(payload), xml, hash],
    );
    await logEsocialHistory({ tenantId, eventDbId: rows[0].id, action: 'EVENTO_CRIADO', user: req.user, details: { tipo, eventId } });
    res.status(201).json(mapEvento(rows[0]));
  });

  app.put('/api/esocial/eventos/:id', requirePermission('esocial:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'eSocial');
    if (!tenantId) return;
    const id = Number(req.params.id);
    const payload = req.body?.payload ?? req.body?.data;
    const { rows: cur } = await query(`SELECT * FROM esocial_eventos WHERE id=$1 AND tenant_id=$2`, [id, tenantId]);
    if (!cur.length) return res.status(404).json({ error: 'Evento não encontrado' });
    if (['ENVIADO', 'ACEITO'].includes(cur[0].status)) {
      return res.status(400).json({ error: 'Evento já enviado — crie retificação' });
    }
    const newPayload = payload ? payload : cur[0].dados_json;
    const { eventId, xml, hash } = await generateEventXml(tenantId, cur[0].tipo_evento, newPayload, id);
    const { rows } = await query(
      `UPDATE esocial_eventos SET dados_json=$3, evento_id=$4, xml_gerado=$5, hash_documento=$6,
       validacao_ok=FALSE, validacao_erros='[]', status='RASCUNHO', xml_assinado=NULL, updated_at=NOW()
       WHERE id=$1 AND tenant_id=$2 RETURNING *`,
      [id, tenantId, JSON.stringify(newPayload), eventId, xml, hash],
    );
    await logEsocialHistory({ tenantId, eventDbId: id, action: 'EVENTO_ATUALIZADO', user: req.user });
    res.json(mapEvento(rows[0]));
  });

  app.post('/api/esocial/eventos/:id/validar', requirePermission('esocial:write'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'eSocial');
    if (!tenantId) return;
    const result = await validateAndPersistEvent(tenantId, Number(req.params.id), req.user);
    if (!result) return res.status(404).json({ error: 'Evento não encontrado' });
    res.json(result);
  });

  app.post('/api/esocial/eventos/:id/assinar', requirePermission('esocial:sign'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'eSocial');
    if (!tenantId) return;
    try {
      const result = await signEvent(tenantId, Number(req.params.id), {
        type: req.body?.type ?? 'EMITENTE',
        name: sanitizePlainText(req.body?.name ?? req.user?.name ?? 'Responsável', 255),
        document: req.body?.document ? sanitizePlainText(req.body.document, 64) : null,
        registry: req.body?.registry ? sanitizePlainText(req.body.registry, 64) : null,
        certificateSerial: req.body?.certificateSerial ? sanitizePlainText(req.body.certificateSerial, 128) : null,
      }, req.user, clientIp(req));
      if (!result) return res.status(404).json({ error: 'Evento não encontrado' });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/esocial/eventos/:id/preparar-envio', requirePermission('esocial:export'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'eSocial');
    if (!tenantId) return;
    try {
      const result = await prepareGovbrSend(tenantId, Number(req.params.id), req.user);
      if (!result) return res.status(404).json({ error: 'Evento não encontrado' });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/esocial/eventos/:id/xml', requirePermission('esocial:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'eSocial');
    if (!tenantId) return;
    const { rows } = await query(`SELECT xml_assinado, xml_gerado, tipo_evento, evento_id FROM esocial_eventos WHERE id=$1 AND tenant_id=$2`, [Number(req.params.id), tenantId]);
    if (!rows.length) return res.status(404).json({ error: 'Evento não encontrado' });
    const xml = rows[0].xml_assinado ?? rows[0].xml_gerado;
    if (req.query.download === '1') {
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${rows[0].tipo_evento}_${rows[0].evento_id}.xml"`);
      return res.send(xml);
    }
    res.json({ xml, eventId: rows[0].evento_id, eventType: rows[0].tipo_evento });
  });

  app.get('/api/esocial/historico', requirePermission('esocial:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'eSocial');
    if (!tenantId) return;
    const limit = Math.min(200, Number(req.query.limit) || 50);
    const eventId = req.query.eventId ? Number(req.query.eventId) : null;
    const params = [tenantId, limit];
    let sql = `SELECT * FROM esocial_historico WHERE tenant_id = $1`;
    if (eventId) { sql += ` AND evento_id = $3`; params.push(eventId); }
    sql += ` ORDER BY created_at DESC LIMIT $2`;
    const { rows } = await query(sql, params);
    res.json(rows.map(mapHistorico));
  });

  app.get('/api/esocial/eventos/:id/validacoes', requirePermission('esocial:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'eSocial');
    if (!tenantId) return;
    const { rows } = await query(
      `SELECT * FROM esocial_validacoes WHERE tenant_id = $1 AND evento_id = $2 ORDER BY created_at DESC LIMIT 20`,
      [tenantId, Number(req.params.id)],
    );
    res.json(rows.map((r) => ({
      id: String(r.id),
      valid: r.valido,
      errors: r.erros_json ?? [],
      warnings: r.avisos_json ?? [],
      schemaVersion: r.schema_versao,
      validatedBy: r.validado_por,
      createdAt: r.created_at,
    })));
  });

  app.post('/api/esocial/eventos/:id/enviar', requirePermission('esocial:transmit'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'eSocial');
    if (!tenantId) return;
    try {
      const result = await transmitEvent(tenantId, Number(req.params.id), req.user);
      if (!result) return res.status(404).json({ error: 'Evento não encontrado' });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/esocial/eventos/:id/reenviar', requirePermission('esocial:transmit'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'eSocial');
    if (!tenantId) return;
    try {
      const result = await resendEvent(tenantId, Number(req.params.id), req.user);
      if (!result) return res.status(404).json({ error: 'Evento não encontrado' });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/esocial/eventos/:id/consultar-status', requirePermission('esocial:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'eSocial');
    if (!tenantId) return;
    try {
      const result = await consultProcessingStatus(tenantId, Number(req.params.id), req.user);
      if (!result) return res.status(404).json({ error: 'Evento não encontrado' });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/esocial/eventos/:id/transmissoes', requirePermission('esocial:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'eSocial');
    if (!tenantId) return;
    const rows = await listTransmissions(tenantId, Number(req.params.id));
    res.json(rows);
  });
}
