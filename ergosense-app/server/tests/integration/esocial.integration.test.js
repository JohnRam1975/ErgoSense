import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { setupIntegration, isIntegrationReady } from '../setup/testDb.js';
import { FIXTURES } from '../fixtures/users.js';
import { http, loginSession, withAuth } from '../helpers/request.js';
import { guardIntegration } from '../helpers/skip.js';

before(async () => setupIntegration());

describe('eSocial — integração Supertest', () => {
  let auth;
  let op;
  const tenantId = FIXTURES.active.tenantId;

  before(async () => {
    if (!isIntegrationReady()) return;
    auth = await loginSession(FIXTURES.active.email, FIXTURES.active.password);
    op = await loginSession(FIXTURES.operator.email, FIXTURES.operator.password);
  });

  function requireAuth(t) {
    if (!guardIntegration(t)) return false;
    if (!auth?.token) {
      t.skip('login fixture ativo indisponível');
      return false;
    }
    return true;
  }

  const api = () => withAuth(auth.token, auth.csrf);

  it('GET dashboard → 200', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api().get(`/api/esocial/dashboard?tenantId=${tenantId}`);
    assert.equal(res.status, 200);
    assert.ok(res.body !== null);
  });

  it('GET config → 200', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api().get(`/api/esocial/config?tenantId=${tenantId}`);
    assert.equal(res.status, 200);
  });

  it('PUT config → 200', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api()
      .put(`/api/esocial/config?tenantId=${tenantId}`)
      .send({ ambiente: '1', razaoSocial: 'Integration Co' });
    assert.equal(res.status, 200);
  });

  it('GET eventos → 200', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api().get(`/api/esocial/eventos?tenantId=${tenantId}`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('POST evento válido → 201', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api()
      .post(`/api/esocial/eventos?tenantId=${tenantId}`)
      .send({ eventType: 'S-2210', payload: { cpf: '00000000000', dtAcid: '2026-01-01' } });
    assert.equal(res.status, 201);
  });

  it('POST evento inválido → 400', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api()
      .post(`/api/esocial/eventos?tenantId=${tenantId}`)
      .send({ eventType: 'INVALID' });
    assert.equal(res.status, 400);
  });

  it('GET evento inexistente → 404', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api().get(`/api/esocial/eventos/999999?tenantId=${tenantId}`);
    assert.equal(res.status, 404);
  });

  it('POST validar evento inexistente → 404', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api().post(`/api/esocial/eventos/999999/validar?tenantId=${tenantId}`).send({});
    assert.equal(res.status, 404);
  });

  it('GET historico → 200', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api().get(`/api/esocial/historico?tenantId=${tenantId}`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('sem autenticação → 401', async (t) => {
    if (!guardIntegration(t)) return;
    const res = await http().get(`/api/esocial/dashboard?tenantId=${tenantId}`);
    assert.equal(res.status, 401);
  });

  it('operador POST evento → 403', async (t) => {
    if (!guardIntegration(t)) return;
    if (!op?.token) return t.skip('operador indisponível');
    const res = await withAuth(op.token, op.csrf)
      .post(`/api/esocial/eventos?tenantId=${tenantId}`)
      .send({ eventType: 'S-2210', payload: {} });
    assert.equal(res.status, 403);
  });

  it('tenant errado → 403', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api().get('/api/esocial/dashboard?tenantId=wrong-tenant-xyz');
    assert.equal(res.status, 403);
  });
});
