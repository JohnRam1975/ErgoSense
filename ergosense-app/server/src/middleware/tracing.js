/**
 * OpenTelemetry-lite — trace ID por request + spans estruturados.
 */
import crypto from 'crypto';
import { config } from '../config/env.js';

export function tracingMiddleware(req, res, next) {
  if (!config.observability.tracingEnabled) return next();

  const traceId = req.headers['x-trace-id']?.toString() || crypto.randomUUID();
  const spanId = crypto.randomBytes(8).toString('hex');
  req.traceId = traceId;
  req.spanId = spanId;
  res.set('X-Trace-Id', traceId);

  const start = Date.now();
  res.on('finish', () => {
    console.log(
      JSON.stringify({
        '@timestamp': new Date().toISOString(),
        trace_id: traceId,
        span_id: spanId,
        span_name: 'http_request',
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration_ms: Date.now() - start,
        service: config.observability.serviceName,
      }),
    );
  });
  next();
}

export function startSpan(name, traceId, parentSpanId) {
  const spanId = crypto.randomBytes(8).toString('hex');
  const start = Date.now();
  return {
    spanId,
    end: (attrs = {}) => {
      console.log(
        JSON.stringify({
          '@timestamp': new Date().toISOString(),
          trace_id: traceId,
          span_id: spanId,
          parent_span_id: parentSpanId ?? null,
          span_name: name,
          duration_ms: Date.now() - start,
          ...attrs,
        }),
      );
    },
  };
}
