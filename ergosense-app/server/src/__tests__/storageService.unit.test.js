/**
 * Testes do storage service
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStorageKey, isExternalStorage, getStorageStatus } from '../services/storageService.js';

test('buildStorageKey — path tenant/tipo/id', () => {
  const key = buildStorageKey('vale', 'videos', 42, 'mp4');
  assert.equal(key, 'vale/videos/42.mp4');
});

test('isExternalStorage — database retorna false', () => {
  assert.equal(isExternalStorage(), false);
});

test('getStorageStatus — expõe driver', () => {
  const s = getStorageStatus();
  assert.ok(s.driver);
  assert.equal(typeof s.external, 'boolean');
});
