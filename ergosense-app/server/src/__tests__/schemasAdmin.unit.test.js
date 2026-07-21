/**
 * Schemas admin onboarding
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  tenantBlockSchema,
  tenantReactivateSchema,
  tenantRejectSchema,
  tenantAdjustSchema,
  tenantUpdateSchema,
  activateAccountSchema,
  tenantRequestPublicSchema,
} from '../validation/schemas.js';

test('tenantBlockSchema — exige reason min 3', () => {
  assert.equal(tenantBlockSchema.safeParse({}).success, false);
  assert.equal(tenantBlockSchema.safeParse({ reason: 'ab' }).success, false);
  assert.equal(tenantBlockSchema.safeParse({ reason: 'Bloqueio por inadimplência' }).success, true);
});

test('tenantReactivateSchema — exige confirm true', () => {
  assert.equal(tenantReactivateSchema.safeParse({}).success, false);
  assert.equal(tenantReactivateSchema.safeParse({ confirm: false }).success, false);
  assert.equal(tenantReactivateSchema.safeParse({ confirm: true }).success, true);
});

test('tenantRejectSchema — reason obrigatório', () => {
  assert.equal(tenantRejectSchema.safeParse({ reason: 'ok' }).success, false);
  assert.equal(tenantRejectSchema.safeParse({ reason: 'Documentação incompleta' }).success, true);
});

test('tenantAdjustSchema — message obrigatório', () => {
  assert.equal(tenantAdjustSchema.safeParse({ message: 'Corrigir CNPJ' }).success, true);
});

test('tenantUpdateSchema — campos opcionais', () => {
  assert.equal(tenantUpdateSchema.safeParse({ name: 'Nova Empresa' }).success, true);
});

test('activateAccountSchema — senhas e MFA', () => {
  assert.equal(
    activateAccountSchema.safeParse({
      token: 'x'.repeat(16),
      password: 'Senha123',
      confirmPassword: 'Senha123',
      mfaCode: '123456',
    }).success,
    true,
  );
});

test('tenantRequestPublicSchema — CNPJ e email', () => {
  assert.equal(
    tenantRequestPublicSchema.safeParse({
      razaoSocial: 'Empresa Teste LTDA',
      cnpj: '11.222.333/0001-81',
      segmento: 'Mineração',
      responsavelNome: 'João Silva',
      email: 'joao@empresa.com',
      telefone: '11999998888',
    }).success,
    true,
  );
});

test('tenantRequestPublicSchema — autônomo exige CPF e endereço', () => {
  assert.equal(
    tenantRequestPublicSchema.safeParse({
      tipoCadastro: 'AUTONOMO',
      razaoSocial: 'Maria Souza',
      cpf: '529.982.247-25',
      segmento: 'Ergonomia',
      responsavelNome: 'Maria Souza',
      email: 'maria@exemplo.com',
      telefone: '11988887777',
      password: 'Senha123',
      confirmPassword: 'Senha123',
      logradouro: 'Rua das Flores',
      numero: '100',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01310-100',
    }).success,
    true,
  );
  assert.equal(
    tenantRequestPublicSchema.safeParse({
      tipoCadastro: 'AUTONOMO',
      razaoSocial: 'Maria Souza',
      cpf: '529.982.247-25',
      segmento: 'Ergonomia',
      responsavelNome: 'Maria Souza',
      email: 'maria@exemplo.com',
      telefone: '11988887777',
    }).success,
    false,
  );
});

test('tenantRequestPublicSchema — autônomo exige senha e confirmação iguais', () => {
  assert.equal(
    tenantRequestPublicSchema.safeParse({
      tipoCadastro: 'AUTONOMO',
      razaoSocial: 'Maria Souza',
      cpf: '529.982.247-25',
      segmento: 'Ergonomia',
      responsavelNome: 'Maria Souza',
      email: 'maria@exemplo.com',
      telefone: '11988887777',
      password: 'Senha123',
      confirmPassword: 'Outra123',
      logradouro: 'Rua das Flores',
      numero: '100',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01310-100',
    }).success,
    false,
  );
});
