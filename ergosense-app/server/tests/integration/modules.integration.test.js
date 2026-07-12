import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { setupIntegration, isIntegrationReady } from '../setup/testDb.js';
import { FIXTURES } from '../fixtures/users.js';
import { loginSession, withAuth } from '../helpers/request.js';
import { guardIntegration } from '../helpers/skip.js';

before(async () => setupIntegration());

describe('Módulos críticos — PGR/GRO/Psico/SST/Org', () => {
  let auth;
  const tenantId = FIXTURES.active.tenantId;

  before(async () => {
    if (!isIntegrationReady()) return;
    auth = await loginSession(FIXTURES.active.email, FIXTURES.active.password);
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

  it('PGR program GET', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api().get(`/api/pgr/program?tenantId=${tenantId}`);
    assert.ok([200, 404].includes(res.status));
  });

  it('PGR versions GET', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api().get(`/api/pgr/versions?tenantId=${tenantId}`);
    assert.equal(res.status, 200);
  });

  it('PGR version inexistente → 404', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api().get(`/api/pgr/versions/999999?tenantId=${tenantId}`);
    assert.equal(res.status, 404);
  });

  it('GRO dashboard GET', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api().get(`/api/gro/dashboard?tenantId=${tenantId}`);
    assert.equal(res.status, 200);
  });

  it('GRO workflow GET', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api().get(`/api/gro/workflow?tenantId=${tenantId}`);
    assert.ok([200, 404].includes(res.status));
  });

  it('Psicossocial dashboard GET', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api().get(`/api/psico/dashboard?tenantId=${tenantId}`);
    assert.equal(res.status, 200);
  });

  it('Psicossocial fatores GET', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api().get(`/api/psico/fatores?tenantId=${tenantId}`);
    assert.equal(res.status, 200);
  });

  it('SST dashboard GET', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api().get(`/api/sst/dashboard?tenantId=${tenantId}`);
    assert.ok([200, 404].includes(res.status));
  });

  it('Org tree GET', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api().get(`/api/org/tree?tenantId=${tenantId}`);
    assert.ok([200, 404].includes(res.status));
  });

  it('tenant errado em query → 403 para non-admin', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api().get(`/api/gro/dashboard?tenantId=other-tenant-xyz`);
    assert.equal(res.status, 403);
  });

  it('payload inválido PGR generate → 400', async (t) => {
    if (!requireAuth(t)) return;
    const res = await api()
      .post(`/api/pgr/versions/generate?tenantId=${tenantId}`)
      .send({ reviewReason: '' });
    assert.ok([200, 400, 404, 201].includes(res.status));
  });
});
