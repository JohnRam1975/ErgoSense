/**
 * Testes do envelope padronizado de API
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { apiSuccess, apiError, apiCreated } from '../utils/apiResponse.js';

function mockRes() {
  let statusCode;
  let body;
  return {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    },
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
  };
}

test('apiSuccess — envelope padrão', () => {
  const res = mockRes();
  apiSuccess(res, { id: 1 }, 'OK');
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true, message: 'OK', data: { id: 1 } });
});

test('apiError — mensagem clara', () => {
  const res = mockRes();
  apiError(res, 'Credenciais inválidas', 401);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { success: false, message: 'Credenciais inválidas' });
});

test('apiCreated — status 201', () => {
  const res = mockRes();
  apiCreated(res, { id: 'abc' });
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.id, 'abc');
});
