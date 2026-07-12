/**
 * supportAuth — funções puras (sem DB)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLATFORM_TENANT,
  SUPPORT_DURATIONS,
  parseUserContext,
  getAuthenticatedUser,
  clientIp,
  isSupportActive,
  mapSupportStatus,
} from '../supportAuth.js';

test('PLATFORM_TENANT e SUPPORT_DURATIONS definidos', () => {
  assert.equal(PLATFORM_TENANT, 'ergosense');
  assert.equal(SUPPORT_DURATIONS['1h'], 1);
  assert.equal(SUPPORT_DURATIONS['7d'], 168);
});

test('parseUserContext — deprecated retorna null', () => {
  assert.equal(parseUserContext({ headers: {} }), null);
});

test('getAuthenticatedUser — req.user ou null', () => {
  assert.equal(getAuthenticatedUser({ user: { id: 1 } }).id, 1);
  assert.equal(getAuthenticatedUser({}), null);
});

test('clientIp — x-forwarded-for e fallback socket', () => {
  assert.equal(clientIp({ headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } }), '1.2.3.4');
  assert.equal(clientIp({ headers: {}, socket: { remoteAddress: '::1' } }), '::1');
  assert.equal(clientIp({ headers: {} }), 'unknown');
});

test('isSupportActive — autorizado e não expirado', () => {
  const future = new Date(Date.now() + 3600_000);
  assert.equal(isSupportActive({ suporte_autorizado: true, suporte_expira_em: future }), true);
  assert.equal(isSupportActive({ suporte_autorizado: false, suporte_expira_em: future }), false);
  assert.equal(isSupportActive({ suporte_autorizado: true, suporte_expira_em: null }), false);
  const past = new Date(Date.now() - 3600_000);
  assert.equal(isSupportActive({ suporte_autorizado: true, suporte_expira_em: past }), false);
});

test('mapSupportStatus — mapeia row para API', () => {
  const future = new Date(Date.now() + 86400_000);
  const row = {
    tenant_id: 'vale',
    nome: 'Vale SA',
    plano: 'Enterprise',
    ativo: true,
    suporte_inicio_em: new Date('2026-01-01'),
    suporte_expira_em: future,
    suporte_autorizado: true,
    suporte_autorizado_por: 'admin',
    suporte_motivo: 'Auditoria',
  };
  const mapped = mapSupportStatus(row, 42);
  assert.equal(mapped.tenantId, 'vale');
  assert.equal(mapped.userCount, 42);
  assert.equal(mapped.supportAuthorized, true);
  assert.ok(mapped.supportExpiresAt);
});
