/**
 * Sanitização — branches adicionais (XSS, e-mail, objetos aninhados)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeHtml,
  sanitizePlainText,
  sanitizeEmail,
  sanitizeObjectStrings,
} from '../auth/sanitize.js';

test('escapeHtml — null/undefined retorna vazio', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
});

test('escapeHtml — escapa aspas e barra', () => {
  assert.equal(escapeHtml('"test"'), '&quot;test&quot;');
  assert.equal(escapeHtml("it's"), 'it&#39;s');
  assert.equal(escapeHtml('a/b'), 'a&#x2F;b');
});

test('sanitizePlainText — trim e maxLen', () => {
  assert.equal(sanitizePlainText('  hi  '), 'hi');
  assert.equal(sanitizePlainText('x'.repeat(10), 5), 'xxxxx');
});

test('sanitizeEmail — normaliza e rejeita inválido', () => {
  assert.equal(sanitizeEmail('  User@Mail.COM  '), 'user@mail.com');
  assert.equal(sanitizeEmail(null), '');
  assert.equal(sanitizeEmail(123), '');
});

test('sanitizeObjectStrings — objetos aninhados e arrays', () => {
  const input = {
    name: '  João  ',
    nested: { note: '<b>x</b>' },
    items: ['<script>'],
    count: 3,
  };
  const out = sanitizeObjectStrings(input);
  assert.equal(out.name, 'João');
  assert.equal(out.nested.note, '&lt;b&gt;x&lt;&#x2F;b&gt;');
  assert.equal(out.items[0], '&lt;script&gt;');
  assert.equal(out.count, 3);
});

test('sanitizeObjectStrings — retorna valor não-objeto', () => {
  assert.equal(sanitizeObjectStrings(null), null);
  assert.equal(sanitizeObjectStrings('plain'), 'plain');
});
