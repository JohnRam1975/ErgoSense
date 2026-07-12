/**
 * Testes unitários — filas enterprise
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { QUEUES, publishJob, registerQueueHandler } from '../services/queue/QueueService.js';

test('QUEUES define filas IA, eSocial e Compliance', () => {
  assert.equal(Object.keys(QUEUES).length, 3);
  assert.ok(QUEUES.AI.GERAR_AET);
  assert.ok(QUEUES.ESOCIAL.ENVIO_XML);
  assert.ok(QUEUES.COMPLIANCE.SCHEDULER);
});

test('publishJob local fallback retorna queued', async () => {
  registerQueueHandler(QUEUES.AI.GERAR_AET, async () => {});
  const result = await publishJob(QUEUES.AI.GERAR_AET, { tenantId: 'vale', test: true });
  assert.equal(result.queued, true);
  assert.ok(['local', 'rabbitmq'].includes(result.backend));
});
