/**
 * TenantRequest — solicitação, aprovação e gestão de onboarding
 */
import crypto from 'crypto';
import { pool, query } from '../db.js';
import { sanitizePlainText, sanitizeEmail } from '../auth/sanitize.js';
import { normalizeCnpj, formatCnpj, isValidCnpj } from '../utils/cnpj.js';
import { slugify } from '../mappers/coreMappers.js';
import { auditOnboarding } from './onboardingAudit.js';
import { createActivationToken, buildActivationUrl } from './activationService.js';
import { sendActivationEmail, sendRejectionEmail, sendAdjustmentRequestEmail } from './emailNotificationService.js';
import { getPlan } from './planService.js';

const REQUEST_STATUSES = ['PENDENTE', 'EM_ANALISE', 'APROVADO', 'REJEITADO', 'BLOQUEADO'];

function generateProtocol() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ESP-${date}-${suffix}`;
}

export function mapTenantRequest(row) {
  return {
    id: String(row.id),
    protocolo: row.protocolo,
    razaoSocial: row.razao_social,
    nomeFantasia: row.nome_fantasia,
    cnpj: row.cnpj,
    industria: row.industria,
    segmento: row.segmento,
    quantidadeFuncionarios: row.quantidade_funcionarios,
    endereco: row.endereco,
    cidade: row.cidade,
    estado: row.estado,
    pais: row.pais,
    cep: row.cep,
    telefone: row.telefone,
    email: row.email,
    responsavelNome: row.responsavel_nome,
    responsavelCargo: row.responsavel_cargo,
    responsavelEmail: row.responsavel_email,
    responsavelTelefone: row.responsavel_telefone,
    plano: row.plano_codigo,
    status: row.status,
    observacoes: row.observacoes,
    dataSolicitacao: row.data_solicitacao,
    dataAprovacao: row.data_aprovacao,
    dataRejeicao: row.data_rejeicao,
    aprovadoPor: row.aprovado_por ? String(row.aprovado_por) : null,
    tenantId: row.tenant_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createTenantRequest(body, req) {
  const cnpj = normalizeCnpj(body.cnpj);
  if (!isValidCnpj(cnpj)) {
    const err = new Error('CNPJ inválido');
    err.status = 400;
    throw err;
  }

  const email = sanitizeEmail(body.email);
  const responsavelEmail = sanitizeEmail(body.responsavelEmail ?? body.email);

  const dup = await query(
    `SELECT id, protocolo, status FROM tenant_requests
     WHERE cnpj = $1 AND status IN ('PENDENTE', 'EM_ANALISE')
     LIMIT 1`,
    [formatCnpj(cnpj)],
  );
  if (dup.rows.length) {
    const err = new Error(`Já existe solicitação em andamento (${dup.rows[0].protocolo})`);
    err.status = 409;
    throw err;
  }

  const tenantDup = await query(
    `SELECT tenant_id FROM tenants WHERE deleted_at IS NULL AND tenant_id LIKE $1 LIMIT 1`,
    [`%${cnpj.slice(0, 8)}%`],
  );
  if (tenantDup.rows.length) {
    const err = new Error('CNPJ já possui cadastro na plataforma');
    err.status = 409;
    throw err;
  }

  const protocolo = generateProtocol();
  const plano = body.plano ?? 'STARTER';
  const plan = await getPlan(plano);
  if (!plan) {
    const err = new Error('Plano inválido');
    err.status = 400;
    throw err;
  }

  const { rows } = await query(
    `INSERT INTO tenant_requests (
       protocolo, razao_social, nome_fantasia, cnpj, industria, segmento,
       quantidade_funcionarios, endereco, cidade, estado, pais, cep, telefone, email,
       responsavel_nome, responsavel_cargo, responsavel_email, responsavel_telefone,
       plano_codigo, status, observacoes
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'PENDENTE',$20
     ) RETURNING *`,
    [
      protocolo,
      sanitizePlainText(body.razaoSocial, 255),
      sanitizePlainText(body.nomeFantasia ?? body.razaoSocial, 255),
      formatCnpj(cnpj),
      sanitizePlainText(body.industria ?? body.segmento ?? 'Geral', 120),
      sanitizePlainText(body.segmento ?? 'Geral', 120),
      Number(body.quantidadeFuncionarios) || null,
      sanitizePlainText(body.endereco ?? '', 500) || null,
      sanitizePlainText(body.cidade ?? '', 120) || null,
      sanitizePlainText(body.estado ?? '', 2) || null,
      sanitizePlainText(body.pais ?? 'Brasil', 64),
      sanitizePlainText(body.cep ?? '', 16) || null,
      sanitizePlainText(body.telefone ?? body.responsavelTelefone ?? '', 32) || null,
      email,
      sanitizePlainText(body.responsavelNome, 255),
      sanitizePlainText(body.responsavelCargo ?? '', 120) || null,
      responsavelEmail,
      sanitizePlainText(body.responsavelTelefone ?? body.telefone ?? '', 32) || null,
      plano,
      sanitizePlainText(body.observacoes ?? '', 2000) || null,
    ],
  );

  await auditOnboarding('TENANT_REQUEST_CREATED', {
    req,
    requestId: rows[0].id,
    protocolo,
    details: { cnpj: formatCnpj(cnpj), email },
  });

  return mapTenantRequest(rows[0]);
}

export async function listTenantRequests(filters = {}) {
  const clauses = ['1=1'];
  const params = [];

  if (filters.status) {
    params.push(filters.status);
    clauses.push(`status = $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    clauses.push(
      `(razao_social ILIKE $${params.length} OR nome_fantasia ILIKE $${params.length} OR cnpj ILIKE $${params.length} OR protocolo ILIKE $${params.length})`,
    );
  }
  if (filters.from) {
    params.push(filters.from);
    clauses.push(`data_solicitacao >= $${params.length}::timestamptz`);
  }
  if (filters.to) {
    params.push(filters.to);
    clauses.push(`data_solicitacao <= $${params.length}::timestamptz`);
  }

  const { rows } = await query(
    `SELECT * FROM tenant_requests WHERE ${clauses.join(' AND ')}
     ORDER BY data_solicitacao DESC LIMIT 200`,
    params,
  );
  return rows.map(mapTenantRequest);
}

