import { describe, it, before } from 'node:test';

import assert from 'node:assert/strict';

import { setupIntegration, isIntegrationReady } from '../setup/testDb.js';

import { FIXTURES } from '../fixtures/users.js';

import { http, loginSession, withAuth } from '../helpers/request.js';

import { guardIntegration } from '../helpers/skip.js';



before(async () => setupIntegration());



describe('Denúncias — integração Supertest', () => {

  let token;

  let csrf;

  let tenantId;



  before(async () => {

    if (!isIntegrationReady()) return;

    const session = await loginSession(FIXTURES.active.email, FIXTURES.active.password);

    token = session.token;

    csrf = session.csrf;

    tenantId = FIXTURES.active.tenantId;

  });



  it('POST denúncia pública payload válido', async (t) => {

    if (!guardIntegration(t)) return;

    const res = await http()

      .post('/api/denuncias/public')

      .send({

        tenantId,

        type: 'ASSEDIO_MORAL',

        modality: 'ANONIMA',

        description: 'Relato de integração teste P9',

        lgpdConsent: true,

      });

    assert.ok([200, 201].includes(res.status), `status ${res.status}`);

  });



  it('POST denúncia pública payload inválido → 400', async (t) => {

    if (!guardIntegration(t)) return;

    const res = await http().post('/api/denuncias/public').send({ tenantId, type: 'INVALID' });

    assert.equal(res.status, 400);

  });



  it('GET dashboard autenticado', async (t) => {

    if (!guardIntegration(t)) return;

    const res = await withAuth(token, csrf).get(`/api/denuncias/dashboard?tenantId=${tenantId}`);

    assert.equal(res.status, 200);

  });



  it('GET listagem autenticada', async (t) => {

    if (!guardIntegration(t)) return;

    const res = await withAuth(token, csrf).get(`/api/denuncias?tenantId=${tenantId}`);

    assert.equal(res.status, 200);

    assert.ok(Array.isArray(res.body) || Array.isArray(res.body.data));

  });



  it('PATCH tratativa tid inexistente → 404 (sem crash FK)', async (t) => {

    if (!guardIntegration(t)) return;

    const res = await withAuth(token, csrf)

      .patch(`/api/denuncias/999999/tratativas/888888?tenantId=${tenantId}`)

      .send({ description: 'Teste', type: 'ACAO' });

    assert.equal(res.status, 404);

  });



  it('operador sem permissão delete → 403', async (t) => {

    if (!guardIntegration(t)) return;

    const op = await loginSession(FIXTURES.operator.email, FIXTURES.operator.password);

    const res = await withAuth(op.token, op.csrf)

      .delete(`/api/denuncias/1?tenantId=${tenantId}`);

    assert.ok([403, 404].includes(res.status));

  });

});

