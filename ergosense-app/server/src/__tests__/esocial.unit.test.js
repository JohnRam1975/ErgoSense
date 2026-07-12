/**
 * eSocial S-1.3 — testes unitários completos
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEsocialXml,
  generateEventId,
  hashXml,
  escapeXml,
  onlyDigits,
} from '../services/esocialXml.js';
import { validateEsocialConfig, validateEsocialPayload } from '../services/esocialValidator.js';
import { validateEsocialXsdS13 } from '../services/esocialXsdValidator.js';
import { DevIcpSigner, stripExistingSignatures } from '../services/esocialIcpSigner.js';
import { MockGovbrAdapter, HttpGovbrAdapter, createGovbrAdapter } from '../services/esocialGovbrAdapter.js';
import { TRANSMISSION_STATUS } from '../services/esocialConstants.js';

const baseConfig = {
  tp_insc: 1,
  nr_insc: '11222333000181',
  ambiente: 2,
  proc_emi: 1,
  ver_proc: 'ErgoSensePro 1.0',
};

const basePayload = {
  cpfTrab: '52998224725',
  matricula: '00142',
  cat: {
    dtAcid: '2026-06-01',
    tpAcid: '1',
    hrAcid: '0800',
    hrsTrabAntesAcid: '0400',
    tpCat: '1',
    indCatObito: 'N',
    codSitGeradora: '200004300',
    iniciatCAT: '1',
    tpLocal: '1',
    dscLocal: 'Setor beneficiamento',
    codParteAting: '753030000',
    codAgntCausador: '302010200',
    dtAtendimento: '2026-06-01',
    codCID: 'S699',
    nmEmit: 'Dr. Teste',
    nrOC: '123456',
  },
};

describe('esocialXml — geração S-2210/S-2220/S-2240', () => {
  it('generateEventId produz 36 caracteres', () => {
    const id = generateEventId(1, '11222333000181', 1);
    assert.equal(id.length, 36);
    assert.match(id, /^ID/);
  });

  it('buildEsocialXml S-2210 contém namespace S-1.3', () => {
    const id = generateEventId(1, baseConfig.nr_insc, 1);
    const xml = buildEsocialXml('S-2210', baseConfig, id, basePayload);
    assert.ok(xml.includes('evtCAT'));
    assert.ok(xml.includes('v_S_01_03_00'));
    assert.ok(xml.includes('ideEmpregador'));
    assert.ok(xml.includes('cat'));
  });

  it('buildEsocialXml S-2220 contém exMedOcup', () => {
    const id = generateEventId(1, baseConfig.nr_insc, 2);
    const xml = buildEsocialXml('S-2220', baseConfig, id, {
      ...basePayload,
      exames: [{ dtExm: '2026-06-01', procRealizado: '0295', indResult: '1' }],
    });
    assert.ok(xml.includes('evtMonit'));
    assert.ok(xml.includes('exMedOcup'));
  });

  it('buildEsocialXml S-2240 contém infoExpRisco e agNoc', () => {
    const id = generateEventId(1, baseConfig.nr_insc, 3);
    const xml = buildEsocialXml('S-2240', baseConfig, id, {
      ...basePayload,
      dtIniCondicao: '2026-06-01',
      agentes: [{ codAgNoc: '302010200', dscAgNoc: 'Postura inadequada', tpAval: '1', intConc: '3' }],
      expRisco: { dscSetor: 'Beneficiamento', dscAtiv: 'Operação' },
    });
    assert.ok(xml.includes('evtExpRisco'));
    assert.ok(xml.includes('agNoc'));
  });

  it('escapeXml sanitiza caracteres especiais', () => {
    assert.equal(escapeXml('a & b'), 'a &amp; b');
    assert.equal(onlyDigits('11.222.333/0001-81'), '11222333000181');
  });

  it('hashXml é determinístico', () => {
    const h1 = hashXml('<a>1</a>');
    const h2 = hashXml('<a>1</a>');
    assert.equal(h1, h2);
  });
});

describe('esocialValidator — payload e config', () => {
  it('rejeita CPF inválido', () => {
    const r = validateEsocialPayload('S-2210', baseConfig, { ...basePayload, cpfTrab: '11111111111' });
    assert.equal(r.valid, false);
    assert.ok(r.errors.some((e) => e.field === 'cpfTrab'));
  });

  it('valida config com CNPJ', () => {
    const r = validateEsocialConfig(baseConfig);
    assert.equal(r.valid, true);
  });

  it('S-2240 exige agente nocivo', () => {
    const r = validateEsocialPayload('S-2240', baseConfig, { matricula: '1' });
    assert.equal(r.valid, false);
  });
});

describe('esocialXsdValidator — layout S-1.3', () => {
  it('valida XML S-2210 estruturalmente', () => {
    const id = generateEventId(1, baseConfig.nr_insc, 10);
    const xml = buildEsocialXml('S-2210', baseConfig, id, basePayload);
    const r = validateEsocialXsdS13(xml, 'S-2210');
    assert.equal(r.schemaVersion, 'S-1.3');
    assert.equal(r.valid, true, r.errors.map((e) => e.message).join('; '));
  });

  it('rejeita XML sem evtCAT', () => {
    const r = validateEsocialXsdS13('<eSocial></eSocial>', 'S-2210');
    assert.equal(r.valid, false);
  });

  it('avisa assinatura ausente antes de ICP', () => {
    const id = generateEventId(1, baseConfig.nr_insc, 11);
    const xml = buildEsocialXml('S-2220', baseConfig, id, {
      matricula: '99',
      exames: [{ dtExm: '2026-06-01', procRealizado: '0295' }],
    });
    const r = validateEsocialXsdS13(xml, 'S-2220');
    assert.ok(r.warnings.some((w) => w.field === 'Signature'));
  });
});

describe('esocialIcpSigner — assinatura XML-DSig', () => {
  it('DevIcpSigner assina S-2210 com Signature válida', async () => {
    const id = generateEventId(1, baseConfig.nr_insc, 20);
    const xml = buildEsocialXml('S-2210', baseConfig, id, basePayload);
    const signer = new DevIcpSigner();
    const { signedXml, signatureMode } = await signer.sign(xml, 'S-2210');
    assert.equal(signatureMode, 'DEV-ICP');
    assert.ok(signedXml.includes('<Signature'));
    assert.ok(signedXml.includes('<SignatureValue>'));
    assert.ok(!signedXml.includes('PENDENTE_CERTIFICADO'));
    const xsd = validateEsocialXsdS13(signedXml, 'S-2210');
    assert.equal(xsd.valid, true, xsd.errors.map((e) => e.message).join('; '));
  });

  it('stripExistingSignatures remove assinatura anterior', async () => {
    const id = generateEventId(1, baseConfig.nr_insc, 21);
    let xml = buildEsocialXml('S-2240', baseConfig, id, {
      matricula: '1',
      dtIniCondicao: '2026-06-01',
      agentes: [{ codAgNoc: '302010200', tpAval: '1', intConc: '3' }],
    });
    const signer = new DevIcpSigner();
    xml = (await signer.sign(xml, 'S-2240')).signedXml;
    const stripped = stripExistingSignatures(xml, 'S-2240');
    assert.ok(!stripped.includes('<Signature'));
  });
});

describe('esocialGovbrAdapter — gov.br desacoplado', () => {
  it('MockGovbrAdapter aceita lote válido', async () => {
    const adapter = new MockGovbrAdapter({ ...baseConfig, govbr_habilitado: true });
    const r = await adapter.sendLote({ loteId: 'L1', xml: '<eSocial/>', eventType: 'S-2210', tenantId: 'vale' });
    assert.equal(r.status, TRANSMISSION_STATUS.PROCESSANDO);
    assert.ok(r.protocolo);
    const consult = await adapter.consultStatus({ protocolo: r.protocolo, loteId: 'L1' });
    assert.equal(consult.status, TRANSMISSION_STATUS.ACEITO);
  });

  it('MockGovbrAdapter rejeita marcador ESOCIAL_FORCE_REJECT', async () => {
    const adapter = new MockGovbrAdapter(baseConfig);
    const r = await adapter.sendLote({
      loteId: 'L2',
      xml: 'ESOCIAL_FORCE_REJECT',
      eventType: 'S-2210',
      tenantId: 'vale',
    });
    assert.equal(r.status, TRANSMISSION_STATUS.REJEITADO);
    assert.ok(r.erros.length > 0);
  });

  it('HttpGovbrAdapter retorna stub preparado', async () => {
    const adapter = new HttpGovbrAdapter({ ...baseConfig, govbr_habilitado: true });
    const r = await adapter.sendLote({ loteId: 'L3', xml: '<eSocial/>' });
    assert.equal(r.codigoResposta, 'NOT_IMPLEMENTED');
    assert.ok(r.respostaRaw.includes('soap:Envelope'));
  });

  it('createGovbrAdapter seleciona modo', () => {
    assert.ok(createGovbrAdapter({ govbr_modo: 'MOCK' }) instanceof MockGovbrAdapter);
    assert.ok(createGovbrAdapter({ govbr_modo: 'HTTP' }) instanceof HttpGovbrAdapter);
  });
});
