import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { setupIntegration } from '../setup/testDb.js';
import { FIXTURES } from '../fixtures/users.js';
import { createMfaPendingToken, verifyMfaPendingToken } from '../../src/services/mfa/MfaService.js';
import { buildPgrSnapshot, formatVersionNumber } from '../../src/services/pgrSnapshot.js';
import { nextProtocol, mapDenunciaRow } from '../../src/services/denunciaService.js';
import { ensureEmpresaUnidade } from '../../src/services/orgUtils.js';
import { ensureEsocialConfig } from '../../src/services/esocialUtils.js';
import { buildComplianceDashboard } from '../../src/services/complianceUtils.js';
import { rows, createMockRunQuery } from '../../src/__tests__/helpers/mockQuery.js';
import { guardIntegration } from '../helpers/skip.js';

before(async () => setupIntegration());

describe('Services DB-heavy', () => {
  it('MfaService tokens pendentes (pure)', () => {
    const tok = createMfaPendingToken('42');
    assert.equal(verifyMfaPendingToken(tok), '42');
  });

  it('MfaService token inválido retorna null', () => {
    assert.equal(verifyMfaPendingToken('not-a-valid-token'), null);
  });

  it('pgrSnapshot formatVersionNumber', () => {
    assert.equal(formatVersionNumber(11), '2.1');
  });

  it('denunciaService nextProtocol mock', async () => {
    const runQuery = createMockRunQuery([rows([{ c: 3 }])]);
    const p = await nextProtocol(runQuery, 'itest-active');
    assert.match(p, /^DEN-\d{4}-00004$/);
  });

  it('mapDenunciaRow anonimiza', () => {
    const row = mapDenunciaRow({
      id: 1,
      tenant_id: 't',
      protocolo: 'DEN-1',
      tipo: 'VIOLENCIA',
      modalidade: 'ANONIMA',
      status: 'ABERTA',
      gravidade: 'alto',
      descricao: 'x',
      created_at: new Date(),
      updated_at: new Date(),
    });
    assert.equal(row.reporterName, null);
  });
});

describe('Services com banco real', () => {
  it('buildPgrSnapshot tenant itest-active', async (t) => {
    if (!guardIntegration(t)) return;
    const snap = await buildPgrSnapshot(FIXTURES.active.tenantId);
    assert.ok(snap.generatedAt);
    assert.equal(snap.empresa.tenantId, FIXTURES.active.tenantId);
  });

  it('ensureEmpresaUnidade cria cadeia mínima', async (t) => {
    if (!guardIntegration(t)) return;
    const runQuery = createMockRunQuery([
      rows([{ id: 1, tenant_id: FIXTURES.active.tenantId, razao_social: 'Co' }]),
      rows([{ id: 10, tenant_id: FIXTURES.active.tenantId, nome: 'Matriz', tipo: 'MATRIZ' }]),
      rows([]),
    ]);
    const result = await ensureEmpresaUnidade(runQuery, FIXTURES.active.tenantId);
    assert.ok(result.empresa);
    assert.ok(result.unidade);
  });

  it('ensureEsocialConfig tenant itest-active', async (t) => {
    if (!guardIntegration(t)) return;
    const cfg = await ensureEsocialConfig(FIXTURES.active.tenantId);
    assert.equal(cfg.tenant_id, FIXTURES.active.tenantId);
  });

  it('buildComplianceDashboard tenant itest-active', async (t) => {
    if (!guardIntegration(t)) return;
    const dash = await buildComplianceDashboard(FIXTURES.active.tenantId);
    assert.ok(dash);
  });
});
