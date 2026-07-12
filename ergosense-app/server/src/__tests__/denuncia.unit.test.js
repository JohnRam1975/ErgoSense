import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DENUNCIA_TIPOS,
  DENUNCIA_TIPO_LABELS,
  PSICO_FATOR_BY_TIPO,
  hashAccessToken,
  generateAccessToken,
  anonymizeIp,
  suggestGravidade,
  defaultRetentionDate,
  LGPD_DENUNCIA_BASE_LEGAL,
} from '../services/denunciaService.js';
import { ORIGIN_MODULES } from '../services/riskIntegrationHub.js';

describe('denunciaService — Canal Corporativo', () => {
  it('cobre os 5 tipos exigidos', () => {
    assert.equal(DENUNCIA_TIPOS.length, 5);
    assert.ok(DENUNCIA_TIPOS.includes('ASSEDIO_MORAL'));
    assert.ok(DENUNCIA_TIPOS.includes('ASSEDIO_SEXUAL'));
    assert.ok(DENUNCIA_TIPOS.includes('VIOLENCIA'));
    assert.ok(DENUNCIA_TIPOS.includes('DISCRIMINACAO'));
    assert.ok(DENUNCIA_TIPOS.includes('SOBRECARGA_PSICOLOGICA'));
  });

  it('mapeia tipos para fatores psicossociais MTE', () => {
    assert.equal(PSICO_FATOR_BY_TIPO.ASSEDIO_SEXUAL, 'F02');
    assert.equal(PSICO_FATOR_BY_TIPO.VIOLENCIA, 'F11');
    assert.equal(PSICO_FATOR_BY_TIPO.SOBRECARGA_PSICOLOGICA, 'F01');
    assert.ok(DENUNCIA_TIPO_LABELS.ASSEDIO_MORAL);
  });

  it('anonimiza IP para LGPD', () => {
    assert.equal(anonymizeIp('192.168.1.100'), '192.168.xxx.xxx');
  });

  it('gera hash estável para token de acesso anônimo', () => {
    const token = generateAccessToken();
    assert.equal(hashAccessToken(token), hashAccessToken(token));
    assert.notEqual(token, hashAccessToken(token));
  });

  it('sugere gravidade por tipo', () => {
    assert.equal(suggestGravidade('ASSEDIO_SEXUAL'), 'critico');
    assert.equal(suggestGravidade('SOBRECARGA_PSICOLOGICA'), 'medio');
  });

  it('define retenção LGPD futura', () => {
    const d = defaultRetentionDate(5);
    assert.ok(d > new Date().toISOString().slice(0, 10));
  });

  it('base legal LGPD definida', () => {
    assert.equal(LGPD_DENUNCIA_BASE_LEGAL, 'obrigacao_legal');
  });

  it('integração NR-01 inclui origem DENUNCIA', () => {
    assert.ok(ORIGIN_MODULES.includes('DENUNCIA'));
  });
});
