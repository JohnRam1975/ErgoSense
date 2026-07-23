/**
 * Filas enterprise — RabbitMQ com fallback in-process.
 */
import { config } from '../../config/env.js';
import { recordQueuePublish, recordQueueConsume, recordQueueError } from '../../metrics.js';
import { emitSiemEvent } from '../enterpriseAudit.js';

export const QUEUES = {
  AI: {
    GERAR_AET: 'ai.gerarAET',
    GERAR_PGR: 'ai.gerarPGR',
    GERAR_GRO: 'ai.gerarGRO',
    GERAR_RELATORIO: 'ai.gerarRelatorio',
    GERAR_PLANO_ACAO: 'ai.gerarPlanoAcao',
  },
  ESOCIAL: {
    ENVIO_XML: 'esocial.envioXML',
    CONSULTA_LOTE: 'esocial.consultaLote',
    RETORNO_EVENTOS: 'esocial.retornoEventos',
  },
  COMPLIANCE: {
    SCHEDULER: 'compliance.scheduler',
    AUDITORIA: 'compliance.auditoria',
    NOTIFICACOES: 'compliance.notificacoes',
  },
};

const DLQ_SUFFIX = '.dlq';
const MAX_RETRIES = 3;
const handlers = new Map();
let localPollTimer = null;
let channel = null;
let connection = null;
const localQueue = [];

function allQueueNames() {
  return Object.values(QUEUES).flatMap((group) => Object.values(group));
}

async function connectRabbit() {
  if (!config.rabbitmq.enabled || !config.rabbitmq.url) return null;
  if (channel) return channel;

  try {
    const amqp = await import('amqplib');
    connection = await amqp.connect(config.rabbitmq.url);
    channel = await connection.createChannel();
    await channel.prefetch(config.rabbitmq.prefetch);

    for (const name of allQueueNames()) {
      await channel.assertQueue(name, { durable: true });
      await channel.assertQueue(`${name}${DLQ_SUFFIX}`, { durable: true });
    }

    connection.on('error', (err) => {
      console.error(JSON.stringify({ level: 'error', msg: 'rabbitmq_error', error: err.message }));
    });

    console.log(JSON.stringify({ level: 'info', msg: 'rabbitmq_connected' }));
    return channel;
  } catch (err) {
    console.warn(JSON.stringify({ level: 'warn', msg: 'rabbitmq_unavailable', error: err.message }));
    return null;
  }
}

async function publishLocal(queueName, payload, attempt = 0) {
  const handler = handlers.get(queueName);
  if (!handler) {
    recordQueueError(queueName);
    return;
  }
  try {
    recordQueueConsume(queueName);
    await handler(payload, { attempt, queue: queueName });
  } catch (err) {
    recordQueueError(queueName);
    if (attempt < MAX_RETRIES) {
      setTimeout(() => publishLocal(queueName, payload, attempt + 1), 1000 * (attempt + 1));
    } else {
      emitSiemEvent('queue_dlq', { queue: queueName, error: err.message, payload });
    }
  }
}

export async function initQueueWorkers() {
  const ch = await connectRabbit();
  if (!ch) {
    if (!localPollTimer) {
      localPollTimer = setInterval(() => {
        while (localQueue.length) {
          const job = localQueue.shift();
          void publishLocal(job.queue, job.payload);
        }
      }, 500);
    }
    return;
  }

  for (const name of allQueueNames()) {
    await ch.consume(name, (msg) => {
      if (!msg) return;
      const handler = handlers.get(name);
      if (!handler) {
        ch.nack(msg, false, false);
        return;
      }

      let payload;
      try {
        payload = JSON.parse(msg.content.toString());
      } catch {
        ch.nack(msg, false, false);
        return;
      }

      const headers = msg.properties.headers ?? {};
      const attempt = Number(headers['x-retry'] ?? 0);

      handler(payload, { attempt, queue: name })
        .then(() => {
          recordQueueConsume(name);
          ch.ack(msg);
        })
        .catch(async (err) => {
          recordQueueError(name);
          if (attempt < MAX_RETRIES) {
            ch.sendToQueue(name, msg.content, {
              persistent: true,
              headers: { ...headers, 'x-retry': attempt + 1 },
            });
            ch.ack(msg);
          } else {
            ch.sendToQueue(`${name}${DLQ_SUFFIX}`, msg.content, { persistent: true });
            ch.ack(msg);
            emitSiemEvent('queue_dlq', { queue: name, error: err.message });
          }
        });
    });
  }
}

export function registerQueueHandler(queueName, handler) {
  handlers.set(queueName, handler);
}

export async function publishJob(queueName, payload) {
  recordQueuePublish(queueName);
  const ch = await connectRabbit();
  if (ch) {
    ch.sendToQueue(queueName, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
      contentType: 'application/json',
    });
    return { queued: true, backend: 'rabbitmq', queue: queueName };
  }

  localQueue.push({ queue: queueName, payload });
  return { queued: true, backend: 'local', queue: queueName };
}

export async function closeQueue() {
  if (localPollTimer) {
    clearInterval(localPollTimer);
    localPollTimer = null;
  }
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
  } catch {
    /* ignore */
  }
  channel = null;
  connection = null;
}

export function registerDefaultWorkers() {
  for (const name of allQueueNames()) {
    registerQueueHandler(name, async (payload, meta) => {
      emitSiemEvent('queue_processed', { queue: meta.queue, tenantId: payload?.tenantId });
    });
  }
}