export async function getTenantRequestById(id) {
  const { rows } = await query(`SELECT * FROM tenant_requests WHERE id = $1`, [id]);
  return rows[0] ? mapTenantRequest(rows[0]) : null;
}

export async function approveTenantRequest(id, adminUser, req, options = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`SELECT * FROM tenant_requests WHERE id = $1 FOR UPDATE`, [id]);
    const request = rows[0];
  if (!request) {
    const err = new Error('Solicitação não encontrada');
    err.status = 404;
    throw err;
  }
  if (!['PENDENTE', 'EM_ANALISE'].includes(request.status)) {
    const err = new Error(`Solicitação não pode ser aprovada (status: ${request.status})`);
    err.status = 400;
    throw err;
  }

  let tenantId = slugify(request.nome_fantasia || request.razao_social).slice(0, 40);
  if (!tenantId) tenantId = `empresa_${Date.now().toString(36)}`;
  tenantId = `${tenantId}_${normalizeCnpj(request.cnpj).slice(0, 6)}`;

  const adminEmail = sanitizeEmail(request.responsavel_email);
  const adminNome = request.responsavel_nome;

  const exists = await client.query(`SELECT 1 FROM tenants WHERE tenant_id = $1`, [tenantId]);
    if (exists.rows.length) {
      tenantId = `${tenantId}_${Date.now().toString(36).slice(-4)}`;
    }

    await client.query(
      `INSERT INTO tenants (tenant_id, nome, industria, icone, cor, ativo, plano, plano_codigo, status_conta)
       VALUES ($1, $2, $3, '🏢', 'amber', TRUE, $4, $4, 'PENDENTE_ATIVACAO')`,
      [tenantId, request.razao_social, request.segmento ?? request.industria, request.plano_codigo],
    );

    const userResult = await client.query(
      `INSERT INTO usuarios (tenant_id, email, senha_hash, nome, perfil, cargo, ativo, pendente_ativacao)
       VALUES ($1, $2, crypt($3, gen_salt('bf', 10)), $4, 'ADMIN_EMPRESA', 'Administrador', TRUE, TRUE)
       RETURNING id`,
      [tenantId, adminEmail, crypto.randomBytes(16).toString('hex'), adminNome],
    );

    await client.query(
      `INSERT INTO setores (tenant_id, nome) VALUES ($1, 'Geral'), ($1, 'Operações'), ($1, 'Administrativo')`,
      [tenantId],
    );

    const { token, tempPassword } = await createActivationToken(
      userResult.rows[0].id,
      tenantId,
      client,
    );

    await client.query(
      `UPDATE tenant_requests SET
         status = 'APROVADO', tenant_id = $2, aprovado_por = $3,
         data_aprovacao = NOW(), observacoes = COALESCE($4, observacoes), updated_at = NOW()
       WHERE id = $1`,
      [id, tenantId, adminUser.id, options.note ?? null],
    );

    await client.query('COMMIT');

    const activationUrl = buildActivationUrl(token, options.appBaseUrl);
    await sendActivationEmail({
      to: adminEmail,
      companyName: request.razao_social,
      protocolo: request.protocolo,
      activationUrl,
      tempPassword,
    });

    await auditOnboarding('TENANT_REQUEST_APPROVED', {
      req,
      userId: adminUser.id,
      tenantId,
      requestId: id,
      protocolo: request.protocolo,
      details: { adminEmail, activationUrl },
    });

    return {
      request: await getTenantRequestById(id),
      tenantId,
      adminEmail,
      tempPassword,
      activationUrl,
      activationToken: token,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function rejectTenantRequest(id, adminUser, req, { reason } = {}) {
  const { rows } = await query(`SELECT * FROM tenant_requests WHERE id = $1`, [id]);
  if (!rows.length) {
    const err = new Error('Solicitação não encontrada');
    err.status = 404;
    throw err;
  }
  if (!['PENDENTE', 'EM_ANALISE'].includes(rows[0].status)) {
    const err = new Error('Solicitação não pode ser rejeitada');
    err.status = 400;
    throw err;
  }

  await query(
    `UPDATE tenant_requests SET status = 'REJEITADO', data_rejeicao = NOW(),
       observacoes = $2, aprovado_por = $3, updated_at = NOW() WHERE id = $1`,
    [id, sanitizePlainText(reason ?? 'Rejeitada pelo administrador', 2000), adminUser.id],
  );

  await sendRejectionEmail({
    to: rows[0].responsavel_email,
    companyName: rows[0].razao_social,
    protocolo: rows[0].protocolo,
    reason,
  });

  await auditOnboarding('TENANT_REQUEST_REJECTED', {
    req,
    userId: adminUser.id,
    requestId: id,
    protocolo: rows[0].protocolo,
    details: { reason },
  });

  return getTenantRequestById(id);
}

export async function requestAdjustment(id, adminUser, req, { message } = {}) {
  const { rows } = await query(`SELECT * FROM tenant_requests WHERE id = $1`, [id]);
  if (!rows.length) {
    const err = new Error('Solicitação não encontrada');
    err.status = 404;
    throw err;
  }

  await query(
    `UPDATE tenant_requests SET status = 'EM_ANALISE', observacoes = $2, updated_at = NOW() WHERE id = $1`,
    [id, sanitizePlainText(message ?? 'Ajuste solicitado', 2000)],
  );

  await sendAdjustmentRequestEmail({
    to: rows[0].responsavel_email,
    companyName: rows[0].razao_social,
    protocolo: rows[0].protocolo,
    message,
  });

  await auditOnboarding('TENANT_REQUEST_ADJUSTMENT', {
    req,
    userId: adminUser.id,
    requestId: id,
    protocolo: rows[0].protocolo,
    details: { message },
  });

  return getTenantRequestById(id);
}

export async function listAdminTenants(filter = 'all') {
  const clauses = [`t.deleted_at IS NULL`, `t.tenant_id NOT IN ('ergosense', 'platform')`];
  if (filter === 'active') clauses.push(`t.ativo = TRUE AND t.bloqueado = FALSE AND t.status_conta = 'ATIVO'`);
  if (filter === 'blocked') clauses.push(`(t.bloqueado = TRUE OR t.status_conta = 'BLOQUEADO')`);
  if (filter === 'expired') clauses.push(`(t.status_conta = 'EXPIRADO' OR (t.expira_em IS NOT NULL AND t.expira_em <= NOW()))`);

  const { rows } = await query(
    `SELECT t.*,
            (SELECT COUNT(*)::int FROM usuarios u WHERE u.tenant_id = t.tenant_id AND u.deleted_at IS NULL) AS user_count
     FROM tenants t
     WHERE ${clauses.join(' AND ')}
     ORDER BY t.nome`,
  );

  return rows.map((r) => ({
    id: r.tenant_id,
    name: r.nome,
    industry: r.industria,
    plan: r.plano_codigo ?? r.plano ?? 'STARTER',
    statusConta: r.status_conta ?? 'ATIVO',
    active: r.ativo,
    blocked: r.bloqueado,
    blockedAt: r.bloqueado_em,
    blockedReason: r.bloqueado_motivo,
    expiresAt: r.expira_em,
    userCount: r.user_count,
    createdAt: r.created_at,
  }));
}

export async function getAdminTenant(tenantId) {
  const { rows } = await query(
    `SELECT t.*,
            (SELECT COUNT(*)::int FROM usuarios u WHERE u.tenant_id = t.tenant_id AND u.deleted_at IS NULL) AS user_count
     FROM tenants t WHERE t.tenant_id = $1 AND t.deleted_at IS NULL`,
    [tenantId],
  );
  if (!rows.length) return null;
  const r = rows[0];
  return {
    id: r.tenant_id,
    name: r.nome,
    industry: r.industria,
    plan: r.plano_codigo ?? r.plano ?? 'STARTER',
    statusConta: r.status_conta,
    active: r.ativo,
    blocked: r.bloqueado,
    blockedAt: r.bloqueado_em,
    blockedReason: r.bloqueado_motivo,
    expiresAt: r.expira_em,
    userCount: r.user_count,
    createdAt: r.created_at,
  };
}

export async function updateAdminTenant(tenantId, body, adminUser, req) {
  const existing = await getAdminTenant(tenantId);
  if (!existing) {
    const err = new Error('Empresa não encontrada');
    err.status = 404;
    throw err;
  }

  await query(
    `UPDATE tenants SET
       nome = COALESCE($2, nome),
       industria = COALESCE($3, industria),
       plano_codigo = COALESCE($4, plano_codigo),
       plano = COALESCE($4, plano),
       expira_em = COALESCE($5, expira_em),
       updated_at = NOW()
     WHERE tenant_id = $1 AND deleted_at IS NULL`,
    [
      tenantId,
      body.name ? sanitizePlainText(body.name, 255) : null,
      body.industry ? sanitizePlainText(body.industry, 120) : null,
      body.plan ?? null,
      body.expiresAt ?? null,
    ],
  );

  await auditOnboarding('TENANT_UPDATED', {
    req,
    userId: adminUser.id,
    tenantId,
    details: body,
  });

  return getAdminTenant(tenantId);
}

export async function blockTenant(tenantId, adminUser, req, { reason } = {}) {
  await query(
    `UPDATE tenants SET bloqueado = TRUE, status_conta = 'BLOQUEADO', bloqueado_em = NOW(),
       bloqueado_por = $2, bloqueado_motivo = $3, updated_at = NOW()
     WHERE tenant_id = $1`,
    [tenantId, adminUser.id, sanitizePlainText(reason ?? 'Bloqueio administrativo', 500)],
  );

  await auditOnboarding('TENANT_BLOCKED', {
    req,
    userId: adminUser.id,
    tenantId,
    details: { reason },
  });

  return getAdminTenant(tenantId);
}

export async function reactivateTenant(tenantId, adminUser, req) {
  await query(
    `UPDATE tenants SET bloqueado = FALSE, status_conta = 'ATIVO', ativo = TRUE,
       bloqueado_em = NULL, bloqueado_por = NULL, bloqueado_motivo = NULL, updated_at = NOW()
     WHERE tenant_id = $1`,
    [tenantId],
  );

  await auditOnboarding('TENANT_REACTIVATED', {
    req,
    userId: adminUser.id,
    tenantId,
  });

  return getAdminTenant(tenantId);
}

export async function suspendTenant(tenantId, adminUser, req, { reason } = {}) {
  await query(
    `UPDATE tenants SET status_conta = 'SUSPENSO', bloqueado = TRUE, bloqueado_em = NOW(),
       bloqueado_por = $2, bloqueado_motivo = $3, updated_at = NOW()
     WHERE tenant_id = $1`,
    [tenantId, adminUser.id, sanitizePlainText(reason ?? 'Suspensão administrativa', 500)],
  );

  await auditOnboarding('TENANT_SUSPENDED', {
    req,
    userId: adminUser.id,
    tenantId,
    details: { reason },
  });

  return getAdminTenant(tenantId);
}

export { REQUEST_STATUSES };
