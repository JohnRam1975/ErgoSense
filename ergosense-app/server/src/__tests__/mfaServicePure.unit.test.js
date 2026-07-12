import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createMfaPendingToken,
  verifyMfaPendingToken,
} from '../services/mfa/MfaService.js';

describe('MfaService — tokens pendentes', () => {
  it('createMfaPendingToken gera token verificável', () => {
    const token = createMfaPendingToken('user-123');
    assert.ok(token.includes('.'));
    const userId = verifyMfaPendingToken(token);
    assert.equal(userId, 'user-123');
  });

  it('verifyMfaPendingToken rejeita assinatura inválida', () => {
    const token = createMfaPendingToken('user-123');
    const [data] = token.split('.');
    assert.equal(verifyMfaPendingToken(`${data}.bad-signature`), null);
  });

  it('verifyMfaPendingToken rejeita token malformado', () => {
    assert.equal(verifyMfaPendingToken('not-a-token'), null);
  });
});
