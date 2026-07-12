/**
 * Testes unitários — CacheService e cache keys
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboard, tenantPattern, CACHE_TTL } from '../services/cache/cacheKeys.js';
import { CacheService } from '../services/cache/CacheService.js';

test('cacheKeys dashboard inclui tenant e módulo', () => {
  const key = dashboard('vale', 'gro', { year: 2026 });
  assert.match(key, /^ergosense:vale:dash:gro:/);
});

test('tenantPattern para invalidação', () => {
  assert.equal(tenantPattern('vale'), 'ergosense:vale:*');
});

test('CACHE_TTL defaults', () => {
  assert.ok(CACHE_TTL.dashboard >= 30);
  assert.ok(CACHE_TTL.report >= CACHE_TTL.dashboard);
});

test('CacheService memory fallback get/set', async () => {
  const svc = new CacheService();
  const key = 'test:unit:cache';
  await svc.set(key, { ok: true }, 60);
  const val = await svc.get(key);
  assert.deepEqual(val, { ok: true });
  await svc.del(key);
  assert.equal(await svc.get(key), null);
});

test('CacheService getOrSet executa loader uma vez', async () => {
  const svc = new CacheService();
  let calls = 0;
  const loader = async () => {
    calls += 1;
    return { n: calls };
  };
  const a = await svc.getOrSet('test:getorset', 60, loader);
  const b = await svc.getOrSet('test:getorset', 60, loader);
  assert.equal(calls, 1);
  assert.deepEqual(a, b);
});
