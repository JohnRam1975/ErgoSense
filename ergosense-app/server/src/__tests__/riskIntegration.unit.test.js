import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapRiskLevelToMatrix,
  suggestGroStage,
  needsCapa,
  ORIGIN_MODULES,
} from '../services/riskIntegrationHub.js';
import { computeRiskLevel } from '../riskInventoryUtils.js';

describe('riskIntegrationHub — matriz e GRO', () => {
  it('mapeia nível critico para prob/severidade altas', () => {
    const m = mapRiskLevelToMatrix('critico');
    assert.equal(m.probabilidade, 5);
    assert.equal(m.severidade, 5);
    assert.equal(computeRiskLevel(m.probabilidade, m.severidade), 'critico');
  });

  it('RULA elevado eleva matriz', () => {
    const m = mapRiskLevelToMatrix('baixo', 7, null);
    assert.ok(m.probabilidade >= 3);
  });

  it('sugere etapa GRO conforme nível', () => {
    assert.equal(suggestGroStage('critico', true), 'CONTROLE');
    assert.equal(suggestGroStage('critico', false), 'AVALIACAO');
    assert.equal(suggestGroStage('baixo', false), 'IDENTIFICACAO');
  });

  it('CAPA obrigatória para NC e critico', () => {
    assert.equal(needsCapa('critico', 'ANALISE'), true);
    assert.equal(needsCapa('medio', 'NC'), true);
    assert.equal(needsCapa('medio', 'ANALISE'), false);
  });

  it('origens suportadas', () => {
    assert.ok(ORIGIN_MODULES.includes('ANALISE'));
    assert.ok(ORIGIN_MODULES.includes('AET'));
    assert.ok(ORIGIN_MODULES.includes('PSICOSSOCIAL'));
    assert.ok(ORIGIN_MODULES.includes('INSPECAO'));
    assert.ok(ORIGIN_MODULES.includes('AUDITORIA'));
    assert.ok(ORIGIN_MODULES.includes('NC'));
  });
});
