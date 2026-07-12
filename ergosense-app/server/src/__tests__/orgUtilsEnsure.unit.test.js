import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rows } from './helpers/mockQuery.js';
import { ensureEmpresaUnidade } from '../services/orgUtils.js';

describe('orgUtils — ensureEmpresaUnidade com mock', () => {
  it('retorna empresa e unidade existentes', async () => {
    const empresa = { id: 10, tenant_id: 't1', razao_social: 'Co' };
    const unidade = { id: 20, tenant_id: 't1', empresa_id: 10, nome: 'Matriz', tipo: 'MATRIZ' };
    let step = 0;
    const runQuery = async (sql) => {
      step += 1;
      if (step === 1) return rows([empresa]);
      if (step === 2) return rows([unidade]);
      return rows([]);
    };
    const result = await ensureEmpresaUnidade(runQuery, 't1');
    assert.equal(result.empresa.id, 10);
    assert.equal(result.unidade.id, 20);
  });

  it('cria empresa quando ausente', async () => {
    const created = { id: 11, tenant_id: 't2', razao_social: 'Nova Co' };
    const unidade = { id: 21, tenant_id: 't2', empresa_id: 11, nome: 'Matriz', tipo: 'MATRIZ' };
    let step = 0;
    const runQuery = async (sql) => {
      step += 1;
      if (step === 1) return rows([]);
      if (step === 2) return rows([{ nome: 'Nova Co' }]);
      if (step === 3) return rows([created]);
      if (step === 4) return rows([]);
      if (step === 5) return rows([unidade]);
      return rows([]);
    };
    const result = await ensureEmpresaUnidade(runQuery, 't2');
    assert.equal(result.empresa.razao_social, 'Nova Co');
    assert.equal(result.unidade.nome, 'Matriz');
  });
});
