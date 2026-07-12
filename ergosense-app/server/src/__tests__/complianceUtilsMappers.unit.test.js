/**
 * complianceUtils — mappers e hash (sem DB)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FONTES_PADRAO,
  MODULOS_ERGOSENSE,
  hashContent,
  mapFonte,
  mapNorma,
  mapVersao,
} from '../services/complianceUtils.js';

test('FONTES_PADRAO — 4 fontes oficiais', () => {
  assert.equal(FONTES_PADRAO.length, 4);
  assert.ok(FONTES_PADRAO.some((f) => f.codigo === 'MTE'));
});

test('MODULOS_ERGOSENSE — inclui PGR e eSocial', () => {
  assert.ok(MODULOS_ERGOSENSE.includes('PGR'));
  assert.ok(MODULOS_ERGOSENSE.includes('ESOCIAL'));
});

test('hashContent — determinístico SHA-256', () => {
  assert.equal(hashContent('abc'), hashContent('abc'));
  assert.notEqual(hashContent('abc'), hashContent('xyz'));
});

test('mapFonte — campos monitoramento', () => {
  const m = mapFonte({
    id: 1,
    codigo: 'MTE',
    nome: 'MTE',
    url_monitoramento: 'https://gov.br',
    ativo: true,
    intervalo_horas: 24,
    ultima_varredura: null,
    ultimo_status: 'ok',
  });
  assert.equal(m.code, 'MTE');
  assert.equal(m.intervalHours, 24);
});

test('mapNorma — versão opcional', () => {
  const m = mapNorma(
    {
      id: 2,
      codigo: 'NR-01',
      titulo: 'Disposições Gerais',
      orgao: 'MTE',
      fonte: 'MTE',
      area: 'SST',
      status: 'vigente',
      modulos_impactados: ['PGR'],
      updated_at: '2026-01-01',
    },
    { numero_versao: '2024' },
  );
  assert.equal(m.code, 'NR-01');
  assert.deepEqual(m.impactedModules, ['PGR']);
  assert.equal(m.currentVersion.numero_versao, '2024');
});

test('mapVersao — texto e hash', () => {
  const m = mapVersao({
    id: 3,
    norma_id: 2,
    numero_versao: 'v1',
    numero_sequencial: 1,
    tipo_alteracao: 'revisao',
    texto_resumo: 'Resumo',
    texto_completo: null,
    data_publicacao: '2026-01-01',
    data_vigencia: '2026-02-01',
    referencia_dou: 'DOU 1',
    hash_conteudo: 'abc123',
    validada: true,
    validada_por: 'Auditor',
    validada_em: '2026-01-02',
    created_at: '2026-01-01',
  });
  assert.equal(m.normId, '2');
  assert.equal(m.fullText, 'Resumo');
  assert.equal(m.validated, true);
});
