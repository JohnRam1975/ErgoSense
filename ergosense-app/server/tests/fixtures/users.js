/** Credenciais de integração — prefixo itest-* */
export const FIXTURES = {
  active: {
    tenantId: 'itest-active',
    email: 'itest-active@ergosense.test',
    password: 'IntegrationTest1234!',
    role: 'ERGONOMISTA',
  },
  blocked: {
    tenantId: 'itest-blocked',
    email: 'itest-blocked@ergosense.test',
    password: 'IntegrationTest1234!',
  },
  expired: {
    tenantId: 'itest-expired',
    email: 'itest-expired@ergosense.test',
    password: 'IntegrationTest1234!',
  },
  operator: {
    tenantId: 'itest-active',
    email: 'itest-operator@ergosense.test',
    password: 'IntegrationTest1234!',
    role: 'OPERADOR',
  },
  legacy: {
    tenantId: process.env.AUDIT_TENANT || 'vale',
    email: process.env.AUDIT_EMAIL || 'lucas@vale.com.br',
    password: process.env.AUDIT_PASS || 'ergo1234',
  },
  globalAdmin: {
    email: process.env.E2E_GLOBAL_EMAIL || 'ergosense@dejohn.com.br',
    password: process.env.E2E_GLOBAL_PASSWORD || '@Ergo!2026/Adm',
    role: 'ADMIN_GLOBAL',
  },
};
