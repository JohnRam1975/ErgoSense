/**
 * Executa matriz v2 por tag (evita queda da API em runs longos) e faz merge.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanAllRoutes } from './lib/routeScanner.js';
import { BASE, sleep } from './lib/auditHttp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../../../docs/audit/endpoints');
const partialDir = path.join(outDir, 'partials');

async function waitForApi(maxWaitMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const r = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
      if (r.ok) return true;
    } catch {
      /* retry */
    }
    await sleep(2000);
  }
  return false;
}

const forceBatch = process.argv.includes('--force');
const tagFilter = process.argv.find((a) => a.startsWith('--tag='))?.slice(6) ?? null;

async function main() {
  fs.mkdirSync(partialDir, { recursive: true });
  if (forceBatch) {
    for (const f of fs.readdirSync(partialDir)) {
      if (f.endsWith('.json')) {
        if (tagFilter) {
          const safe = tagFilter.replace(/[^\w-]+/g, '_');
          if (f !== `${safe}.json`) continue;
        }
        fs.unlinkSync(path.join(partialDir, f));
      }
    }
  }

  const tags = [...new Set(scanAllRoutes().map((r) => r.tag))].sort();
  console.log(`\n=== ENDPOINT MATRIX BATCH (${tags.length} tags) ===\n`);

  const ok = await waitForApi();
  if (!ok) {
    console.error('API indisponível');
    process.exit(2);
  }

  for (const tag of tags) {
    if (tagFilter && tag !== tagFilter) continue;
    const safeName = tag.replace(/[^\w-]+/g, '_');
    const partialFile = path.join(partialDir, `${safeName}.json`);
    if (!forceBatch && fs.existsSync(partialFile)) {
      console.log(`Skip ${tag} (partial OK)`);
      continue;
    }
    console.log(`\n--- Tag: ${tag} ---`);
    const r = spawnSync(
      process.execPath,
      ['scripts/endpoint-matrix.js', `--tag=${tag}`, `--partial=${tag}`],
      { cwd: path.join(__dirname, '..'), stdio: 'inherit', env: process.env },
    );
    if (r.status !== 0 && r.status !== null) {
      console.warn(`Tag ${tag} exit ${r.status} — continuando merge parcial`);
    }
    await sleep(2500);
    await waitForApi(20000);
  }

  const merge = spawnSync(process.execPath, ['scripts/endpoint-matrix.js', '--merge-only'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(merge.status ?? 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
