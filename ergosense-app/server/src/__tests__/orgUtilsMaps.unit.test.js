/**
 * orgUtils — mappers (sem DB)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mapEmpresa, mapUnidade, mapSetor, mapFuncao } from '../services/orgUtils.js';

test('mapEmpresa', () => {
  const m = mapEmpresa({
    id: 1,
    tenant_id: 'vale',
    razao_social: 'Vale S.A.',
    nome_fantasia: 'Vale',
    cnpj: '123',
    ativo: true,
    created_at: '2026-01-01',
    updated_at: '2026-01-02',
  });
  assert.equal(m.id, '1');
  assert.equal(m.tenantId, 'vale');
  assert.equal(m.legalName, 'Vale S.A.');
});

test('mapUnidade', () => {
  const m = mapUnidade({
    id: 2,
    tenant_id: 'vale',
    empresa_id: 1,
    nome: 'Carajás',
    tipo: 'UNIDADE',
    ativo: true,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  });
  assert.equal(m.companyId, '1');
  assert.equal(m.name, 'Carajás');
});

test('mapSetor', () => {
  const m = mapSetor({
    id: 3,
    tenant_id: 'vale',
    unidade_id: 2,
    unidade_nome: 'Carajás',
    nome: 'Mineração',
    ativo: true,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  });
  assert.equal(m.unitId, '2');
  assert.equal(m.name, 'Mineração');
});

test('mapFuncao', () => {
  const m = mapFuncao({
    id: 4,
    tenant_id: 'vale',
    setor_id: 3,
    setor_nome: 'Mineração',
    nome: 'Operador',
    ativo: true,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  });
  assert.equal(m.sectorId, '3');
  assert.equal(m.name, 'Operador');
});

test('mapEmpresa null', () => {
  assert.equal(mapEmpresa(null), null);
});
