/**
 * requirePermission middleware
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { requirePermission } from '../auth/rbac.js';

function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = (c) => {
    res.statusCode = c;
    return res;
  };
  res.json = (b) => {
    res.body = b;
    return res;
  };
  return res;
}

test('requirePermission — 401 sem user', () => {
  const mw = requirePermission('analyses:create');
  const req = {};
  const res = mockRes();
  let next = false;
  mw(req, res, () => {
    next = true;
  });
  assert.equal(next, false);
  assert.equal(res.statusCode, 401);
});

test('requirePermission — 403 OPERADOR analyses:delete', () => {
  const mw = requirePermission('analyses:delete');
  const req = { user: { role: 'OPERADOR' } };
  const res = mockRes();
  let next = false;
  mw(req, res, () => {
    next = true;
  });
  assert.equal(next, false);
  assert.equal(res.statusCode, 403);
});

test('requirePermission — ERGONOMISTA analyses:delete ok', () => {
  const mw = requirePermission('analyses:delete');
  const req = { user: { role: 'ERGONOMISTA' } };
  const res = mockRes();
  let next = false;
  mw(req, res, () => {
    next = true;
  });
  assert.equal(next, true);
});
