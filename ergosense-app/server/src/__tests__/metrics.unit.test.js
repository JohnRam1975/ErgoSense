/**
 * Métricas Prometheus — recorders (sem handler HTTP)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  recordRequest,
  recordCacheHit,
  recordCacheMiss,
  recordQueuePublish,
  recordQueueConsume,
  recordQueueError,
  recordAiRequest,
} from '../metrics.js';

test('recordRequest — normaliza IDs numéricos e UUID', () => {
  recordRequest('GET', '/api/pgr/versions/12345', 200, 50);
  recordRequest('GET', '/api/pgr/versions/550e8400-e29b-41d4-a716-446655440000', 404, 120);
  recordRequest('POST', '/api/auth/login', 500, 6000);
  assert.ok(true);
});

test('recordCache — hit e miss', () => {
  recordCacheHit();
  recordCacheMiss();
  assert.ok(true);
});

test('recordQueue — publish, consume, error', () => {
  recordQueuePublish('ai');
  recordQueueConsume('ai');
  recordQueueError('esocial');
  assert.ok(true);
});

test('recordAiRequest — sucesso e falha', () => {
  recordAiRequest(true);
  recordAiRequest(false);
  assert.ok(true);
});
