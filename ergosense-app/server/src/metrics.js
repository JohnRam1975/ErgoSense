/**
 * Métricas Prometheus em /metrics (text/plain).
 */
import { config } from './config/env.js';
import { pool } from './db.js';

const counters = {
  httpRequestsTotal: new Map(),
  httpErrorsTotal: 0,
  cacheHits: 0,
  cacheMisses: 0,
  queuePublish: new Map(),
  queueConsume: new Map(),
  queueErrors: new Map(),
  aiRequests: 0,
  aiErrors: 0,
};

const latencyBuckets = [50, 100, 250, 500, 1000, 2500, 5000, 10000];
const latencyHistogram = new Map();

export function recordRequest(method, path, statusCode, durationMs = 0) {
  const key = `${method}|${normalizePath(path)}|${statusCode}`;
  counters.httpRequestsTotal.set(key, (counters.httpRequestsTotal.get(key) ?? 0) + 1);
  if (statusCode >= 500) counters.httpErrorsTotal += 1;

  const bucket = latencyBuckets.find((b) => durationMs <= b) ?? '+Inf';
  const histKey = `${method}|${normalizePath(path)}|${bucket}`;
  latencyHistogram.set(histKey, (latencyHistogram.get(histKey) ?? 0) + 1);
}

export function recordCacheHit() {
  counters.cacheHits += 1;
}

export function recordCacheMiss() {
  counters.cacheMisses += 1;
}

export function recordQueuePublish(queue) {
  counters.queuePublish.set(queue, (counters.queuePublish.get(queue) ?? 0) + 1);
}

export function recordQueueConsume(queue) {
  counters.queueConsume.set(queue, (counters.queueConsume.get(queue) ?? 0) + 1);
}

export function recordQueueError(queue) {
  counters.queueErrors.set(queue, (counters.queueErrors.get(queue) ?? 0) + 1);
}

export function recordAiRequest(success = true) {
  counters.aiRequests += 1;
  if (!success) counters.aiErrors += 1;
}

function normalizePath(path) {
  return String(path)
    .replace(/\/[0-9a-f-]{36}/gi, '/:id')
    .replace(/\/\d+/g, '/:id')
    .slice(0, 80);
}

export function metricsMiddleware(req, res, next) {
  if (!config.observability.metricsEnabled) return next();
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    recordRequest(req.method, req.path, res.statusCode, duration);
    if (duration > 3000) {
      console.warn(
        JSON.stringify({
          level: 'warn',
          msg: 'slow_request',
          method: req.method,
          path: req.path,
          durationMs: duration,
          status: res.statusCode,
        }),
      );
    }
  });
  next();
}

export async function metricsHandler(_req, res) {
  if (!config.observability.metricsEnabled) {
    return res.status(404).send('metrics disabled');
  }

  const lines = [
    '# HELP ergosense_http_requests_total HTTP requests',
    '# TYPE ergosense_http_requests_total counter',
  ];
  for (const [key, count] of counters.httpRequestsTotal) {
    const [method, path, status] = key.split('|');
    lines.push(
      `ergosense_http_requests_total{method="${method}",path="${path}",status="${status}"} ${count}`,
    );
  }

  lines.push('# HELP ergosense_http_errors_total 5xx responses');
  lines.push('# TYPE ergosense_http_errors_total counter');
  lines.push(`ergosense_http_errors_total ${counters.httpErrorsTotal}`);

  lines.push('# HELP ergosense_http_request_duration_ms_bucket Request latency buckets');
  lines.push('# TYPE ergosense_http_request_duration_ms_bucket counter');
  for (const [key, count] of latencyHistogram) {
    const [method, path, le] = key.split('|');
    lines.push(
      `ergosense_http_request_duration_ms_bucket{method="${method}",path="${path}",le="${le}"} ${count}`,
    );
  }

  lines.push('# HELP ergosense_cache_hits_total Cache hits');
  lines.push('# TYPE ergosense_cache_hits_total counter');
  lines.push(`ergosense_cache_hits_total ${counters.cacheHits}`);

  lines.push('# HELP ergosense_cache_misses_total Cache misses');
  lines.push('# TYPE ergosense_cache_misses_total counter');
  lines.push(`ergosense_cache_misses_total ${counters.cacheMisses}`);

  for (const [map, name] of [
    [counters.queuePublish, 'ergosense_queue_publish_total'],
    [counters.queueConsume, 'ergosense_queue_consume_total'],
    [counters.queueErrors, 'ergosense_queue_errors_total'],
  ]) {
    lines.push(`# HELP ${name} Queue ${name.split('_')[2]}`);
    lines.push(`# TYPE ${name} counter`);
    for (const [queue, count] of map) {
      lines.push(`${name}{queue="${queue}"} ${count}`);
    }
  }

  lines.push('# HELP ergosense_ai_requests_total AI requests');
  lines.push('# TYPE ergosense_ai_requests_total counter');
  lines.push(`ergosense_ai_requests_total ${counters.aiRequests}`);

  lines.push('# HELP ergosense_ai_errors_total AI errors');
  lines.push('# TYPE ergosense_ai_errors_total counter');
  lines.push(`ergosense_ai_errors_total ${counters.aiErrors}`);

  lines.push('# HELP ergosense_db_pool_total DB pool connections');
  lines.push('# TYPE ergosense_db_pool_total gauge');
  lines.push(`ergosense_db_pool_total ${pool.totalCount}`);
  lines.push(`ergosense_db_pool_idle ${pool.idleCount}`);
  lines.push(`ergosense_db_pool_waiting ${pool.waitingCount}`);

  lines.push('# HELP ergosense_process_uptime_seconds Process uptime');
  lines.push('# TYPE ergosense_process_uptime_seconds gauge');
  lines.push(`ergosense_process_uptime_seconds ${process.uptime().toFixed(0)}`);

  const mem = process.memoryUsage();
  lines.push('# HELP ergosense_process_memory_bytes Process memory');
  lines.push('# TYPE ergosense_process_memory_bytes gauge');
  lines.push(`ergosense_process_memory_bytes{type="rss"} ${mem.rss}`);
  lines.push(`ergosense_process_memory_bytes{type="heapUsed"} ${mem.heapUsed}`);

  res.set('Content-Type', 'text/plain; version=0.0.4');
  res.send(lines.join('\n') + '\n');
}
