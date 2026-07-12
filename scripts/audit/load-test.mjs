#!/usr/bin/env node
/** Load test simplificado — mede latência sob concorrência */
const BASE = process.env.AUDIT_API_URL || 'http://localhost:13001';
const CONCURRENCY = [50, 100, 200];

const H = {
  'X-ErgoSense-Email': 'lucas@vale.com.br',
  'X-ErgoSense-Role': 'ERGONOMISTA',
  'X-ErgoSense-Tenant': 'vale',
};

async function bench(n, path) {
  const times = [];
  const errors = [];
  const start = performance.now();
  const tasks = Array.from({ length: n }, async () => {
    const t0 = performance.now();
    try {
      const r = await fetch(`${BASE}${path}`, { headers: H });
      times.push(performance.now() - t0);
      if (!r.ok) errors.push(r.status);
    } catch (e) {
      errors.push(e.message);
      times.push(performance.now() - t0);
    }
  });
  await Promise.all(tasks);
  times.sort((a, b) => a - b);
  const p50 = times[Math.floor(times.length * 0.5)] ?? 0;
  const p95 = times[Math.floor(times.length * 0.95)] ?? 0;
  const p99 = times[Math.floor(times.length * 0.99)] ?? 0;
  return {
    n,
    path,
    totalMs: Math.round(performance.now() - start),
    p50: Math.round(p50),
    p95: Math.round(p95),
    p99: Math.round(p99),
    max: Math.round(times[times.length - 1] ?? 0),
    errors: errors.length,
  };
}

console.log(`Load test — ${BASE}\n`);
for (const n of CONCURRENCY) {
  const r = await bench(n, '/api/collaborators?tenantId=vale');
  console.log(JSON.stringify(r));
}
