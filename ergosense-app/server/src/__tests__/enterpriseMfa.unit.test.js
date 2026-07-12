/**
 * Testes unitários — MFA pending token
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMfaPendingToken,
  verifyMfaPendingToken,
} from '../services/mfa/MfaService.js';

test('MFA pending token round-trip', () => {
  const token = createMfaPendingToken(42);
  const userId = verifyMfaPendingToken(token);
  assert.equal(userId, 42);
});

test('MFA pending token inválido retorna null', () => {
  assert.equal(verifyMfaPendingToken('invalid.token'), null);
  assert.equal(verifyMfaPendingToken(''), null);
});

test('MFA pending token — assinatura adulterada retorna null', () => {
  const token = createMfaPendingToken(99);
  const [data] = token.split('.');
  assert.equal(verifyMfaPendingToken(`${data}.bad-signature`), null);
});

test('MFA pending token — payload malformado retorna null', () => {
  assert.equal(verifyMfaPendingToken('notbase64.notbase64'), null);
});
