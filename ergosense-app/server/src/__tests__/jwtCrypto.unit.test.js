/**
 * JWT — funções puras (sem DB)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import {
  hashToken,
  generateCsrfToken,
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  mapUserResponse,
} from '../auth/jwt.js';

const mockUser = {
  id: 42,
  email: 'auditor@ergosense.test',
  name: 'Auditor',
  role: 'ERGONOMISTA',
  company: 'Vale',
  location: 'SP',
  tenantId: 'vale',
};

test('hashToken — determinístico', () => {
  assert.equal(hashToken('abc'), hashToken('abc'));
  assert.notEqual(hashToken('abc'), hashToken('xyz'));
});

test('generateCsrfToken — 64 hex chars', () => {
  const t = generateCsrfToken();
  assert.match(t, /^[a-f0-9]{64}$/);
});

test('signAccessToken + verifyAccessToken', () => {
  const token = signAccessToken(mockUser);
  const payload = verifyAccessToken(token);
  assert.equal(payload.sub, '42');
  assert.equal(payload.email, mockUser.email);
  assert.equal(payload.type, 'access');
});

test('signRefreshToken + verifyRefreshToken', () => {
  const token = signRefreshToken(mockUser);
  const payload = verifyRefreshToken(token);
  assert.equal(payload.sub, '42');
  assert.equal(payload.type, 'refresh');
});

test('verifyAccessToken — token inválido lança', () => {
  assert.throws(() => verifyAccessToken('invalid.token.here'));
});

test('mapUserResponse — não expõe id interno', () => {
  const mapped = mapUserResponse(mockUser);
  assert.equal(mapped.email, mockUser.email);
  assert.equal(mapped.tenantId, 'vale');
  assert.equal(mapped.id, undefined);
});

test('verifyAccessToken — rejeita type refresh', () => {
  const wrongType = jwt.sign(
    { sub: '42', type: 'refresh' },
    config.jwt.accessSecret,
    { expiresIn: 60, issuer: 'ergosense-api', audience: 'ergosense-app' },
  );
  assert.throws(() => verifyAccessToken(wrongType), /invalid_token_type/);
});

test('verifyRefreshToken — rejeita type access', () => {
  const wrongType = jwt.sign(
    { sub: '42', type: 'access' },
    config.jwt.refreshSecret,
    { expiresIn: 60, issuer: 'ergosense-api', audience: 'ergosense-app' },
  );
  assert.throws(() => verifyRefreshToken(wrongType), /invalid_token_type/);
});

test('verifyRefreshToken — token inválido lança', () => {
  assert.throws(() => verifyRefreshToken('not.a.jwt'));
});
