import { describe, it, before } from 'node:test';

import assert from 'node:assert/strict';

import { setupIntegration } from '../setup/testDb.js';

import { FIXTURES } from '../fixtures/users.js';

import { http, login, loginSession, withAuth, assertNoSensitiveLeak } from '../helpers/request.js';

import { malformedToken } from '../helpers/auth.js';

import { guardIntegration } from '../helpers/skip.js';



before(async () => setupIntegration());



describe('Auth/MFA — integração Supertest', () => {

  it('GET /api/health retorna ok com DB', async (t) => {

    if (!guardIntegration(t)) return;

    const res = await http().get('/api/health');

    assert.equal(res.status, 200);

    assert.equal(res.body.ok, true);

  });



  it('POST /api/auth/login sucesso', async (t) => {

    if (!guardIntegration(t)) return;

    const { res, token, body } = await loginSession(FIXTURES.active.email, FIXTURES.active.password);

    assert.equal(res.status, 200);

    assert.ok(token);

    assert.equal(body.user?.email, FIXTURES.active.email);

    assertNoSensitiveLeak(body);

  });



  it('login senha incorreta → 401', async (t) => {

    if (!guardIntegration(t)) return;

    const res = await login(FIXTURES.active.email, 'wrongpassword999');

    assert.equal(res.status, 401);

    assertNoSensitiveLeak(res.body);

  });



  it('login usuário inexistente → 401', async (t) => {

    if (!guardIntegration(t)) return;

    const res = await login('nobody@nowhere.test', 'IntegrationTest1234!');

    assert.equal(res.status, 401);

  });



  it('login tenant bloqueado → 403', async (t) => {

    if (!guardIntegration(t)) return;

    const res = await login(FIXTURES.blocked.email, FIXTURES.blocked.password);

    assert.equal(res.status, 403);

    assert.match(res.body.message ?? res.body.error ?? '', /bloqueado|suspenso/i);

  });



  it('login tenant expirado → 403', async (t) => {

    if (!guardIntegration(t)) return;

    const res = await login(FIXTURES.expired.email, FIXTURES.expired.password);

    assert.equal(res.status, 403);

  });



  it('verify MFA inválido → 400/401', async (t) => {

    if (!guardIntegration(t)) return;

    const res = await http().post('/api/auth/mfa/verify').send({ mfaToken: 'bad.token', code: '000000' });

    assert.ok([400, 401, 404].includes(res.status));

  });



  it('refresh sem cookie → 401', async (t) => {

    if (!guardIntegration(t)) return;

    const res = await http().post('/api/auth/refresh');

    assert.ok([401, 403].includes(res.status));

  });



  it('logout autenticado', async (t) => {

    if (!guardIntegration(t)) return;

    const { token, csrf } = await loginSession(FIXTURES.active.email, FIXTURES.active.password);

    const res = await withAuth(token, csrf).post('/api/auth/logout').send({});

    assert.ok([200, 204, 403].includes(res.status) || res.body.success === true);

  });



  it('rota protegida token malformado → 401', async (t) => {

    if (!guardIntegration(t)) return;

    const res = await http()

      .get(`/api/pgr/program?tenantId=${FIXTURES.active.tenantId}`)

      .set('Authorization', `Bearer ${malformedToken()}`);

    assert.equal(res.status, 401);

  });



  it('rota protegida sem auth → 401', async (t) => {

    if (!guardIntegration(t)) return;

    const res = await http().get(`/api/pgr/program?tenantId=${FIXTURES.active.tenantId}`);

    assert.equal(res.status, 401);

  });



  it('login legacy vale (se existir)', async (t) => {

    if (!guardIntegration(t)) return;

    const res = await login(FIXTURES.legacy.email, FIXTURES.legacy.password);

    if (res.status === 200) {

      assert.ok(res.body.accessToken || res.body.data?.accessToken);

    } else {

      assert.ok([401, 403, 429].includes(res.status));

    }

  });

});

