/**
 * GRO — utilitários de ciclo e validação de etapas
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GRO_STAGES,
  nextStage,
  prevStage,
  computeGroMaturity,
  validateStageAdvance,
} from '../groUtils.js';

test('nextStage — avança etapas válidas', () => {
  assert.equal(nextStage('IDENTIFICACAO'), 'AVALIACAO');
  assert.equal(nextStage('REVISAO'), null);
  assert.equal(nextStage('INVALID'), null);
});

test('prevStage — retrocede etapas válidas', () => {
  assert.equal(prevStage('AVALIACAO'), 'IDENTIFICACAO');
  assert.equal(prevStage('IDENTIFICACAO'), null);
});

test('computeGroMaturity — 0 quando total vazio', () => {
  assert.equal(computeGroMaturity({}, 0), 0);
});

test('computeGroMaturity — calcula maturidade ponderada', () => {
  const maturity = computeGroMaturity({ REVISAO: 2, IDENTIFICACAO: 2 }, 4);
  assert.ok(maturity > 50);
  assert.ok(maturity <= 100);
});

test('validateStageAdvance — risco inexistente', async () => {
  const mockQuery = async () => ({ rows: [] });
  const result = await validateStageAdvance(mockQuery, 'vale', 1, 'IDENTIFICACAO', 'AVALIACAO');
  assert.equal(result.ok, false);
  assert.match(result.error, /não encontrado/i);
});

test('validateStageAdvance — AVALIACAO exige fonte e perigo', async () => {
  const mockQuery = async () => ({ rows: [{ fonte_geradora: '', perigo: '' }] });
  const result = await validateStageAdvance(mockQuery, 'vale', 1, 'IDENTIFICACAO', 'AVALIACAO');
  assert.equal(result.ok, false);
});

test('validateStageAdvance — AVALIACAO ok com dados', async () => {
  const risk = { fonte_geradora: 'Posto', perigo: 'Esforço', probabilidade: null, severidade: null, medidas_controle: '' };
  const mockQuery = async () => ({ rows: [risk] });
  const result = await validateStageAdvance(mockQuery, 'vale', 1, 'IDENTIFICACAO', 'AVALIACAO');
  assert.equal(result.ok, true);
});

test('validateStageAdvance — CONTROLE exige probabilidade e severidade', async () => {
  const mockQuery = async () => ({ rows: [{ fonte_geradora: 'x', perigo: 'y', probabilidade: null, severidade: null }] });
  const result = await validateStageAdvance(mockQuery, 'vale', 1, 'AVALIACAO', 'CONTROLE');
  assert.equal(result.ok, false);
});

test('validateStageAdvance — MONITORAMENTO exige medidas ou plano', async () => {
  let call = 0;
  const mockQuery = async (sql) => {
    call += 1;
    if (call === 1) {
      return { rows: [{ medidas_controle: '', probabilidade: 3, severidade: 3 }] };
    }
    return { rows: [{ c: 0 }] };
  };
  const result = await validateStageAdvance(mockQuery, 'vale', 1, 'CONTROLE', 'MONITORAMENTO');
  assert.equal(result.ok, false);
});

test('validateStageAdvance — REVISAO exige indicador medido', async () => {
  let call = 0;
  const mockQuery = async () => {
    call += 1;
    if (call === 1) return { rows: [{ medidas_controle: 'EPI' }] };
    return { rows: [{ c: 0 }] };
  };
  const result = await validateStageAdvance(mockQuery, 'vale', 1, 'MONITORAMENTO', 'REVISAO');
  assert.equal(result.ok, false);
});

test('GRO_STAGES — ordem NR-01', () => {
  assert.deepEqual(GRO_STAGES.length, 5);
  assert.equal(GRO_STAGES[0], 'IDENTIFICACAO');
  assert.equal(GRO_STAGES[4], 'REVISAO');
});
