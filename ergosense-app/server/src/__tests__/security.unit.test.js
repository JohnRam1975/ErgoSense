/**
 * Testes unitários de segurança (RBAC, senha, sanitização)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { hasPermission, requirePermission } from '../auth/rbac.js';
import { validatePassword } from '../auth/password.js';
import { escapeHtml, sanitizePlainText } from '../auth/sanitize.js';

test('RBAC — ADMIN_GLOBAL tem acesso total', () => {
  assert.equal(hasPermission('ADMIN_GLOBAL', 'analyses:delete'), true);
  assert.equal(hasPermission('ADMIN_GLOBAL', 'anything:else'), true);
});

test('RBAC — OPERADOR não pode deletar análises', () => {
  assert.equal(hasPermission('OPERADOR', 'analyses:delete'), false);
  assert.equal(hasPermission('OPERADOR', 'analyses:create'), true);
  assert.equal(hasPermission('OPERADOR', 'analyses:read'), true);
});

test('RBAC — OPERADOR não pode criar colaboradores nem ler relatórios', () => {
  assert.equal(hasPermission('OPERADOR', 'collaborators:create'), false);
  assert.equal(hasPermission('OPERADOR', 'reports:read'), false);
});

test('RBAC — ERGONOMISTA tem analyses:*', () => {
  assert.equal(hasPermission('ERGONOMISTA', 'analyses:delete'), true);
});

test('RBAC — requirePermission retorna 403', () => {
  const handler = requirePermission('analyses:delete');
  let statusCode;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json() {},
  };
  handler({ user: { role: 'OPERADOR' } }, res, () => assert.fail('next should not be called'));
  assert.equal(statusCode, 403);
});

test('Senha — rejeita curta e fraca', () => {
  assert.equal(validatePassword('abc').ok, false);
  assert.equal(validatePassword('abcdefgh').ok, false);
  assert.equal(validatePassword('Abcdef12').ok, true);
});

test('Sanitização — escapa XSS', () => {
  assert.equal(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;&#x2F;script&gt;');
  assert.equal(sanitizePlainText('  ok  '), 'ok');
});

test('Inventário — nível de risco pela matriz', async () => {
  const { computeRiskLevel, computeRiskScore } = await import('../riskInventoryUtils.js');
  assert.equal(computeRiskScore(5, 5), 25);
  assert.equal(computeRiskLevel(5, 5), 'critico');
  assert.equal(computeRiskLevel(2, 2), 'baixo');
});
