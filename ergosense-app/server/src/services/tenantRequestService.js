/**
 * TenantRequest — solicitação, aprovação e gestão de onboarding
 */
import crypto from 'crypto';
import { pool, query } from '../db.js';
import { sanitizePlainText, sanitizeEmail } from '../auth/sanitize.js';
import { normalizeCnpj, formatCnpj, isValidCnpj } from '../utils/cnpj.js';
import { normalizeCpf, formatCpf, isValidCpf } from '../utils/cpf.js';
import { validatePassword } from '../auth/password.js';
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

function formatCep(value) {
  const d = String(value ?? '').replace(/\D/g, '').slice(0, 8);
  if (d.length !== 8) return d || null;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function composeEndereco({ logradouro, numero, complemento, bairro, endereco }) {
  if (endereco) return sanitizePlainText(endereco, 500);
  const parts = [
    logradouro ? sanitizePlainText(logradouro, 255) : null,
    numero ? `nº ${sanitizePlainText(numero, 32)}` : null,
    complemento ? sanitizePlainText(complemento, 120) : null,
    bairro ? sanitizePlainText(bairro, 120) : null,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

export function mapTenantRequest(row) {
  return {
    id: String(row.id),
    protocolo: row.protocolo,
    tipoCadastro: row.tipo_pessoa || 'EMPRESA',
    razaoSocial: row.razao_social,
    nomeFantasia: row.nome_fantasia,
    cnpj: row.cnpj,
    cpf: row.cpf,
    industria: row.industria,
    segmento: row.segmento,
    quantidadeFuncionarios: row.quantidade_funcionarios,
    endereco: row.endereco,
    logradouro: row.logradouro,
    numero: row.numero,
    complemento: row.complemento,
    bairro: row.bairro,
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
  const tipoCadastro = body.tipoCadastro === 'AUTONOMO' ? 'AUTONOMO' : 'EMPRESA';
  const email = sanitizeEmail(body.email);
  const responsavelEmail = sanitizeEmail(body.responsavelEmail ?? body.email);

  let cnpjFormatted = null;
  let cpfFormatted = null;
  let docKey = '';

  if (tipoCadastro === 'AUTONOMO') {
    const cpf = normalizeCpf(body.cpf);
    if (!isValidCpf(cpf)) {
      const err = new Error('CPF inválido');
      err.status = 400;
      throw err;
    }
    cpfFormatted = formatCpf(cpf);
    docKey = cpf;

    const dup = await query(
      `SELECT id, protocolo FROM tenant_requests
       WHERE cpf = $1 AND status IN ('PENDENTE', 'EM_ANALISE')
       LIMIT 1`,
      [cpfFormatted],
    );
    if (dup.rows.length) {
      const err = new Error(`Já existe solicitação em andamento (${dup.rows[0].protocolo})`);
      err.status = 409;
      throw err;
    }

    const empDup = await query(
      `SELECT tenant_id FROM empresas WHERE deleted_at IS NULL AND cpf = $1 LIMIT 1`,
      [cpfFormatted],
    );
    if (empDup.rows.length) {
      const err = new Error('CPF já possui cadastro na plataforma');
      err.status = 409;
      throw err;
    }
  } else {
    const cnpj = normalizeCnpj(body.cnpj);
    if (!isValidCnpj(cnpj)) {
      const err = new Error('CNPJ inválido');
      err.status = 400;
      throw err;
    }
    cnpjFormatted = formatCnpj(cnpj);
    docKey = cnpj;

    const dup = await query(
      `SELECT id, protocolo, status FROM tenant_requests
       WHERE cnpj = $1 AND status IN ('PENDENTE', 'EM_ANALISE')
       LIMIT 1`,
      [cnpjFormatted],
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
  }

  const protocolo = generateProtocol();
  const plano = body.plano ?? 'STARTER';
  const plan = await getPlan(plano);
  if (!plan) {
    const err = new Error('Plano inválido');
    err.status = 400;
    throw err;
  }

  const logradouro = sanitizePlainText(body.logradouro ?? '', 255) || null;
  const numero = sanitizePlainText(body.numero ?? '', 32) || null;
  const complemento = sanitizePlainText(body.complemento ?? '', 120) || null;
  const bairro = sanitizePlainText(body.bairro ?? '', 120) || null;
  const endereco = composeEndereco({
    logradouro,
    numero,
    complemento,
    bairro,
    endereco: body.endereco,
  });

  const nomePrincipal = sanitizePlainText(body.razaoSocial, 255);
  const responsavelNome =
    tipoCadastro === 'AUTONOMO'
      ? sanitizePlainText(body.responsavelNome || body.razaoSocial, 255)
      : sanitizePlainText(body.responsavelNome, 255);

  let senhaHash = null;
  if (body.password !== body.confirmPassword) {
    const err = new Error('Senhas não conferem');
    err.status = 400;
    throw err;
  }
  const pwdCheck = validatePassword(body.password);
  if (!pwdCheck.ok) {
    const err = new Error(pwdCheck.error);
    err.status = 400;
    throw err;
  }
  const hashResult = await query(`SELECT crypt($1, gen_salt('bf', 10)) AS hash`, [body.password]);
  senhaHash = hashResult.rows[0]?.hash ?? null;

  const { rows } = await query(
    `INSERT INTO tenant_requests (
       protocolo, tipo_pessoa, razao_social, nome_fantasia, cnpj, cpf, industria, segmento,
       quantidade_funcionarios, endereco, logradouro, numero, complemento, bairro,
       cidade, estado, pais, cep, telefone, email,
       responsavel_nome, responsavel_cargo, responsavel_email, responsavel_telefone,
       plano_codigo, status, observacoes, senha_hash
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,'PENDENTE',$26,$27
     ) RETURNING *`,
    [
      protocolo,
      tipoCadastro,
      nomePrincipal,
      sanitizePlainText(body.nomeFantasia ?? body.razaoSocial, 255),
      cnpjFormatted,
      cpfFormatted,
      sanitizePlainText(body.industria ?? body.segmento ?? (tipoCadastro === 'AUTONOMO' ? 'Autônomo' : 'Geral'), 120),
      sanitizePlainText(body.segmento ?? (tipoCadastro === 'AUTONOMO' ? 'Autônomo' : 'Geral'), 120),
      Number(body.quantidadeFuncionarios) || (tipoCadastro === 'AUTONOMO' ? 1 : null),
      endereco,
      logradouro,
      numero,
      complemento,
      bairro,
      sanitizePlainText(body.cidade ?? '', 120) || null,
      sanitizePlainText(body.estado ?? '', 2)?.toUpperCase() || null,
      sanitizePlainText(body.pais ?? 'Brasil', 64),
      formatCep(body.cep),
      sanitizePlainText(body.telefone ?? body.responsavelTelefone ?? '', 32) || null,
      email,
      responsavelNome,
      sanitizePlainText(body.responsavelCargo ?? (tipoCadastro === 'AUTONOMO' ? 'Autônomo' : ''), 120) || null,
      responsavelEmail,
      sanitizePlainText(body.responsavelTelefone ?? body.telefone ?? '', 32) || null,
      plano,
      sanitizePlainText(body.observacoes ?? '', 2000) || null,
      senhaHash,
    ],
  );

  await auditOnboarding('TENANT_REQUEST_CREATED', {
    req,
    requestId: rows[0].id,
    protocolo,
    details: {
      tipoCadastro,
      cnpj: cnpjFormatted,
      cpf: cpfFormatted,
      email,
      docKey: docKey.slice(0, 6),
    },
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
      `(razao_social ILIKE $${params.length} OR nome_fantasia ILIKE $${params.length} OR cnpj ILIKE $${params.length} OR cpf ILIKE $${params.length} OR protocolo ILIKE $${params.length})`,
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
  if (!['PENDENTE', 'EM_ANALISE', 'REJEITADO'].includes(request.status)) {
    const err = new Error(`Solicitação não pode ser aprovada (status: ${request.status})`);
    err.status = 400;
    throw err;
  }

  const isAutonomo = (request.tipo_pessoa || 'EMPRESA') === 'AUTONOMO';
  const docSuffix = isAutonomo
    ? normalizeCpf(request.cpf).slice(0, 6)
    : normalizeCnpj(request.cnpj).slice(0, 6);

  let tenantId = slugify(request.nome_fantasia || request.razao_social).slice(0, 40);
  if (!tenantId) tenantId = isAutonomo ? `autonomo_${Date.now().toString(36)}` : `empresa_${Date.now().toString(36)}`;
  tenantId = `${tenantId}_${docSuffix || Date.now().toString(36).slice(-6)}`;

  const adminEmail = sanitizeEmail(request.responsavel_email);
  const adminNome = request.responsavel_nome;

  const exists = await client.query(`SELECT 1 FROM tenants WHERE tenant_id = $1`, [tenantId]);
    if (exists.rows.length) {
      tenantId = `${tenantId}_${Date.now().toString(36).slice(-4)}`;
    }

    await client.query(
      `INSERT INTO tenants (tenant_id, nome, industria, icone, cor, ativo, plano, plano_codigo, status_conta)
       VALUES ($1, $2, $3, $4, 'amber', TRUE, $5, $5, 'PENDENTE_ATIVACAO')`,
      [
        tenantId,
        request.razao_social,
        request.segmento ?? request.industria,
        isAutonomo ? '👤' : '🏢',
        request.plano_codigo,
      ],
    );

    await client.query(
      `INSERT INTO empresas (
         tenant_id, razao_social, nome_fantasia, cnpj, cpf,
         logradouro, numero, complemento, bairro, cidade, estado, cep, telefone, ativo
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,TRUE)
       ON CONFLICT (tenant_id) DO UPDATE SET
         razao_social = EXCLUDED.razao_social,
         nome_fantasia = EXCLUDED.nome_fantasia,
         cnpj = EXCLUDED.cnpj,
         cpf = EXCLUDED.cpf,
         logradouro = EXCLUDED.logradouro,
         numero = EXCLUDED.numero,
         complemento = EXCLUDED.complemento,
         bairro = EXCLUDED.bairro,
         cidade = EXCLUDED.cidade,
         estado = EXCLUDED.estado,
         cep = EXCLUDED.cep,
         telefone = EXCLUDED.telefone,
         updated_at = NOW(),
         deleted_at = NULL`,
      [
        tenantId,
        request.razao_social,
        request.nome_fantasia,
        request.cnpj || null,
        request.cpf || null,
        request.logradouro || null,
        request.numero || null,
        request.complemento || null,
        request.bairro || null,
        request.cidade || null,
        request.estado || null,
        request.cep || null,
        request.telefone || null,
      ],
    );

    const hasPresetPassword = Boolean(request.senha_hash);
    const userResult = await client.query(
      hasPresetPassword
        ? `INSERT INTO usuarios (tenant_id, email, senha_hash, nome, perfil, cargo, ativo, pendente_ativacao)
           VALUES ($1, $2, $3, $4, 'ADMIN_EMPRESA', $5, TRUE, TRUE)
           RETURNING id`
        : `INSERT INTO usuarios (tenant_id, email, senha_hash, nome, perfil, cargo, ativo, pendente_ativacao)
           VALUES ($1, $2, crypt($3, gen_salt('bf', 10)), $4, 'ADMIN_EMPRESA', $5, TRUE, TRUE)
           RETURNING id`,
      [
        tenantId,
        adminEmail,
        hasPresetPassword ? request.senha_hash : crypto.randomBytes(16).toString('hex'),
        adminNome,
        isAutonomo ? 'Autônomo' : 'Administrador',
      ],
    );

    await client.query(
      `INSERT INTO setores (tenant_id, nome) VALUES ($1, 'Geral'), ($1, 'Operações'), ($1, 'Administrativo')`,
      [tenantId],
    );

    const { token, tempPassword } = await createActivationToken(
      userResult.rows[0].id,
      tenantId,
      client,
      { passwordPreset: hasPresetPassword },
    );

    await client.query(
      `UPDATE tenant_requests SET
         status = 'APROVADO', tenant_id = $2, aprovado_por = $3,
         data_aprovacao = NOW(), data_rejeicao = NULL,
         observacoes = COALESCE($4, observacoes),
         senha_hash = NULL, updated_at = NOW()
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
  if (!['PENDENTE', 'EM_ANALISE', 'REJEITADO'].includes(rows[0].status)) {
    const err = new Error(`Solicitação não pode ser reaberta (status: ${rows[0].status})`);
    err.status = 400;
    throw err;
  }

  await query(
    `UPDATE tenant_requests SET status = 'EM_ANALISE', data_rejeicao = NULL,
       observacoes = $2, updated_at = NOW() WHERE id = $1`,
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
  if (filter === 'blocked') clauses.push(`(t.bloqueado = TRUE OR t.status_conta IN ('BLOQUEADO', 'SUSPENSO'))`);
  if (filter === 'expired') clauses.push(`(t.status_conta = 'EXPIRADO' OR (t.expira_em IS NOT NULL AND t.expira_em <= NOW()))`);
  if (filter === 'pending') {
    clauses.push(`t.status_conta IN ('PENDENTE_ATIVACAO', 'INATIVO') AND t.bloqueado = FALSE`);
  }
  if (filter === 'inactive') clauses.push(`t.status_conta = 'INATIVO'`);

  const { rows } = await query(
    `SELECT t.*,
            e.razao_social, e.nome_fantasia, e.cnpj,
            (SELECT COUNT(*)::int FROM usuarios u WHERE u.tenant_id = t.tenant_id AND u.deleted_at IS NULL) AS user_count
     FROM tenants t
     LEFT JOIN empresas e ON e.tenant_id = t.tenant_id AND e.deleted_at IS NULL
     WHERE ${clauses.join(' AND ')}
     ORDER BY t.nome`,
  );

  return rows.map(mapAdminTenantRow);
}

function mapAdminTenantRow(r) {
  return {
    id: r.tenant_id,
    name: r.nome,
    industry: r.industria ?? '',
    icon: r.icone ?? '🏢',
    color: r.cor ?? 'neutral',
    plan: r.plano_codigo ?? r.plano ?? 'STARTER',
    statusConta: r.status_conta ?? 'ATIVO',
    active: r.ativo,
    blocked: r.bloqueado,
    blockedAt: r.bloqueado_em,
    blockedReason: r.bloqueado_motivo,
    expiresAt: r.expira_em,
    userCount: r.user_count ?? 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    razaoSocial: r.razao_social ?? r.nome,
    nomeFantasia: r.nome_fantasia ?? null,
    cnpj: r.cnpj ?? null,
    inscricaoEstadual: r.inscricao_estadual ?? null,
    supportAuthorized: Boolean(r.suporte_autorizado),
    supportExpiresAt: r.suporte_expira_em ?? null,
  };
}

export async function getAdminTenant(tenantId) {
  const { rows } = await query(
    `SELECT t.*,
            e.razao_social, e.nome_fantasia, e.cnpj, e.inscricao_estadual,
            (SELECT COUNT(*)::int FROM usuarios u WHERE u.tenant_id = t.tenant_id AND u.deleted_at IS NULL) AS user_count
     FROM tenants t
     LEFT JOIN empresas e ON e.tenant_id = t.tenant_id AND e.deleted_at IS NULL
     WHERE t.tenant_id = $1 AND t.deleted_at IS NULL`,
    [tenantId],
  );
  if (!rows.length) return null;
  const base = mapAdminTenantRow(rows[0]);

  const { rows: admins } = await query(
    `SELECT id, email, nome, perfil, cargo, ativo, created_at
     FROM usuarios
     WHERE tenant_id = $1 AND deleted_at IS NULL
     ORDER BY CASE WHEN perfil = 'ADMIN_EMPRESA' THEN 0 ELSE 1 END, nome
     LIMIT 20`,
    [tenantId],
  );

  return {
    ...base,
    admins: admins.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.nome,
      role: u.perfil,
      title: u.cargo,
      active: u.ativo,
      createdAt: u.created_at,
    })),
  };
}

export async function updateAdminTenant(tenantId, body, adminUser, req) {
  const existing = await getAdminTenant(tenantId);
  if (!existing) {
    const err = new Error('Empresa não encontrada');
    err.status = 404;
    throw err;
  }

  const expiresAt =
    body.expiresAt === null || body.expiresAt === ''
      ? null
      : body.expiresAt
        ? new Date(body.expiresAt).toISOString()
        : undefined;

  await query(
    `UPDATE tenants SET
       nome = COALESCE($2, nome),
       industria = COALESCE($3, industria),
       plano_codigo = COALESCE($4, plano_codigo),
       plano = COALESCE($4, plano),
       expira_em = CASE WHEN $5::boolean THEN $6::timestamptz ELSE expira_em END,
       icone = COALESCE($7, icone),
       cor = COALESCE($8, cor),
       updated_at = NOW()
     WHERE tenant_id = $1 AND deleted_at IS NULL`,
    [
      tenantId,
      body.name ? sanitizePlainText(body.name, 255) : null,
      body.industry != null ? sanitizePlainText(body.industry, 120) : null,
      body.plan ?? null,
      expiresAt !== undefined,
      expiresAt === undefined ? null : expiresAt,
      body.icon ? sanitizePlainText(body.icon, 16) : null,
      body.color ?? null,
    ],
  );

  const hasEmpresaPatch =
    body.razaoSocial != null ||
    body.nomeFantasia !== undefined ||
    body.cnpj !== undefined ||
    body.inscricaoEstadual !== undefined ||
    body.name != null;

  if (hasEmpresaPatch) {
    const razao = body.razaoSocial
      ? sanitizePlainText(body.razaoSocial, 255)
      : body.name
        ? sanitizePlainText(body.name, 255)
        : existing.razaoSocial || existing.name;
    const fantasia =
      body.nomeFantasia === null
        ? null
        : body.nomeFantasia != null
          ? sanitizePlainText(body.nomeFantasia, 255)
          : existing.nomeFantasia;
    const cnpj =
      body.cnpj === null ? null : body.cnpj != null ? sanitizePlainText(body.cnpj, 18) : existing.cnpj;
    const ie =
      body.inscricaoEstadual === null
        ? null
        : body.inscricaoEstadual != null
          ? sanitizePlainText(body.inscricaoEstadual, 32)
          : existing.inscricaoEstadual;

    await query(
      `INSERT INTO empresas (tenant_id, razao_social, nome_fantasia, cnpj, inscricao_estadual)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tenant_id) DO UPDATE SET
         razao_social = EXCLUDED.razao_social,
         nome_fantasia = EXCLUDED.nome_fantasia,
         cnpj = EXCLUDED.cnpj,
         inscricao_estadual = EXCLUDED.inscricao_estadual,
         updated_at = NOW(),
         deleted_at = NULL`,
      [tenantId, razao, fantasia, cnpj, ie],
    );
  }

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
    `UPDATE tenants SET bloqueado = TRUE, status_conta = 'BLOQUEADO', ativo = FALSE, bloqueado_em = NOW(),
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

/**
 * Liberação comercial: após contrato/pagamento, admin global libera o acesso da empresa.
 */
export async function grantTenantAccess(tenantId, adminUser, req, { paymentNote, plan, expiresAt } = {}) {
  const current = await getAdminTenant(tenantId);
  if (!current) {
    const err = new Error('Empresa não encontrada');
    err.status = 404;
    throw err;
  }

  const planCodigo = plan ?? current.plan ?? null;
  await query(
    `UPDATE tenants SET
       bloqueado = FALSE,
       status_conta = 'ATIVO',
       ativo = TRUE,
       bloqueado_em = NULL,
       bloqueado_por = NULL,
       bloqueado_motivo = NULL,
       plano = COALESCE($2, plano),
       plano_codigo = COALESCE($2, plano_codigo),
       expira_em = COALESCE($3::timestamptz, expira_em),
       updated_at = NOW()
     WHERE tenant_id = $1`,
    [tenantId, planCodigo, expiresAt ?? null],
  );

  // Libera login dos admins do tenant (senha já definida no cadastro/ativação).
  await query(
    `UPDATE usuarios SET
       pendente_ativacao = FALSE,
       ativado_em = COALESCE(ativado_em, NOW()),
       ativo = TRUE,
       updated_at = NOW()
     WHERE tenant_id = $1 AND deleted_at IS NULL AND pendente_ativacao = TRUE`,
    [tenantId],
  );

  await query(
    `UPDATE activation_tokens SET used_at = NOW()
     WHERE tenant_id = $1 AND used_at IS NULL`,
    [tenantId],
  );

  await auditOnboarding('TENANT_ACCESS_GRANTED', {
    req,
    userId: adminUser.id,
    tenantId,
    details: { paymentNote: paymentNote ?? null, plan: planCodigo, expiresAt: expiresAt ?? null },
  });

  return getAdminTenant(tenantId);
}

/** Desativa acesso (sem bloqueio punitivo) — cliente deixa de entrar até nova liberação */
export async function deactivateTenant(tenantId, adminUser, req, { reason } = {}) {
  await query(
    `UPDATE tenants SET
       status_conta = 'INATIVO',
       ativo = FALSE,
       bloqueado = FALSE,
       bloqueado_em = NOW(),
       bloqueado_por = $2,
       bloqueado_motivo = $3,
       updated_at = NOW()
     WHERE tenant_id = $1`,
    [tenantId, adminUser.id, sanitizePlainText(reason ?? 'Desativação administrativa', 500)],
  );

  await auditOnboarding('TENANT_DEACTIVATED', {
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
    `UPDATE tenants SET status_conta = 'SUSPENSO', bloqueado = TRUE, ativo = FALSE, bloqueado_em = NOW(),
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
