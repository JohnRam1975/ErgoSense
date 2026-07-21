/**
 * Testes — onboarding de tenants (CNPJ, protocolo)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCnpj, isValidCnpj, normalizeCnpj } from '../utils/cnpj.js';
import { formatCpf, isValidCpf, normalizeCpf } from '../utils/cpf.js';

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

test('CPF válido conhecido', () => {
  assert.equal(isValidCpf('529.982.247-25'), true);
});

test('CPF inválido — dígitos repetidos', () => {
  assert.equal(isValidCpf('111.111.111-11'), false);
});

test('normalizeCpf e formatCpf', () => {
  assert.equal(normalizeCpf('529.982.247-25'), '52998224725');
  assert.equal(formatCpf('52998224725'), '529.982.247-25');
});
