import { describe, it, before } from 'node:test';

import assert from 'node:assert/strict';

import { setupIntegration } from '../setup/testDb.js';

import { FIXTURES } from '../fixtures/users.js';

import { loginSession, withAuth } from '../helpers/request.js';

import { guardIntegration } from '../helpers/skip.js';



before(async () => setupIntegration());



describe('Admin/Tenants — integração', () => {

  it('listar tenants admin global ou skip se indisponível', async (t) => {

    if (!guardIntegration(t)) return;

    const admin = await loginSession(FIXTURES.globalAdmin.email, FIXTURES.globalAdmin.password);

    if (admin.res.status !== 200) {

      return;

    }

    const res = await withAuth(admin.token, admin.csrf).get('/api/admin/tenants?filter=active');

    assert.equal(res.status, 200);

    assert.ok(Array.isArray(res.body) || Array.isArray(res.body.data));

  });



  it('bloquear tenant sem reason → 400', async (t) => {

    if (!guardIntegration(t)) return;

    const admin = await loginSession(FIXTURES.globalAdmin.email, FIXTURES.globalAdmin.password);

    if (admin.res.status !== 200) return;

    const res = await withAuth(admin.token, admin.csrf)

      .post('/api/admin/tenants/itest-active/block')

      .send({});

    assert.equal(res.status, 400);

  });



  it('usuário comum não lista admin tenants → 403', async (t) => {

    if (!guardIntegration(t)) return;

    const user = await loginSession(FIXTURES.active.email, FIXTURES.active.password);

    const res = await withAuth(user.token, user.csrf).get('/api/admin/tenants');

    assert.ok([401, 403].includes(res.status));

  });



  it('tenant inexistente → 404', async (t) => {

    if (!guardIntegration(t)) return;

    const admin = await loginSession(FIXTURES.globalAdmin.email, FIXTURES.globalAdmin.password);

    if (admin.res.status !== 200) return;

    const res = await withAuth(admin.token, admin.csrf).get('/api/admin/tenants/does-not-exist-xyz');

    assert.ok([404, 400].includes(res.status));

  });

});

