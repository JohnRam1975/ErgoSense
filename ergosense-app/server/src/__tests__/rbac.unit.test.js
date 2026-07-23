/**
 * RBAC — permissões e papéis
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { hasPermission, isGlobalAdmin, isTenantAdmin, ROLES } from '../auth/rbac.js';

test('ROLES contém papéis esperados', () => {
  assert.ok(ROLES.includes('ADMIN_GLOBAL'));
  assert.ok(ROLES.includes('ERGONOMISTA'));
});

test('ADMIN_GLOBAL tem wildcard', () => {
  assert.equal(hasPermission('ADMIN_GLOBAL', 'anything:here'), true);
});

test('ERGONOMISTA — analyses:*', () => {
  assert.equal(hasPermission('ERGONOMISTA', 'analyses:create'), true);
  assert.equal(hasPermission('ERGONOMISTA', 'analyses:delete'), true);
});

test('ERGONOMISTA — collaborators create/update/delete', () => {
  assert.equal(hasPermission('ERGONOMISTA', 'collaborators:create'), true);
  assert.equal(hasPermission('ERGONOMISTA', 'collaborators:update'), true);
  assert.equal(hasPermission('ERGONOMISTA', 'collaborators:delete'), true);
});

test('OPERADOR — sem analyses:delete', () => {
  assert.equal(hasPermission('OPERADOR', 'analyses:delete'), false);
  assert.equal(hasPermission('OPERADOR', 'analyses:create'), true);
});

test('SUPERVISOR — psico:respond permitido', () => {
  assert.equal(hasPermission('SUPERVISOR', 'psico:respond'), true);
});

test('isGlobalAdmin', () => {
  assert.equal(isGlobalAdmin({ role: 'ADMIN_GLOBAL' }), true);
  assert.equal(isGlobalAdmin({ role: 'ERGONOMISTA' }), false);
});

test('isTenantAdmin', () => {
  assert.equal(isTenantAdmin({ role: 'ADMIN_EMPRESA' }), true);
  assert.equal(isTenantAdmin({ role: 'ERGONOMISTA' }), false);
});
