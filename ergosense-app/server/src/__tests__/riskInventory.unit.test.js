import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseEvidencias,
  validateNr015732Payload,
  LINK_MODULES,
} from '../services/riskInventoryLinks.js';

describe('riskInventoryLinks — NR-01 §1.5.7.3.2', () => {
  it('parseEvidencias aceita strings e objetos', () => {
    const list = parseEvidencias([
      'Laudo ambiental 2025',
      { tipo: 'AET', descricao: 'AET teleatendimento', referencia: '42' },
    ]);
    assert.equal(list.length, 2);
    assert.equal(list[0].descricao, 'Laudo ambiental 2025');
    assert.equal(list[1].tipo, 'AET');
  });

  it('valida campos obrigatórios de exposição', () => {
    const base = {
      tipo: 'FISICO',
      exposicaoDuracao: '8h/dia',
      exposicaoFrequencia: 'Diária',
      exposicaoIntensidade: '85 dB(A)',
      numeroTrabalhadoresExpostos: 5,
      grupoHomogeneoExposicao: 'Operadores linha 1',
      evidencias: [{ descricao: 'Medição acústica' }],
    };
    assert.deepEqual(validateNr015732Payload(base, {}), []);
  });

  it('exige vínculo ergonômico com Análise ou AET', () => {
    const parsed = {
      tipo: 'ERGONOMICO',
      exposicaoDuracao: '8h',
      exposicaoFrequencia: 'Diária',
      exposicaoIntensidade: 'RULA 5',
      numeroTrabalhadoresExpostos: 3,
      grupoHomogeneoExposicao: 'Digitadores',
      evidencias: [{ descricao: 'Análise postural' }],
    };
    const errors = validateNr015732Payload(parsed, {});
    assert.ok(errors.some((e) => e.includes('Análise Ergonômica ou AET')));
    assert.deepEqual(
      validateNr015732Payload(parsed, { analiseId: 10 }),
      [],
    );
  });

  it('rejeita inventário sem evidências', () => {
    const errors = validateNr015732Payload(
      {
        tipo: 'ACIDENTE',
        exposicaoDuracao: '1h',
        exposicaoFrequencia: 'Semanal',
        exposicaoIntensidade: 'Alta',
        numeroTrabalhadoresExpostos: 2,
        grupoHomogeneoExposicao: 'Manutenção',
        evidencias: [],
      },
      {},
    );
    assert.ok(errors.some((e) => e.includes('evidência')));
  });

  it('LINK_MODULES cobre cadeia Inventário ↔ PGR', () => {
    assert.ok(LINK_MODULES.includes('ANALISE'));
    assert.ok(LINK_MODULES.includes('AET'));
    assert.ok(LINK_MODULES.includes('GRO'));
    assert.ok(LINK_MODULES.includes('PGR'));
  });
});
