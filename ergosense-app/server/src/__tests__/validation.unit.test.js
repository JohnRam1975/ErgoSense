/**
 * Testes de validação Zod
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { collaboratorSchema, createTenantSchema, loginSchema } from '../validation/schemas.js';
import { validateBody } from '../validation/validateRequest.js';

test('validateBody — retorna 400 para e-mail inválido', () => {
  let status;
  let body;
  const req = { body: { email: 'not-valid', password: 'x' } };
  const res = {
    status(code) {
      status = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    },
  };
  let nextCalled = false;
  validateBody(loginSchema)(req, res, () => {
    nextCalled = true;
  });
  assert.equal(status, 400);
  assert.equal(nextCalled, false);
  assert.match(body.message, /E-mail inválido/i);
});

test('loginSchema — rejeita e-mail inválido', () => {
  const r = loginSchema.safeParse({ email: 'x', password: 'abc' });
  assert.equal(r.success, false);
});

test('loginSchema — aceita credenciais válidas', () => {
  const r = loginSchema.safeParse({ email: 'a@b.com', password: 'secret123' });
  assert.equal(r.success, true);
});

test('createTenantSchema — exige industria', () => {
  const r = createTenantSchema.safeParse({
    nome: 'Vale',
    adminNome: 'Admin',
    adminEmail: 'a@vale.com',
    adminPassword: 'Ergo1234!',
  });
  assert.equal(r.success, false);
});

test('collaboratorSchema — exige matricula', () => {
  const r = collaboratorSchema.safeParse({ nome: 'João' });
  assert.equal(r.success, false);
});
