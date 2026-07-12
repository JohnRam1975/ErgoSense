import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNumericId, requireNumericId } from '../utils/parseId.js';

function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  return res;
}

test('parseNumericId — aceita inteiro positivo', () => {
  assert.equal(parseNumericId('42'), 42);
});

test('parseNumericId — rejeita NaN e não numérico', () => {
  assert.equal(parseNumericId('zzz-not-found'), null);
  assert.equal(parseNumericId('NaN'), null);
});

test('parseNumericId — rejeita zero e negativo', () => {
  assert.equal(parseNumericId('0'), null);
  assert.equal(parseNumericId('-1'), null);
});

test('requireNumericId — retorna id válido', () => {
  const req = { params: { id: '42' } };
  const res = mockRes();
  assert.equal(requireNumericId(req, res), 42);
});

test('requireNumericId — 400 para ID inválido', () => {
  const req = { params: { id: 'abc' } };
  const res = mockRes();
  assert.equal(requireNumericId(req, res), null);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
});

test('requireNumericId — paramName customizado', () => {
  const req = { params: { tid: '7' } };
  const res = mockRes();
  assert.equal(requireNumericId(req, res, 'tid'), 7);
});
