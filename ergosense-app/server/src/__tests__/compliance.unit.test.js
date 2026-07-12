/**
 * Compliance Intelligence Engine — testes unitários
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compareNormTexts } from '../services/complianceDiffCore.js';
import { analyzeClientImpact, analyzeSystemImpact } from '../services/complianceImpactEngine.js';
import { fetchAllSourceItems, SOURCE_CODES } from '../services/complianceSourceAdapters.js';

describe('complianceSourceAdapters', () => {
  it('SOURCE_CODES inclui MTE, DOU, FUNDACENTRO, ESOCIAL', () => {
    assert.deepEqual(SOURCE_CODES, ['MTE', 'DOU', 'FUNDACENTRO', 'ESOCIAL']);
  });

  it('fetchAllSourceItems retorna itens por fonte', async () => {
    const items = await fetchAllSourceItems(['MTE', 'ESOCIAL']);
    assert.ok(items.length >= 2);
    assert.ok(items.every((i) => ['MTE', 'ESOCIAL'].includes(i.fonte)));
    assert.ok(items[0].textoCompleto);
  });
});

describe('complianceDiff', () => {
  it('compareNormTexts detecta linhas adicionadas e removidas', () => {
    const diff = compareNormTexts('linha A\nlinha B', 'linha A\nlinha C');
    assert.equal(diff.stats.added, 1);
    assert.equal(diff.stats.removed, 1);
    assert.ok(diff.added.includes('linha C'));
    assert.ok(diff.removed.includes('linha B'));
  });
});

describe('complianceImpactEngine', () => {
  const detection = {
    codigo_norma: 'NR-17',
    titulo: 'NR-17 revisão',
    tipo_evento: 'REVISAO',
    impacto_nivel: 'alto',
    modulos_afetados: ['NR17', 'AET'],
  };

  it('analyzeSystemImpact mapeia componentes do sistema', () => {
    const impacts = analyzeSystemImpact(detection);
    assert.ok(impacts.some((i) => i.modulo === 'AET'));
    assert.ok(impacts.every((i) => i.requer_atualizacao === true));
  });

  it('analyzeClientImpact gera perfis ESCRITORIO e GERAL', () => {
    const impacts = analyzeClientImpact(detection);
    assert.ok(impacts.some((i) => i.perfil_cliente === 'ESCRITORIO'));
    assert.ok(impacts.some((i) => i.perfil_cliente === 'GERAL'));
  });
});
