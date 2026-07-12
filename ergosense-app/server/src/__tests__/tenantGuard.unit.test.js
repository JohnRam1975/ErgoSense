/**
 * Tenant guard — isolamento multi-tenant
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTenantId, enforceTenantAccess, getRequestedTenantId } from '../middleware/tenantGuard.js';

function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  return res;
}

test('resolveTenantId — usuário normal ignora request', () => {
  const req = { user: { tenantId: 'vale', role: 'ERGONOMISTA' } };
  assert.equal(resolveTenantId(req, 'gerdau'), 'vale');
});

test('resolveTenantId — admin global usa request', () => {
  const req = { user: { tenantId: 'platform', role: 'ADMIN_GLOBAL' } };
  assert.equal(resolveTenantId(req, 'gerdau'), 'gerdau');
});

test('enforceTenantAccess — non-admin usa tenant do JWT (ignora request)', () => {
  const req = { user: { id: 1, tenantId: 'vale', role: 'ERGONOMISTA', email: 'a@vale.com' } };
  const res = mockRes();
  const result = enforceTenantAccess(req, res, 'gerdau');
  assert.equal(result, 'vale');
  assert.equal(res.statusCode, 200);
});

test('enforceTenantAccess — mesmo tenant permitido', () => {
  const req = { user: { id: 1, tenantId: 'vale', role: 'ERGONOMISTA', email: 'a@vale.com' } };
  const res = mockRes();
  const result = enforceTenantAccess(req, res, 'vale');
  assert.equal(result, 'vale');
});

test('getRequestedTenantId — query', () => {
  const req = { query: { tenantId: 'vale' }, body: {} };
  assert.equal(getRequestedTenantId(req), 'vale');
});

test('enforceTenantAccess — sem user retorna 401', () => {
  const req = {};
  const res = mockRes();
  assert.equal(enforceTenantAccess(req, res, 'vale'), null);
  assert.equal(res.statusCode, 401);
});

test('enforceTenantAccess — admin global em PLATFORM_TENANT retorna 403', () => {
  const adminReq = {
    user: { id: 2, tenantId: 'platform', role: 'ADMIN_GLOBAL', email: 'admin@ergosense.test' },
  };
  const adminRes = mockRes();
  const result = enforceTenantAccess(adminReq, adminRes, 'ergosense');
  assert.equal(result, null);
  assert.equal(adminRes.statusCode, 403);
});

test('getRequestedTenantId — body e params', () => {
  assert.equal(getRequestedTenantId({ query: {}, body: { tenantId: 'gerdau' } }), 'gerdau');
  assert.equal(getRequestedTenantId({ query: {}, body: {}, params: { tenantId: 'csn' } }), 'csn');
  assert.equal(getRequestedTenantId({ query: {}, body: {} }), null);
});

test('resolveTenantId — admin sem request usa tenant do user', () => {
  const req = { user: { tenantId: 'platform', role: 'ADMIN_GLOBAL' } };
  assert.equal(resolveTenantId(req, null), 'platform');
});
