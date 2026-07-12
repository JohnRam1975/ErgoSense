import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatVersionNumber } from '../services/pgrSnapshot.js';
import { mapRiskOrgFields } from '../services/orgUtils.js';
import {
  mapEmpresa,
  mapUnidade,
  mapSetor,
  mapFuncao,
  mapAtividade,
  mapPosto,
  mapOrgChain,
} from '../services/orgUtils.js';

describe('pgrSnapshot — utilitários', () => {
  it('formatVersionNumber calcula major.minor', () => {
    assert.equal(formatVersionNumber(0), '1.0');
    assert.equal(formatVersionNumber(11), '2.1');
    assert.equal(formatVersionNumber(25), '3.5');
  });
});

describe('orgUtils — mappers estendidos', () => {
  it('mapRiskOrgFields inclui cadeia organizacional', () => {
    const mapped = mapRiskOrgFields({
      unidade_nome: 'Planta',
      funcao_nome: 'Operador',
      atividade_nome: 'Peneiramento',
      posto_nome: 'Posto 1',
    });
    assert.equal(mapped.unitName, 'Planta');
    assert.equal(mapped.functionName, 'Operador');
  });

  it('mapOrgChain normaliza IDs', () => {
    const chain = mapOrgChain({
      empresa_id: 1,
      unidade_id: 2,
      setor_id: 3,
      funcao_id: 4,
      atividade_id: 5,
      posto_id: 6,
      empresa_nome: 'Co',
      unidade_nome: 'U',
      setor_nome: 'S',
      funcao_nome: 'F',
      atividade_nome: 'A',
      posto_nome: 'P',
    });
    assert.equal(chain.companyId, '1');
    assert.equal(chain.workPostName, 'P');
  });

  it('mapEntidades NR-01', () => {
    assert.equal(mapEmpresa({ id: 1, tenant_id: 't', razao_social: 'Co', ativo: true }).legalName, 'Co');
    assert.equal(mapUnidade({ id: 1, tenant_id: 't', empresa_id: 1, nome: 'U', ativo: true }).name, 'U');
    assert.equal(mapSetor({ id: 1, tenant_id: 't', unidade_id: 1, nome: 'S', ativo: true }).name, 'S');
    assert.equal(mapFuncao({ id: 1, tenant_id: 't', setor_id: 1, nome: 'F', ativo: true }).name, 'F');
    assert.equal(mapAtividade({ id: 1, tenant_id: 't', funcao_id: 1, nome: 'A', ativo: true }).name, 'A');
    assert.equal(mapPosto({ id: 1, tenant_id: 't', atividade_id: 1, nome: 'P', ativo: true }).name, 'P');
  });
});
