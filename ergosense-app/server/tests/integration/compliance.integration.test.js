import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { setupIntegration, isIntegrationReady } from '../setup/testDb.js';
import { FIXTURES } from '../fixtures/users.js';
import { http, loginSession, withAuth } from '../helpers/request.js';
import { guardIntegration } from '../helpers/skip.js';

before(async () => setupIntegration());

describe('Compliance — integração Supertest', () => {
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

  it('GET dashboard → 200 com schema básico', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api().get(`/api/compliance/dashboard?tenantId=${tenantId}`);
    assert.equal(res.status, 200);
    assert.ok('recentHistory' in res.body || res.body.score !== undefined || res.body.totalNormas !== undefined);
  });

  it('GET fontes → 200 array', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api().get(`/api/compliance/fontes?tenantId=${tenantId}`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('GET normas → 200', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api().get(`/api/compliance/normas?tenantId=${tenantId}`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('GET alertas → 200', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api().get(`/api/compliance/alertas?tenantId=${tenantId}`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('GET detecções → 200', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api().get(`/api/compliance/deteccoes?tenantId=${tenantId}`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('GET histórico → 200', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api().get(`/api/compliance/historico?tenantId=${tenantId}`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('GET relatórios → 200', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api().get(`/api/compliance/relatorios?tenantId=${tenantId}`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('GET agendamento → 200', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api().get(`/api/compliance/agendamento?tenantId=${tenantId}`);
    assert.ok([200, 404].includes(res.status));
  });

  it('POST scan → 200/201', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api().post(`/api/compliance/scan?tenantId=${tenantId}`).send({ sources: ['MTE'] });
    assert.ok([200, 201].includes(res.status));
  });

  it('PUT fonte inexistente → 404', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api()
      .put(`/api/compliance/fontes/ZZZ-NOPE?tenantId=${tenantId}`)
      .send({ active: false });
    assert.ok([404, 400].includes(res.status));
  });

  it('sem autenticação → 401', async (t) => {
    if (!guardIntegration(t)) return;
    const res = await http().get(`/api/compliance/dashboard?tenantId=${tenantId}`);
    assert.equal(res.status, 401);
  });

  it('operador POST scan → 403', async (t) => {
    if (!guardIntegration(t)) return;
    if (!op?.token) return t.skip('operador indisponível');
    const res = await withAuth(op.token, op.csrf)
      .post(`/api/compliance/scan?tenantId=${tenantId}`)
      .send({});
    assert.equal(res.status, 403);
  });

  it('tenant errado → 403', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api().get('/api/compliance/dashboard?tenantId=wrong-tenant-xyz');
    assert.equal(res.status, 403);
  });
});
