/**
 * Canal de Denúncia Corporativo — APIs REST (LGPD · NR-01)
 */
import { requirePermission } from '../auth/rbac.js';
import { sanitizePlainText, sanitizeEmail } from '../auth/sanitize.js';
import { query } from '../db.js';
import { clientIp } from '../supportAuth.js';
import { publicFormRateLimit } from '../middleware/rateLimit.js';
import {
  DENUNCIA_STATUS,
  DENUNCIA_TIPOS,
  buildDenunciaDashboard,
  createDenuncia,
  hashAccessToken,
  logDenunciaHistory,
  mapDenunciaRow,
  syncDenunciaIntegrations,
} from '../services/denunciaService.js';
import { requireNumericId } from '../utils/parseId.js';
import { apiError } from '../utils/apiResponse.js';

const DENUNCIA_TRATATIVA_TIPOS = [
  'TRIAGEM',
  'INVESTIGACAO',
  'MEDIDA_CAUTELAR',
  'CORRETIVA',
  'ACOMPANHAMENTO',
  'ENCERRAMENTO',
];

const SELECT_DENUNCIA = `
  SELECT d.*, s.nome AS setor_nome
  FROM denuncias d
  LEFT JOIN setores s ON s.id = d.setor_id
`;

function mapEvidence(row) {
  return {
    id: String(row.id),
    type: row.tipo,
    description: row.descricao,
    reference: row.referencia ?? '',
    hash: row.hash_sha256 ?? null,
    meta: row.meta_json ?? {},
    registeredBy: row.registrado_nome ?? null,
    createdAt: row.created_at,
  };
}

