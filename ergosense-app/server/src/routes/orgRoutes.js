/**
 * Estrutura Organizacional NR-01 — APIs REST
 */
import { requirePermission } from '../auth/rbac.js';
import { sanitizePlainText } from '../auth/sanitize.js';
import { query } from '../db.js';
import {
  buildOrgTree,
  ensureEmpresaUnidade,
  mapAtividade,
  mapEmpresa,
  mapFuncao,
  mapPosto,
  mapSetor,
  mapUnidade,
} from '../services/orgUtils.js';

function parseId(param) {
  const id = Number(param);
  return id > 0 ? id : null;
}

export function registerOrgRoutes(app, { resolveOperationalTenant }) {
  app.get('/api/org/tree', requirePermission('org:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Estrutura Organizacional');
    if (!tenantId) return;
    res.json(await buildOrgTree(tenantId));
  });

  app.get('/api/org/empresa', requirePermission('org:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Estrutura Organizacional');
    if (!tenantId) return;
    const { empresa } = await ensureEmpresaUnidade(query, tenantId);
    res.json(mapEmpresa(empresa));
  });

  app.put('/api/org/empresa', requirePermission('org:update'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Estrutura Organizacional');
    if (!tenantId) return;
    await ensureEmpresaUnidade(query, tenantId);
    const razao = sanitizePlainText(req.body?.legalName ?? req.body?.razaoSocial, 255);
    const fantasia = sanitizePlainText(req.body?.tradeName ?? req.body?.nomeFantasia, 255);
    const cnpj = sanitizePlainText(req.body?.cnpj, 18);
    const ie = sanitizePlainText(req.body?.stateRegistration ?? req.body?.inscricaoEstadual, 32);
    const { rows } = await query(
      `UPDATE empresas SET
         razao_social = COALESCE(NULLIF($2, ''), razao_social),
         nome_fantasia = COALESCE(NULLIF($3, ''), nome_fantasia),
         cnpj = COALESCE(NULLIF($4, ''), cnpj),
         inscricao_estadual = COALESCE(NULLIF($5, ''), inscricao_estadual),
         updated_at = NOW()
       WHERE tenant_id = $1 AND deleted_at IS NULL RETURNING *`,
      [tenantId, razao, fantasia, cnpj, ie],
    );
    res.json(mapEmpresa(rows[0]));
  });

  app.get('/api/org/unidades', requirePermission('org:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Estrutura Organizacional');
    if (!tenantId) return;
    const { rows } = await query(
      `SELECT * FROM unidades WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY nome`,
      [tenantId],
    );
    res.json(rows.map(mapUnidade));
  });

  app.post('/api/org/unidades', requirePermission('org:create'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Estrutura Organizacional');
    if (!tenantId) return;
    const nome = sanitizePlainText(req.body?.name ?? req.body?.nome, 255);
    if (!nome) return res.status(400).json({ error: 'Nome da unidade é obrigatório' });
    const { empresa } = await ensureEmpresaUnidade(query, tenantId);
    const tipo = ['MATRIZ', 'FILIAL', 'OBRA', 'UNIDADE_OPERACIONAL'].includes(req.body?.type)
      ? req.body.type
      : 'FILIAL';
    const { rows } = await query(
      `INSERT INTO unidades (tenant_id, empresa_id, nome, tipo, cnpj, endereco, cidade, uf, ativo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE) RETURNING *`,
      [
        tenantId,
        empresa.id,
        nome,
        tipo,
        sanitizePlainText(req.body?.cnpj, 18) || null,
        sanitizePlainText(req.body?.address ?? req.body?.endereco, 500) || null,
        sanitizePlainText(req.body?.city ?? req.body?.cidade, 128) || null,
        sanitizePlainText(req.body?.state ?? req.body?.uf, 2) || null,
      ],
    );
    res.status(201).json(mapUnidade(rows[0]));
  });

  app.put('/api/org/unidades/:id', requirePermission('org:update'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Estrutura Organizacional');
    if (!tenantId) return;
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    const { rows } = await query(
      `UPDATE unidades SET
         nome = COALESCE(NULLIF($3, ''), nome),
         tipo = COALESCE($4, tipo),
         cnpj = COALESCE($5, cnpj),
         endereco = COALESCE($6, endereco),
         cidade = COALESCE($7, cidade),
         uf = COALESCE($8, uf),
         ativo = COALESCE($9, ativo),
         updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING *`,
      [
        id,
        tenantId,
        sanitizePlainText(req.body?.name ?? req.body?.nome, 255),
        req.body?.type ?? null,
        sanitizePlainText(req.body?.cnpj, 18) || null,
        sanitizePlainText(req.body?.address ?? req.body?.endereco, 500) || null,
        sanitizePlainText(req.body?.city ?? req.body?.cidade, 128) || null,
        sanitizePlainText(req.body?.state ?? req.body?.uf, 2) || null,
        req.body?.active ?? null,
      ],
    );
    if (!rows.length) return res.status(404).json({ error: 'Unidade não encontrada' });
    res.json(mapUnidade(rows[0]));
  });

  app.delete('/api/org/unidades/:id', requirePermission('org:delete'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Estrutura Organizacional');
    if (!tenantId) return;
    const id = parseId(req.params.id);
    const { rows } = await query(
      `UPDATE unidades SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING id`,
      [id, tenantId],
    );
    if (!rows.length) return res.status(404).json({ error: 'Unidade não encontrada' });
    res.json({ ok: true, id: String(rows[0].id) });
  });

  app.get('/api/org/setores', requirePermission('org:read'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Estrutura Organizacional');
    if (!tenantId) return;
    const unitId = req.query.unitId ? Number(req.query.unitId) : null;
    const params = [tenantId];
    let sql = `SELECT s.*, u.nome AS unidade_nome FROM setores s
               LEFT JOIN unidades u ON u.id = s.unidade_id
               WHERE s.tenant_id = $1 AND s.deleted_at IS NULL`;
    if (unitId) {
      params.push(unitId);
      sql += ` AND s.unidade_id = $${params.length}`;
    }
    sql += ' ORDER BY s.nome';
    const { rows } = await query(sql, params);
    res.json(rows.map(mapSetor));
  });

  app.post('/api/org/setores', requirePermission('org:create'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Estrutura Organizacional');
    if (!tenantId) return;
    const nome = sanitizePlainText(req.body?.name ?? req.body?.nome, 255);
    if (!nome) return res.status(400).json({ error: 'Nome do setor é obrigatório' });
    const { unidade } = await ensureEmpresaUnidade(query, tenantId);
    let unidadeId = req.body?.unitId ? Number(req.body.unitId) : unidade.id;
    const { rows } = await query(
      `INSERT INTO setores (tenant_id, unidade_id, nome, descricao, responsavel, ativo)
       VALUES ($1,$2,$3,$4,$5,TRUE)
       ON CONFLICT (tenant_id, nome) DO UPDATE SET
         unidade_id = COALESCE(EXCLUDED.unidade_id, setores.unidade_id),
         descricao = COALESCE(EXCLUDED.descricao, setores.descricao),
         responsavel = COALESCE(EXCLUDED.responsavel, setores.responsavel),
         updated_at = NOW()
       RETURNING *`,
      [
        tenantId,
        unidadeId,
        nome,
        sanitizePlainText(req.body?.description ?? req.body?.descricao, 1000) || null,
        sanitizePlainText(req.body?.manager ?? req.body?.responsavel, 255) || null,
      ],
    );
    const full = await query(
      `SELECT s.*, u.nome AS unidade_nome FROM setores s LEFT JOIN unidades u ON u.id = s.unidade_id WHERE s.id = $1`,
      [rows[0].id],
    );
    res.status(201).json(mapSetor(full.rows[0]));
  });

  app.put('/api/org/setores/:id', requirePermission('org:update'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Estrutura Organizacional');
    if (!tenantId) return;
    const id = parseId(req.params.id);
    const { rows } = await query(
      `UPDATE setores SET
         nome = COALESCE(NULLIF($3, ''), nome),
         unidade_id = COALESCE($4, unidade_id),
         descricao = COALESCE($5, descricao),
         responsavel = COALESCE($6, responsavel),
         ativo = COALESCE($7, ativo),
         updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING *`,
      [
        id,
        tenantId,
        sanitizePlainText(req.body?.name ?? req.body?.nome, 255),
        req.body?.unitId ? Number(req.body.unitId) : null,
        sanitizePlainText(req.body?.description ?? req.body?.descricao, 1000) || null,
        sanitizePlainText(req.body?.manager ?? req.body?.responsavel, 255) || null,
        req.body?.active ?? null,
      ],
    );
    if (!rows.length) return res.status(404).json({ error: 'Setor não encontrado' });
    const full = await query(
      `SELECT s.*, u.nome AS unidade_nome FROM setores s LEFT JOIN unidades u ON u.id = s.unidade_id WHERE s.id = $1`,
      [rows[0].id],
    );
    res.json(mapSetor(full.rows[0]));
  });

  app.delete('/api/org/setores/:id', requirePermission('org:delete'), async (req, res) => {
    const tenantId = await resolveOperationalTenant(req, res, 'Estrutura Organizacional');
    if (!tenantId) return;
    const id = parseId(req.params.id);
    const { rows } = await query(
      `UPDATE setores SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING id`,
      [id, tenantId],
    );
    if (!rows.length) return res.status(404).json({ error: 'Setor não encontrado' });
    res.json({ ok: true, id: String(rows[0].id) });
  });

  const entityCrud = [
    {
      path: 'funcoes',
      table: 'funcoes',
      parentCol: 'setor_id',
      parentQuery: 'setorId',
      parentTable: 'setores',
      map: mapFuncao,
      join: 'JOIN setores s ON s.id = f.setor_id',
      alias: 'f',
      extraSelect: 's.nome AS setor_nome',
      nameField: 'nome',
    },
    {
      path: 'atividades',
      table: 'atividades',
      parentCol: 'funcao_id',
      parentQuery: 'functionId',
      parentTable: 'funcoes',
      map: mapAtividade,
      join: 'JOIN funcoes f ON f.id = a.funcao_id',
      alias: 'a',
      extraSelect: 'f.nome AS funcao_nome',
      nameField: 'nome',
    },
    {
      path: 'postos',
      table: 'postos_trabalho',
      parentCol: 'atividade_id',
      parentQuery: 'activityId',
      parentTable: 'atividades',
      map: mapPosto,
      join: 'JOIN atividades a ON a.id = p.atividade_id',
      alias: 'p',
      extraSelect: 'a.nome AS atividade_nome',
      nameField: 'nome',
    },
  ];

  for (const ent of entityCrud) {
    app.get(`/api/org/${ent.path}`, requirePermission('org:read'), async (req, res) => {
      const tenantId = await resolveOperationalTenant(req, res, 'Estrutura Organizacional');
      if (!tenantId) return;
      const parentId = req.query[ent.parentQuery] ? Number(req.query[ent.parentQuery]) : null;
      const params = [tenantId];
      let sql = `SELECT ${ent.alias}.*, ${ent.extraSelect} FROM ${ent.table} ${ent.alias}
                 ${ent.join} WHERE ${ent.alias}.tenant_id = $1 AND ${ent.alias}.deleted_at IS NULL`;
      if (parentId) {
        params.push(parentId);
        sql += ` AND ${ent.alias}.${ent.parentCol} = $${params.length}`;
      }
      sql += ` ORDER BY ${ent.alias}.${ent.nameField}`;
      const { rows } = await query(sql, params);
      res.json(rows.map(ent.map));
    });

    app.post(`/api/org/${ent.path}`, requirePermission('org:create'), async (req, res) => {
      const tenantId = await resolveOperationalTenant(req, res, 'Estrutura Organizacional');
      if (!tenantId) return;
      const nome = sanitizePlainText(req.body?.name ?? req.body?.nome, 255);
      const pid = Number(
        req.body?.sectorId ??
          req.body?.functionId ??
          req.body?.activityId ??
          req.body?.parentId,
      );
      if (!nome || !pid) return res.status(400).json({ error: 'Nome e vínculo pai são obrigatórios' });

      const parentCheck = await query(
        `SELECT id FROM ${ent.parentTable} WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [pid, tenantId],
      );
      if (!parentCheck.rows.length) return res.status(400).json({ error: 'Entidade pai inválida' });

      const { rows } = await query(
        `INSERT INTO ${ent.table} (tenant_id, ${ent.parentCol}, ${ent.nameField}, descricao, ativo)
         VALUES ($1,$2,$3,$4,TRUE)
         ON CONFLICT (tenant_id, ${ent.parentCol}, ${ent.nameField}) DO UPDATE SET updated_at = NOW()
         RETURNING *`,
        [tenantId, pid, nome, sanitizePlainText(req.body?.description ?? req.body?.descricao, 1000) || null],
      );
      const full = await query(
        `SELECT ${ent.alias}.*, ${ent.extraSelect} FROM ${ent.table} ${ent.alias} ${ent.join} WHERE ${ent.alias}.id = $1`,
        [rows[0].id],
      );
      res.status(201).json(ent.map(full.rows[0]));
    });

    app.put(`/api/org/${ent.path}/:id`, requirePermission('org:update'), async (req, res) => {
      const tenantId = await resolveOperationalTenant(req, res, 'Estrutura Organizacional');
      if (!tenantId) return;
      const id = parseId(req.params.id);
      const { rows } = await query(
        `UPDATE ${ent.table} SET
           ${ent.nameField} = COALESCE(NULLIF($3, ''), ${ent.nameField}),
           descricao = COALESCE($4, descricao),
           ativo = COALESCE($5, ativo),
           updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING *`,
        [
          id,
          tenantId,
          sanitizePlainText(req.body?.name ?? req.body?.nome, 255),
          sanitizePlainText(req.body?.description ?? req.body?.descricao, 1000) || null,
          req.body?.active ?? null,
        ],
      );
      if (!rows.length) return res.status(404).json({ error: 'Registro não encontrado' });
      const full = await query(
        `SELECT ${ent.alias}.*, ${ent.extraSelect} FROM ${ent.table} ${ent.alias} ${ent.join} WHERE ${ent.alias}.id = $1`,
        [rows[0].id],
      );
      res.json(ent.map(full.rows[0]));
    });

    app.delete(`/api/org/${ent.path}/:id`, requirePermission('org:delete'), async (req, res) => {
      const tenantId = await resolveOperationalTenant(req, res, 'Estrutura Organizacional');
      if (!tenantId) return;
      const id = parseId(req.params.id);
      const { rows } = await query(
        `UPDATE ${ent.table} SET deleted_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING id`,
        [id, tenantId],
      );
      if (!rows.length) return res.status(404).json({ error: 'Registro não encontrado' });
      res.json({ ok: true, id: String(rows[0].id) });
    });
  }
}
