/**
 * validateRequest — casos adicionais
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { formatZodIssues, validateBody } from '../validation/validateRequest.js';
import {
  tenantBlockSchema,
  tenantReactivateSchema,
  tenantRequestPublicSchema,
  collaboratorSchema,
} from '../validation/schemas.js';

function runValidate(schema, body) {
  let status;
  let payload;
  let nextCalled = false;
  const req = { body };
  const res = {
    status(code) {
      status = code;
      return this;
    },
    json(data) {
      payload = data;
      return this;
    },
  };
  validateBody(schema)(req, res, () => {
    nextCalled = true;
  });
  return {
    status,
    message: payload?.message,
    errors: payload?.errors,
    nextCalled,
    validatedBody: req.validatedBody,
  };
}

test('tenantBlockSchema via middleware — 400 body vazio', () => {
  const r = runValidate(tenantBlockSchema, {});
  assert.equal(r.status, 400);
  assert.equal(r.nextCalled, false);
  assert.match(r.message, /reason:/i);
  assert.ok(r.errors?.some((e) => e.path === 'reason'));
});

test('tenantReactivateSchema via middleware — 400 sem confirm', () => {
  const r = runValidate(tenantReactivateSchema, {});
  assert.equal(r.status, 400);
});

test('tenantBlockSchema — next com body válido', () => {
  const r = runValidate(tenantBlockSchema, { reason: 'Inadimplência' });
  assert.equal(r.nextCalled, true);
  assert.equal(r.validatedBody.reason, 'Inadimplência');
});

test('formatZodIssues — humaniza Invalid input genérico com path', () => {
  const { message, errors } = formatZodIssues([
    {
      code: 'invalid_type',
      path: ['password'],
      message: 'Invalid input: expected string, received undefined',
      received: 'undefined',
    },
    {
      code: 'invalid_type',
      path: ['email'],
      message: 'Invalid input: expected string, received number',
      received: 'number',
    },
  ]);
  assert.equal(errors[0].path, 'password');
  assert.equal(errors[0].message, 'Campo obrigatório');
  assert.equal(errors[1].message, 'Tipo de valor inválido');
  assert.match(message, /password: Campo obrigatório/);
  assert.match(message, /email: Tipo de valor inválido/);
});

test('tenantRequestPublicSchema — campos ausentes com path+message', () => {
  const r = runValidate(tenantRequestPublicSchema, { senha: 'x', tipoCadastro: 'EMPRESA' });
  assert.equal(r.status, 400);
  assert.ok(Array.isArray(r.errors));
  assert.ok(r.errors.some((e) => e.path === 'razaoSocial'));
  assert.doesNotMatch(r.message, /Invalid input: expected string/i);
  assert.match(r.message, /razaoSocial:/);
});

test('tenantRequestPublicSchema — senha em vez de password aponta path password', () => {
  const r = runValidate(tenantRequestPublicSchema, {
    tipoCadastro: 'EMPRESA',
    razaoSocial: 'Acme Ltda',
    segmento: 'Indústria',
    responsavelNome: 'João Silva',
    email: 'joao@acme.com',
    telefone: '11999999999',
    cnpj: '12345678000199',
    senha: 'curta',
  });
  assert.equal(r.status, 400);
  assert.ok(r.errors.some((e) => e.path === 'password'));
  assert.match(r.message, /password: Senha obrigatória/i);
  assert.doesNotMatch(r.message, /Invalid input/i);
});

test('collaboratorSchema — birthDate formato inválido', () => {
  const r = runValidate(collaboratorSchema, {
    nome: 'Teste',
    matricula: 'M-1',
    birthDate: '32/13/9999',
  });
  assert.equal(r.status, 400);
  assert.ok(r.errors?.some((e) => e.path === 'birthDate'));
});

test('collaboratorSchema — birthDate calendário inválido', () => {
  const r = runValidate(collaboratorSchema, {
    nome: 'Teste',
    matricula: 'M-1',
    birthDate: '2024-02-31',
  });
  assert.equal(r.status, 400);
  assert.ok(r.errors?.some((e) => e.path === 'birthDate'));
});

test('collaboratorSchema — birthDate ISO válida', () => {
  const r = runValidate(collaboratorSchema, {
    nome: 'Teste',
    matricula: 'M-1',
    birthDate: '1990-05-20',
  });
  assert.equal(r.nextCalled, true);
});
