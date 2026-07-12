/**
 * Testes — onboarding de tenants (CNPJ, protocolo)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCnpj, isValidCnpj, normalizeCnpj } from '../utils/cnpj.js';

test('CNPJ válido conhecido', () => {
  assert.equal(isValidCnpj('11.222.333/0001-81'), true);
});

test('CNPJ inválido — dígitos repetidos', () => {
  assert.equal(isValidCnpj('11.111.111/1111-11'), false);
});

test('normalizeCnpj remove máscara', () => {
  assert.equal(normalizeCnpj('11.222.333/0001-81'), '11222333000181');
});

test('formatCnpj aplica máscara', () => {
  assert.equal(formatCnpj('11222333000181'), '11.222.333/0001-81');
});

test('CNPJ curto é inválido', () => {
  assert.equal(isValidCnpj('123'), false);
});
