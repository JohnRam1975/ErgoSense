/**
 * Testes unitários — AI Engine specialists
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { listSpecialists, SPECIALISTS } from '../services/aiEngine/index.js';

test('lista 9 especialistas SST', () => {
  const list = listSpecialists();
  assert.equal(list.length, 9);
  assert.ok(list.some((s) => s.id === 'nr01'));
  assert.ok(list.some((s) => s.id === 'auditor'));
});

test('cada especialista possui prompt e templates', () => {
  for (const [id, spec] of Object.entries(SPECIALISTS)) {
    assert.ok(spec.systemPrompt?.length > 50, `${id} systemPrompt`);
    assert.ok(spec.name, `${id} name`);
    assert.ok(Array.isArray(spec.tools), `${id} tools`);
  }
});

test('buildPrompt inclui ação e contexto', () => {
  const spec = SPECIALISTS.gro;
  const prompt = spec.buildPrompt({ action: 'maturity', params: { stage: 3 }, context: { risks: 10 } });
  assert.match(prompt, /maturidade/);
  assert.match(prompt, /"risks":10/);
});