function mapTreatment(row) {
  return {
    id: String(row.id),
    type: row.tipo,
    description: row.descricao,
    responsible: row.responsavel ?? '',
    dueDate: row.prazo ? row.prazo.toISOString().slice(0, 10) : null,
    status: row.status,
    result: row.resultado ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapHistory(row) {
  return {
    id: String(row.id),
    action: row.acao,
    userName: row.usuario_nome ?? 'Sistema',
    details: row.detalhes ?? null,
    createdAt: row.created_at,
  };
}

function parseCreateBody(body) {
  const type = String(body?.type ?? body?.tipo ?? '').toUpperCase();
  const modality = String(body?.modality ?? body?.modalidade ?? '').toUpperCase();
  return {
    type,
    modality,
    description: sanitizePlainText(body?.description ?? body?.descricao, 8000),
    location: sanitizePlainText(body?.location ?? body?.local, 512),
    occurrenceDate: body?.occurrenceDate ?? body?.dataOcorrencia ?? null,
    reporterName: sanitizePlainText(body?.reporterName ?? body?.denuncianteNome, 255),
    reporterEmail: sanitizeEmail(body?.reporterEmail ?? body?.denuncianteEmail),
    reporterPhone: sanitizePlainText(body?.reporterPhone ?? body?.denuncianteTelefone, 64),
    collaboratorId: body?.collaboratorId ? Number(body.collaboratorId) : null,
    sectorName: sanitizePlainText(body?.sectorName ?? body?.setor, 128),
    unitId: body?.unitId ? Number(body.unitId) : null,
    lgpdConsent: Boolean(body?.lgpdConsent ?? body?.lgpdConsentimento),
    severity: ['critico', 'alto', 'medio', 'baixo'].includes(body?.severity ?? body?.gravidade)
      ? (body?.severity ?? body?.gravidade)
      : undefined,
  };
}

function assertCreatePayload(parsed) {
  if (!DENUNCIA_TIPOS.includes(parsed.type)) {
    throw new Error(`Tipo de denúncia inválido. Use: ${DENUNCIA_TIPOS.join(', ')}`);
  }
  if (!['ANONIMA', 'IDENTIFICADA'].includes(parsed.modality)) {
    throw new Error('Modalidade inválida. Use: ANONIMA ou IDENTIFICADA');
  }
  if (!parsed.lgpdConsent) {
    throw new Error('Consentimento LGPD obrigatório para registro da denúncia');
  }
  if (!parsed.description?.trim()) {
    throw new Error('Descrição obrigatória');
  }
}

async function resolveSectorId(tenantId, sectorName) {
  if (!sectorName) return null;
  const { rows } = await query(
    `SELECT id FROM setores WHERE tenant_id = $1 AND nome = $2 AND deleted_at IS NULL LIMIT 1`,
    [tenantId, sectorName],
  );
  return rows[0]?.id ?? null;
}

async function fetchDenunciaFull(tenantId, id) {
  const { rows } = await query(
    `${SELECT_DENUNCIA} WHERE d.id = $1 AND d.tenant_id = $2 AND d.deleted_at IS NULL`,
    [id, tenantId],
  );
  if (!rows[0]) return null;

  const { rows: evidencias } = await query(
    `SELECT * FROM denuncia_evidencias WHERE denuncia_id = $1 ORDER BY created_at DESC`,
    [id],
  );
  const { rows: tratativas } = await query(
    `SELECT * FROM denuncia_tratativas WHERE denuncia_id = $1 ORDER BY created_at ASC`,
    [id],
  );
  const { rows: historico } = await query(
    `SELECT * FROM denuncia_historico WHERE denuncia_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [id],
  );

  return {
    ...mapDenunciaRow(rows[0]),
    evidences: evidencias.map(mapEvidence),
    treatments: tratativas.map(mapTreatment),
    history: historico.map(mapHistory),
  };
}

export function registerDenunciaRoutes(app, { resolveOperationalTenant }) {
  app.get('/api/denuncias/dashboard', requirePermission('denuncia:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Canal de Denúncia');
    if (!tenantId) return;
    res.json(await buildDenunciaDashboard(tenantId));
  });

  app.get('/api/denuncias', requirePermission('denuncia:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Canal de Denúncia');
    if (!tenantId) return;

    const params = [tenantId];
    let where = 'd.tenant_id = $1 AND d.deleted_at IS NULL';
    const status = req.query.status?.toString().toUpperCase();
    const type = req.query.type?.toString().toUpperCase();
    if (status && DENUNCIA_STATUS.includes(status)) {
      params.push(status);
      where += ` AND d.status = $${params.length}`;
    }
    if (type && DENUNCIA_TIPOS.includes(type)) {
      params.push(type);
      where += ` AND d.tipo = $${params.length}`;
    }

    const { rows } = await query(
      `${SELECT_DENUNCIA} WHERE ${where} ORDER BY d.created_at DESC LIMIT 200`,
      params,
    );
    res.json(rows.map(mapDenunciaRow));
  });

  app.get('/api/denuncias/:id', requirePermission('denuncia:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Canal de Denúncia');
    if (!tenantId) return;
    const id = requireNumericId(req, res);
    if (id === null) return;
    const item = await fetchDenunciaFull(tenantId, id);
    if (!item) return res.status(404).json({ error: 'Denúncia não encontrada' });
    res.json(item);
  });

  app.post('/api/denuncias', requirePermission('denuncia:submit'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Canal de Denúncia');
    if (!tenantId) return;

    try {
      const parsed = parseCreateBody(req.body);
      assertCreatePayload(parsed);
      const sectorId = await resolveSectorId(tenantId, parsed.sectorName);
      const created = await createDenuncia(null, { tenantId, ...parsed, sectorId }, req.user, clientIp(req));
      res.status(201).json(created);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/denuncias/public', publicFormRateLimit, async (req, res) => {
    const tenantId = req.body?.tenantId?.toString()?.trim();
    if (!tenantId) return res.status(400).json({ error: 'tenantId obrigatório' });

    const { rows: tenant } = await query(
      `SELECT tenant_id FROM tenants WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    if (!tenant.length) return res.status(404).json({ error: 'Empresa não encontrada' });

    try {
      const parsed = parseCreateBody(req.body);
      assertCreatePayload(parsed);
      const sectorId = await resolveSectorId(tenantId, parsed.sectorName);
      const created = await createDenuncia(null, { tenantId, ...parsed, sectorId }, null, clientIp(req));
      res.status(201).json({
        protocol: created.protocol,
        accessToken: created.accessToken,
        message: 'Denúncia registrada. Guarde o protocolo e o token de acesso para acompanhamento.',
      });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get('/api/denuncias/public/status', publicFormRateLimit, async (req, res) => {
    const tenantId = req.query.tenantId?.toString();
    const protocol = req.query.protocol?.toString()?.trim();
    const accessToken = req.query.accessToken?.toString()?.trim();
    if (!tenantId || !protocol || !accessToken) {
      return res.status(400).json({ error: 'tenantId, protocol e accessToken obrigatórios' });
    }

    const { rows } = await query(
      `SELECT protocolo, status, gravidade, created_at, updated_at
       FROM denuncias
       WHERE tenant_id = $1 AND protocolo = $2 AND acesso_token_hash = $3 AND deleted_at IS NULL`,
      [tenantId, protocol, hashAccessToken(accessToken)],
    );
    if (!rows.length) return res.status(404).json({ error: 'Protocolo não encontrado ou token inválido' });

    const d = rows[0];
    res.json({
      protocol: d.protocolo,
      status: d.status,
      severity: d.gravidade,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    });
  });

  app.patch('/api/denuncias/:id/status', requirePermission('denuncia:investigate'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Canal de Denúncia');
    if (!tenantId) return;
    const id = requireNumericId(req, res);
    if (id === null) return;
    const status = String(req.body?.status ?? '').toUpperCase();
    if (!DENUNCIA_STATUS.includes(status)) {
      return res.status(400).json({ error: `Status inválido. Use: ${DENUNCIA_STATUS.join(', ')}` });
    }

    const { rows } = await query(
      `UPDATE denuncias SET status = $1,
         investigador_id = COALESCE($2, investigador_id),
         investigador_nome = COALESCE($3, investigador_nome),
         updated_at = NOW()
       WHERE id = $4 AND tenant_id = $5 AND deleted_at IS NULL RETURNING id`,
      [status, req.user?.id ?? null, req.user?.name ?? req.user?.email, id, tenantId],
    );
    if (!rows.length) return res.status(404).json({ error: 'Denúncia não encontrada' });

    await logDenunciaHistory(query, tenantId, id, 'STATUS_ALTERADO', req.user, { status });

    if (['EM_INVESTIGACAO', 'EM_TRATATIVA'].includes(status)) {
      await syncDenunciaIntegrations(null, tenantId, id, req.user);
    }

    const item = await fetchDenunciaFull(tenantId, id);
    res.json(item);
  });

  app.post('/api/denuncias/:id/tratativas', requirePermission('denuncia:investigate'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Canal de Denúncia');
    if (!tenantId) return;
    const id = requireNumericId(req, res);
    if (id === null) return;
    const tipo = String(req.body?.type ?? req.body?.tipo ?? 'INVESTIGACAO').toUpperCase();
    if (!DENUNCIA_TRATATIVA_TIPOS.includes(tipo)) {
      return apiError(res, `Tipo de tratativa inválido. Use: ${DENUNCIA_TRATATIVA_TIPOS.join(', ')}`, 400);
    }
    const descricao = sanitizePlainText(req.body?.description ?? req.body?.descricao, 4000);
    if (!descricao) return apiError(res, 'Descrição obrigatória', 400);

    try {
      const exists = await query(`SELECT id FROM denuncias WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`, [id, tenantId]);
      if (!exists.rows.length) return apiError(res, 'Denúncia não encontrada', 404);

      const { rows } = await query(
        `INSERT INTO denuncia_tratativas (tenant_id, denuncia_id, tipo, descricao, responsavel, prazo, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [
          tenantId,
          id,
          tipo,
          descricao,
          sanitizePlainText(req.body?.responsible ?? req.body?.responsavel, 255),
          req.body?.dueDate ?? req.body?.prazo ?? null,
          req.body?.status ?? 'aberto',
        ],
      );

      await logDenunciaHistory(query, tenantId, id, 'TRATATIVA_CRIADA', req.user, { tipo, tratativaId: rows[0].id });
      const item = await fetchDenunciaFull(tenantId, id);
      return res.status(201).json(item);
    } catch (err) {
      console.error(JSON.stringify({ level: 'error', msg: 'denuncia_tratativa_failed', error: err.message }));
      return apiError(res, err.message, 500);
    }
  });

  app.patch('/api/denuncias/:id/tratativas/:tid', requirePermission('denuncia:investigate'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Canal de Denúncia');
    if (!tenantId) return;
    const id = requireNumericId(req, res);
    if (id === null) return;
    const tid = requireNumericId(req, res, 'tid');
    if (tid === null) return;

    const exists = await query(
      `SELECT id FROM denuncias WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId],
    );
    if (!exists.rows.length) return res.status(404).json({ error: 'Denúncia não encontrada' });

    const { rowCount } = await query(
      `UPDATE denuncia_tratativas SET
         status = COALESCE($1, status),
         resultado = COALESCE($2, resultado),
         updated_at = NOW()
       WHERE id = $3 AND denuncia_id = $4 AND tenant_id = $5`,
      [
        req.body?.status ?? null,
        sanitizePlainText(req.body?.result ?? req.body?.resultado, 4000) || null,
        tid,
        id,
        tenantId,
      ],
    );
    if (!rowCount) return res.status(404).json({ error: 'Tratativa não encontrada' });

    await logDenunciaHistory(query, tenantId, id, 'TRATATIVA_ATUALIZADA', req.user, { tratativaId: tid });
    res.json(await fetchDenunciaFull(tenantId, id));
  });

  app.post('/api/denuncias/:id/evidencias', requirePermission('denuncia:investigate'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Canal de Denúncia');
    if (!tenantId) return;
    const id = requireNumericId(req, res);
    if (id === null) return;
    const descricao = sanitizePlainText(req.body?.description ?? req.body?.descricao, 4000);
    if (!descricao) return res.status(400).json({ error: 'Descrição obrigatória' });

    const exists = await query(`SELECT id FROM denuncias WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`, [id, tenantId]);
    if (!exists.rows.length) return res.status(404).json({ error: 'Denúncia não encontrada' });

    await query(
      `INSERT INTO denuncia_evidencias (tenant_id, denuncia_id, tipo, descricao, referencia, hash_sha256, meta_json, registrado_por, registrado_nome)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        tenantId,
        id,
        sanitizePlainText(req.body?.type ?? req.body?.tipo, 64) || 'DOCUMENTO',
        descricao,
        sanitizePlainText(req.body?.reference ?? req.body?.referencia, 512),
        sanitizePlainText(req.body?.hash, 128) || null,
        JSON.stringify(req.body?.meta ?? {}),
        req.user?.id ?? null,
        req.user?.name ?? req.user?.email ?? null,
      ],
    );

    await logDenunciaHistory(query, tenantId, id, 'EVIDENCIA_REGISTRADA', req.user);
    res.status(201).json(await fetchDenunciaFull(tenantId, id));
  });

  app.post('/api/denuncias/:id/integrar', requirePermission('denuncia:investigate'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Canal de Denúncia');
    if (!tenantId) return;
    const id = requireNumericId(req, res);
    if (id === null) return;

    const result = await syncDenunciaIntegrations(null, tenantId, id, req.user);
    if (!result) return res.status(404).json({ error: 'Denúncia não encontrada' });

    await logDenunciaHistory(query, tenantId, id, 'INTEGRACAO_NR01', req.user, result);
    res.json({ integration: result, denuncia: await fetchDenunciaFull(tenantId, id) });
  });

  app.patch('/api/denuncias/:id/conclusao', requirePermission('denuncia:investigate'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Canal de Denúncia');
    if (!tenantId) return;
    const id = requireNumericId(req, res);
    if (id === null) return;
    const conclusao = sanitizePlainText(req.body?.conclusion ?? req.body?.conclusao, 8000);
    if (!conclusao) return res.status(400).json({ error: 'Conclusão obrigatória' });

    const { rows } = await query(
      `UPDATE denuncias SET conclusao = $1, status = 'CONCLUIDA', updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL RETURNING id`,
      [conclusao, id, tenantId],
    );
    if (!rows.length) return res.status(404).json({ error: 'Denúncia não encontrada' });

    await logDenunciaHistory(query, tenantId, id, 'DENUNCIA_CONCLUIDA', req.user, { conclusao: conclusao.slice(0, 200) });
    res.json(await fetchDenunciaFull(tenantId, id));
  });
}
