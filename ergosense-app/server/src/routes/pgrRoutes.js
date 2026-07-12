/**
 * PGR — Programa de Gerenciamento de Riscos
 */
import { requirePermission } from '../auth/rbac.js';
import { sanitizePlainText, sanitizeEmail } from '../auth/sanitize.js';
import { query } from '../db.js';
import { buildPgrSnapshot, formatVersionNumber } from '../services/pgrSnapshot.js';
import { logPgrHistory, mapPgrHistoryRow } from '../services/pgrHistory.js';
import { requireNumericId } from '../utils/parseId.js';

const EDITABLE_STATUSES = new Set(['RASCUNHO', 'EM_REVISAO']);
const SIGNATURE_TYPES = ['ELABORADOR', 'RESPONSAVEL_TECNICO', 'REPRESENTANTE_LEGAL', 'CIPA', 'SESMT'];

function mapProgram(row) {
  return {
    id: String(row.id),
    tenantId: row.tenant_id,
    title: row.titulo,
    description: row.descricao ?? '',
    technicalResponsible: row.responsavel_tecnico ?? '',
    legalResponsible: row.responsavel_legal ?? '',
    activeVersionId: row.versao_ativa_id ? String(row.versao_ativa_id) : null,
    activeVersionNumber: row.numero_ativo ?? null,
    activeVersionStatus: row.status_ativo ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapVersion(row) {
  return {
    id: String(row.id),
    tenantId: row.tenant_id,
    programId: String(row.programa_id),
    number: row.numero,
    sequential: row.numero_sequencial,
    status: row.status,
    snapshot: row.snapshot_json,
    preparedBy: row.elaborado_por ?? '',
    reviewedBy: row.revisado_por ?? '',
    preparedAt: row.data_elaboracao ? row.data_elaboracao.toISOString().slice(0, 10) : null,
    reviewedAt: row.data_revisao ? row.data_revisao.toISOString().slice(0, 10) : null,
    nextReviewAt: row.proxima_revisao ? row.proxima_revisao.toISOString().slice(0, 10) : null,
    reviewReason: row.motivo_revisao ?? '',
    notes: row.observacoes ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapApproval(row) {
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

function mapSignature(row) {
  return {
    id: String(row.id),
    versionId: String(row.versao_id),
    type: row.tipo,
    name: row.nome,
    role: row.cargo ?? '',
    document: row.documento ?? '',
    statement: row.declaracao ?? '',
    signedAt: row.assinado_em,
    userId: row.usuario_id ? String(row.usuario_id) : null,
  };
}

async function getOrCreateProgram(tenantId) {
  const existing = await query(
    `SELECT p.*, v.numero AS numero_ativo, v.status AS status_ativo
     FROM pgr_programas p
     LEFT JOIN pgr_versoes v ON v.id = p.versao_ativa_id
     WHERE p.tenant_id = $1 AND p.deleted_at IS NULL`,
    [tenantId],
  );
  if (existing.rows.length) return existing.rows[0];

  const { rows } = await query(
    `INSERT INTO pgr_programas (tenant_id, titulo)
     VALUES ($1, 'Programa de Gerenciamento de Riscos — NR-01')
     RETURNING *`,
    [tenantId],
  );
  return rows[0];
}

async function getVersionFull(tenantId, versionId) {
  const { rows } = await query(
    `SELECT * FROM pgr_versoes WHERE id = $1 AND tenant_id = $2`,
    [versionId, tenantId],
  );
  if (!rows.length) return null;

  const version = mapVersion(rows[0]);
  const { rows: approvals } = await query(
    `SELECT * FROM pgr_aprovacoes WHERE versao_id = $1 ORDER BY created_at`,
    [versionId],
  );
  const { rows: signatures } = await query(
    `SELECT * FROM pgr_assinaturas WHERE versao_id = $1 ORDER BY assinado_em`,
    [versionId],
  );

  return {
    ...version,
    approvals: approvals.map(mapApproval),
    signatures: signatures.map(mapSignature),
  };
}

export function registerPgrRoutes(app, { resolveOperationalTenant }) {
  app.get('/api/pgr/program', requirePermission('pgr:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'PGR');
    if (!tenantId) return;
    const program = await getOrCreateProgram(tenantId);
    res.json(mapProgram(program));
  });

  app.put('/api/pgr/program', requirePermission('pgr:update'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'PGR');
    if (!tenantId) return;
    await getOrCreateProgram(tenantId);

    const { rows } = await query(
      `UPDATE pgr_programas SET
         titulo = COALESCE($2, titulo),
         descricao = $3,
         responsavel_tecnico = $4,
         responsavel_legal = $5,
         updated_at = NOW()
       WHERE tenant_id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [
        tenantId,
        sanitizePlainText(req.body?.title, 512) || null,
        sanitizePlainText(req.body?.description, 4000) || null,
        sanitizePlainText(req.body?.technicalResponsible, 255) || null,
        sanitizePlainText(req.body?.legalResponsible, 255) || null,
      ],
    );

    await logPgrHistory({
      tenantId,
      action: 'PROGRAMA_ATUALIZADO',
      user: req.user,
    });

    const full = await query(
      `SELECT p.*, v.numero AS numero_ativo, v.status AS status_ativo
       FROM pgr_programas p LEFT JOIN pgr_versoes v ON v.id = p.versao_ativa_id
       WHERE p.id = $1`,
      [rows[0].id],
    );
    res.json(mapProgram(full.rows[0]));
  });

  app.get('/api/pgr/versions', requirePermission('pgr:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'PGR');
    if (!tenantId) return;
    const { rows } = await query(
      `SELECT id, tenant_id, programa_id, numero, numero_sequencial, status,
              elaborado_por, revisado_por, data_elaboracao, data_revisao, proxima_revisao,
              motivo_revisao, observacoes, created_at, updated_at,
              jsonb_build_object('resumo', snapshot_json->'resumo') AS snapshot_json
       FROM pgr_versoes WHERE tenant_id = $1 ORDER BY numero_sequencial DESC`,
      [tenantId],
    );
    res.json(rows.map(mapVersion));
  });

  app.get('/api/pgr/versions/:id', requirePermission('pgr:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'PGR');
    if (!tenantId) return;
    const full = await getVersionFull(tenantId, Number(req.params.id));
    if (!full) return res.status(404).json({ error: 'Versão não encontrada' });
    res.json(full);
  });

  app.post('/api/pgr/versions/generate', requirePermission('pgr:create'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'PGR');
    if (!tenantId) return;

    const program = await getOrCreateProgram(tenantId);
    const snapshot = await buildPgrSnapshot(tenantId);

    const { rows: last } = await query(
      `SELECT MAX(numero_sequencial)::int AS max_seq FROM pgr_versoes WHERE programa_id = $1`,
      [program.id],
    );
    const sequential = (last[0]?.max_seq ?? 0) + 1;
    const numero = formatVersionNumber(sequential);

    const motivo = sanitizePlainText(req.body?.reviewReason, 2000);
    const isRevision = !!req.body?.fromVersionId;

    const { rows } = await query(
      `INSERT INTO pgr_versoes (
         tenant_id, programa_id, numero, numero_sequencial, status, snapshot_json,
         elaborado_por, data_elaboracao, motivo_revisao, proxima_revisao, observacoes
       ) VALUES ($1,$2,$3,$4,'RASCUNHO',$5,$6,CURRENT_DATE,$7,$8,$9)
       RETURNING *`,
      [
        tenantId,
        program.id,
        numero,
        sequential,
        JSON.stringify(snapshot),
        req.user?.name || req.user?.email || '',
        motivo || (isRevision ? 'Revisão programada NR-01' : 'Elaboração inicial'),
        req.body?.nextReviewAt?.slice(0, 10) || null,
        sanitizePlainText(req.body?.notes, 4000) || null,
      ],
    );

    await logPgrHistory({
      tenantId,
      versionId: rows[0].id,
      action: 'VERSAO_GERADA',
      user: req.user,
      details: { numero, riscos: snapshot.inventarioRiscos.length, acoes: snapshot.planoAcao.length },
    });

    const full = await getVersionFull(tenantId, rows[0].id);
    res.status(201).json(full);
  });

  app.put('/api/pgr/versions/:id', requirePermission('pgr:update'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'PGR');
    if (!tenantId) return;
    const id = Number(req.params.id);

    const { rows: current } = await query(
      `SELECT status FROM pgr_versoes WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
    if (!current.length) return res.status(404).json({ error: 'Versão não encontrada' });
    if (!EDITABLE_STATUSES.has(current[0].status)) {
      return res.status(400).json({ error: 'Versão não editável neste status' });
    }

    let snapshotUpdate = null;
    if (req.body?.refreshSnapshot) {
      snapshotUpdate = JSON.stringify(await buildPgrSnapshot(tenantId));
    }

    await query(
      `UPDATE pgr_versoes SET
         elaborado_por = COALESCE($3, elaborado_por),
         revisado_por = $4,
         data_revisao = $5,
         proxima_revisao = $6,
         motivo_revisao = $7,
         observacoes = $8,
         snapshot_json = COALESCE($9::jsonb, snapshot_json),
         updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [
        id,
        tenantId,
        sanitizePlainText(req.body?.preparedBy, 255) || null,
        sanitizePlainText(req.body?.reviewedBy, 255) || null,
        req.body?.reviewedAt?.slice(0, 10) || null,
        req.body?.nextReviewAt?.slice(0, 10) || null,
        sanitizePlainText(req.body?.reviewReason, 2000) || null,
        sanitizePlainText(req.body?.notes, 4000) || null,
        snapshotUpdate,
      ],
    );

    await logPgrHistory({ tenantId, versionId: id, action: 'VERSAO_ATUALIZADA', user: req.user });

    const full = await getVersionFull(tenantId, id);
    res.json(full);
  });

  app.post('/api/pgr/versions/:id/submit-approval', requirePermission('pgr:update'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'PGR');
    if (!tenantId) return;
    const id = Number(req.params.id);

    const { rows } = await query(
      `SELECT status FROM pgr_versoes WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
    if (!rows.length) return res.status(404).json({ error: 'Versão não encontrada' });
    if (!EDITABLE_STATUSES.has(rows[0].status)) {
      return res.status(400).json({ error: 'Versão não pode ser enviada para aprovação' });
    }

    const approverName = sanitizePlainText(req.body?.approverName, 255);
    if (!approverName) return res.status(400).json({ error: 'Informe o aprovador' });

    await query(`UPDATE pgr_versoes SET status = 'AGUARDANDO_APROVACAO', updated_at = NOW() WHERE id = $1`, [id]);

    await query(
      `INSERT INTO pgr_aprovacoes (tenant_id, versao_id, aprovador_nome, aprovador_cargo, aprovador_email)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        tenantId,
        id,
        approverName,
        sanitizePlainText(req.body?.approverRole, 255) || null,
        sanitizeEmail(req.body?.approverEmail) || null,
      ],
    );

    await logPgrHistory({ tenantId, versionId: id, action: 'ENVIADO_APROVACAO', user: req.user });

    res.json(await getVersionFull(tenantId, id));
  });

  app.post('/api/pgr/versions/:id/approve', requirePermission('pgr:approve'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'PGR');
    if (!tenantId) return;
    const id = Number(req.params.id);

    const { rows } = await query(
      `SELECT v.status, v.programa_id FROM pgr_versoes v WHERE v.id = $1 AND v.tenant_id = $2`,
      [id, tenantId],
    );
    if (!rows.length) return res.status(404).json({ error: 'Versão não encontrada' });
    if (rows[0].status !== 'AGUARDANDO_APROVACAO') {
      return res.status(400).json({ error: 'Versão não está aguardando aprovação' });
    }

    await query(
      `UPDATE pgr_aprovacoes SET status = 'APROVADO', data_decisao = NOW(),
         observacao = $2 WHERE versao_id = $1 AND status = 'PENDENTE'`,
      [id, sanitizePlainText(req.body?.notes, 2000) || null],
    );

    await query(
      `UPDATE pgr_versoes SET status = 'APROVADO', data_revisao = CURRENT_DATE, updated_at = NOW() WHERE id = $1`,
      [id],
    );

    await query(
      `UPDATE pgr_versoes SET status = 'OBSOLETO', updated_at = NOW()
       WHERE programa_id = $1 AND id != $2 AND status = 'APROVADO'`,
      [rows[0].programa_id, id],
    );

    await query(
      `UPDATE pgr_programas SET versao_ativa_id = $1, updated_at = NOW() WHERE id = $2`,
      [id, rows[0].programa_id],
    );

    await logPgrHistory({ tenantId, versionId: id, action: 'VERSAO_APROVADA', user: req.user });

    res.json(await getVersionFull(tenantId, id));
  });

  app.post('/api/pgr/versions/:id/reject', requirePermission('pgr:approve'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'PGR');
    if (!tenantId) return;
    const id = requireNumericId(req, res);
    if (id === null) return;

    const { rows: ver } = await query(
      `SELECT id FROM pgr_versoes WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
    if (!ver.length) return res.status(404).json({ error: 'Versão não encontrada' });

    await query(
      `UPDATE pgr_aprovacoes SET status = 'REJEITADO', data_decisao = NOW(), observacao = $2
       WHERE versao_id = $1 AND status = 'PENDENTE'`,
      [id, sanitizePlainText(req.body?.notes, 2000) || 'Rejeitado'],
    );

    await query(`UPDATE pgr_versoes SET status = 'EM_REVISAO', updated_at = NOW() WHERE id = $1`, [id]);

    await logPgrHistory({ tenantId, versionId: id, action: 'VERSAO_REJEITADA', user: req.user });

    res.json(await getVersionFull(tenantId, id));
  });

  app.post('/api/pgr/versions/:id/sign', requirePermission('pgr:update'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'PGR');
    if (!tenantId) return;
    const id = Number(req.params.id);
    const tipo = String(req.body?.type ?? '').toUpperCase();
    const nome = sanitizePlainText(req.body?.name, 255);

    if (!SIGNATURE_TYPES.includes(tipo) || !nome) {
      return res.status(400).json({ error: 'Informe type e name válidos' });
    }

    const { rows: ver } = await query(`SELECT status FROM pgr_versoes WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    if (!ver.length) return res.status(404).json({ error: 'Versão não encontrada' });

    const declaracao =
      sanitizePlainText(req.body?.statement, 2000) ||
      `Declaro ter ciência e responsabilidade sobre o conteúdo deste PGR (versão), conforme NR-01.`;

    const { rows } = await query(
      `INSERT INTO pgr_assinaturas (tenant_id, versao_id, tipo, nome, cargo, documento, declaracao, usuario_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [
        tenantId,
        id,
        tipo,
        nome,
        sanitizePlainText(req.body?.role, 255) || null,
        sanitizePlainText(req.body?.document, 64) || null,
        declaracao,
        req.user?.id ?? null,
      ],
    );

    await logPgrHistory({
      tenantId,
      versionId: id,
      action: 'ASSINATURA_REGISTRADA',
      user: req.user,
      details: { tipo, nome },
    });

    const { rows: sig } = await query(`SELECT * FROM pgr_assinaturas WHERE id = $1`, [rows[0].id]);
    res.status(201).json(mapSignature(sig[0]));
  });

  app.post('/api/pgr/versions/:id/revision', requirePermission('pgr:create'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'PGR');
    if (!tenantId) return;
    const fromId = Number(req.params.id);

    const { rows: fromVer } = await query(
      `SELECT numero, programa_id FROM pgr_versoes WHERE id = $1 AND tenant_id = $2`,
      [fromId, tenantId],
    );
    if (!fromVer.length) return res.status(404).json({ error: 'Versão base não encontrada' });

    const program = await getOrCreateProgram(tenantId);
    const snapshot = await buildPgrSnapshot(tenantId);

    const { rows: last } = await query(
      `SELECT MAX(numero_sequencial)::int AS max_seq FROM pgr_versoes WHERE programa_id = $1`,
      [program.id],
    );
    const sequential = (last[0]?.max_seq ?? 0) + 1;
    const numero = formatVersionNumber(sequential);
    const motivo =
      sanitizePlainText(req.body?.reviewReason, 2000) ||
      `Revisão da versão ${fromVer[0].numero} — NR-01`;

    const { rows } = await query(
      `INSERT INTO pgr_versoes (
         tenant_id, programa_id, numero, numero_sequencial, status, snapshot_json,
         elaborado_por, data_elaboracao, motivo_revisao, proxima_revisao, observacoes
       ) VALUES ($1,$2,$3,$4,'EM_REVISAO',$5,$6,CURRENT_DATE,$7,$8,$9)
       RETURNING id`,
      [
        tenantId,
        program.id,
        numero,
        sequential,
        JSON.stringify(snapshot),
        req.user?.name || req.user?.email || '',
        motivo,
        req.body?.nextReviewAt?.slice(0, 10) || null,
        sanitizePlainText(req.body?.notes, 4000) || null,
      ],
    );

    await logPgrHistory({
      tenantId,
      versionId: rows[0].id,
      action: 'REVISAO_INICIADA',
      user: req.user,
      details: { fromVersionId: fromId, numero },
    });

    res.status(201).json(await getVersionFull(tenantId, rows[0].id));
  });

  app.get('/api/pgr/history', requirePermission('pgr:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'PGR');
    if (!tenantId) return;
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const { rows } = await query(
      `SELECT h.*, v.numero FROM pgr_historico h
       LEFT JOIN pgr_versoes v ON v.id = h.versao_id
       WHERE h.tenant_id = $1 ORDER BY h.created_at DESC LIMIT $2`,
      [tenantId, limit],
    );
    res.json(rows.map(mapPgrHistoryRow));
  });
}
