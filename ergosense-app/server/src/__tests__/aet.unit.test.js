/**
 * AET Corporativo — testes unitários
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AET_SIGNATURE_TYPES,
  EDITABLE_AET_STATUSES,
  REQUIRED_AET_SIGNATURES,
  computeAetDocumentHash,
  formatAetVersionNumber,
} from '../services/aetCorporateService.js';
import { buildAetNormativeReport } from '../services/aetReport.js';

describe('aetCorporateService — versionamento', () => {
  it('formatAetVersionNumber gera AET-001', () => {
    assert.equal(formatAetVersionNumber(1), 'AET-001');
    assert.equal(formatAetVersionNumber(12), 'AET-012');
  });

  it('computeAetDocumentHash é determinístico', () => {
    const payload = { snapshot: { a: 1 }, report: { b: 2 }, version: 'AET-001' };
    const h1 = computeAetDocumentHash(payload);
    const h2 = computeAetDocumentHash(payload);
    assert.equal(h1, h2);
    assert.match(h1, /^[a-f0-9]{64}$/);
  });

  it('EDITABLE_AET_STATUSES inclui RASCUNHO e EM_REVISAO', () => {
    assert.ok(EDITABLE_AET_STATUSES.has('RASCUNHO'));
    assert.ok(EDITABLE_AET_STATUSES.has('EM_REVISAO'));
    assert.equal(EDITABLE_AET_STATUSES.has('APROVADO'), false);
  });

  it('REQUIRED_AET_SIGNATURES inclui RT e ERGONOMISTA', () => {
    assert.ok(REQUIRED_AET_SIGNATURES.includes('RESPONSAVEL_TECNICO'));
    assert.ok(REQUIRED_AET_SIGNATURES.includes('ERGONOMISTA'));
    assert.ok(REQUIRED_AET_SIGNATURES.includes('ELABORADOR'));
  });

  it('AET_SIGNATURE_TYPES inclui CREA via RESPONSAVEL_TECNICO', () => {
    assert.ok(AET_SIGNATURE_TYPES.includes('RESPONSAVEL_TECNICO'));
    assert.ok(AET_SIGNATURE_TYPES.includes('ERGONOMISTA'));
  });
});

describe('aetReport — relatório corporativo', () => {
  const baseProcess = {
    id: '1',
    title: 'AET Operador',
    stage: 'CONSOLIDACAO',
    status: 'EM_REVISAO',
    characterization: { funcao: 'Operador' },
    methods: { rula: { score: 5 } },
    wholeBodyVibration: {},
    handArmVibration: {},
    telework: {},
    workOrganization: {},
    actionPlan: [{ description: 'Ajustar cadeira' }],
    preparedBy: 'Maria',
    reviewedBy: '',
    ergonomistName: '',
    ergonomistRegistry: '',
    signedAt: null,
    technicalResponsible: 'Eng. João',
    technicalResponsibleCrea: 'CREA-SP 123456',
    technicalResponsibleArt: 'ART-2026-001',
    documentHash: '',
  };

  it('buildAetNormativeReport corporativo inclui RT e integrações', () => {
    const report = buildAetNormativeReport(baseProcess, {
      versionNumber: 'AET-001',
      technicalResponsible: {
        nome: 'Eng. João',
        crea: 'CREA-SP 123456',
        art: 'ART-2026-001',
      },
      integrations: {
        inventario: { id: '10', perigo: 'Postura inadequada', nivel: 'medio' },
        gro: [{ id: '5', descricao: 'Plano ergonomia' }],
        pgr: { numero: 'PGR-003', status: 'APROVADO' },
        psicossocial: [{ id: '2', fatorCodigo: 'F1', nivel: 'medio' }],
      },
    });

    assert.equal(report.type, 'AET_NORMATIVO_CORPORATIVO');
    assert.equal(report.versionNumber, 'AET-001');
    assert.equal(report.responsavelTecnico.crea, 'CREA-SP 123456');
    assert.ok(report.sections.some((s) => s.id === '11'));
    assert.ok(report.integrations?.inventario);
  });

  it('buildAetNormativeReport mantém 10 seções base sem integrações', () => {
    const report = buildAetNormativeReport(baseProcess, {});
    assert.equal(report.sections.length, 10);
    assert.equal(report.type, 'AET_NORMATIVO_CORPORATIVO');
  });
});
