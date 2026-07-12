import fs from 'fs';

const fe = JSON.parse(fs.readFileSync('../coverage/coverage-summary.json', 'utf8')).total;
const be = JSON.parse(fs.readFileSync('./coverage/coverage-summary.json', 'utf8'));

let beTotal = 0;
let beCovered = 0;
for (const [key, val] of Object.entries(be)) {
  if (key === 'total') continue;
  if (key.includes('server\\src\\') || key.includes('server/src/')) {
    beTotal += val.lines.total;
    beCovered += val.lines.covered;
  }
}

const combined = ((fe.lines.covered + beCovered) / (fe.lines.total + beTotal)) * 100;

console.log(
  JSON.stringify(
    {
      feLinesPct: fe.lines.pct,
      beSrcLinesPct: Math.round((beCovered / beTotal) * 10000) / 100,
      beSrcCovered: beCovered,
      beSrcTotal: beTotal,
      combinedLinesPct: Math.round(combined * 100) / 100,
      p8Combined: 42.27,
      gainPp: Math.round((combined - 42.27) * 100) / 100,
    },
    null,
    2,
  ),
);
