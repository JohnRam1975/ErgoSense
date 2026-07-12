import { query } from '../../src/db.js';
import { FIXTURES } from './users.js';

const ITEST_TENANTS = ['itest-active', 'itest-blocked', 'itest-expired'];

async function upsertTenant(tenantId, { nome, statusConta, bloqueado }) {
  await query(
    `INSERT INTO tenants (tenant_id, nome, industria, status_conta, bloqueado, deleted_at)
     VALUES ($1, $2, 'Integração', $3, $4, NULL)
     ON CONFLICT (tenant_id) DO UPDATE SET
       nome = EXCLUDED.nome,
       status_conta = EXCLUDED.status_conta,
       bloqueado = EXCLUDED.bloqueado,
       deleted_at = NULL,
       updated_at = NOW()`,
    [tenantId, nome, statusConta, bloqueado],
  );
}

async function upsertUser(tenantId, email, nome, perfil, password) {
  await query(
    `INSERT INTO usuarios (tenant_id, email, nome, senha_hash, perfil, ativo, deleted_at)
     VALUES ($1, $2, $3, crypt($4, gen_salt('bf', 10)), $5, TRUE, NULL)
     ON CONFLICT (tenant_id, email) DO UPDATE SET
       senha_hash = crypt($4, gen_salt('bf', 10)),
       perfil = EXCLUDED.perfil,
       ativo = TRUE,
       deleted_at = NULL,
       updated_at = NOW()`,
    [tenantId, email, nome, password, perfil],
  );
}

export async function seedIntegrationFixtures() {
  await upsertTenant('itest-active', {
    nome: 'Integration Active Co',
    statusConta: 'ATIVO',
    bloqueado: false,
  });
  await upsertTenant('itest-blocked', {
    nome: 'Integration Blocked Co',
    statusConta: 'BLOQUEADO',
    bloqueado: true,
  });
  await upsertTenant('itest-expired', {
    nome: 'Integration Expired Co',
    statusConta: 'EXPIRADO',
    bloqueado: false,
  });

  await upsertUser(
    FIXTURES.active.tenantId,
    FIXTURES.active.email,
    'Integration Active',
    FIXTURES.active.role,
    FIXTURES.active.password,
  );
  await upsertUser(
    FIXTURES.blocked.tenantId,
    FIXTURES.blocked.email,
    'Integration Blocked',
    'ERGONOMISTA',
    FIXTURES.blocked.password,
  );
  await upsertUser(
    FIXTURES.expired.tenantId,
    FIXTURES.expired.email,
    'Integration Expired',
    'ERGONOMISTA',
    FIXTURES.expired.password,
  );
  await upsertUser(
    FIXTURES.operator.tenantId,
    FIXTURES.operator.email,
    'Integration Operator',
    FIXTURES.operator.role,
    FIXTURES.operator.password,
  );
}

export async function cleanupIntegrationFixtures() {
  for (const tid of ITEST_TENANTS) {
    await query(`DELETE FROM usuarios WHERE tenant_id = $1 AND email LIKE 'itest-%@ergosense.test'`, [tid]).catch(
      () => {},
    );
  }
}
