/**
 * Política de senhas
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePassword } from '../auth/password.js';

test('senha vazia rejeitada', () => {
  assert.equal(validatePassword('').ok, false);
});

test('senha curta rejeitada', () => {
  assert.equal(validatePassword('Ab1').ok, false);
});

test('senha sem maiúscula rejeitada', () => {
  assert.equal(validatePassword('abcdef1').ok, false);
});

test('senha válida aceita', () => {
  assert.equal(validatePassword('AuditTest!2026').ok, true);
});

test('senha com maiúscula minúscula e número', () => {
  assert.equal(validatePassword('Ergo1234').ok, true);
});
