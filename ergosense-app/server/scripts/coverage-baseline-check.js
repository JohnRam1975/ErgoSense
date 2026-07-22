/**
 * Falha CI se cobertura cair abaixo do baseline P7.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(__dirname, '../..');
const BASELINE = {
  feLines: 20.0,
  beLines: 34.0,
  combinedLines: 28.0,
};

function readSummary(rel) {
  const p = path.join(appRoot, rel);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const fe = readSummary('coverage/coverage-summary.json').total;
const be = readSummary('server/coverage/coverage-summary.json').total;

const fePct = fe.lines.pct;
const bePct = be.lines.pct;
const combined =
  ((fe.lines.covered + be.lines.covered) / (fe.lines.total + be.lines.total)) * 100;

const failures = [];
if (fePct < BASELINE.feLines) failures.push(`FE lines ${fePct}% < ${BASELINE.feLines}%`);
if (bePct < BASELINE.beLines) failures.push(`BE lines ${bePct}% < ${BASELINE.beLines}%`);
if (combined < BASELINE.combinedLines) {
  failures.push(`Combined lines ${combined.toFixed(2)}% < ${BASELINE.combinedLines}%`);
}

console.log(JSON.stringify({ fePct, bePct, combined: +combined.toFixed(2), baseline: BASELINE }, null, 2));

if (failures.length) {
  console.error('Coverage baseline FAILED:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('Coverage baseline OK');
