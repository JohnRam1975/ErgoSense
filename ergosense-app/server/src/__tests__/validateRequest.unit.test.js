/**
 * validateRequest — casos adicionais
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBody } from '../validation/validateRequest.js';
import { tenantBlockSchema, tenantReactivateSchema } from '../validation/schemas.js';

function runValidate(schema, body) {
  let status;
  let message;
  let nextCalled = false;
  const req = { body };
  const res = {
    status(code) {
      status = code;
      return this;
    },
    json(payload) {
      message = payload.message;
      return this;
    },
  };
  validateBody(schema)(req, res, () => {
    nextCalled = true;
  });
  return { status, message, nextCalled, validatedBody: req.validatedBody };
}

test('tenantBlockSchema via middleware — 400 body vazio', () => {
  const r = runValidate(tenantBlockSchema, {});
  assert.equal(r.status, 400);
  assert.equal(r.nextCalled, false);
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
