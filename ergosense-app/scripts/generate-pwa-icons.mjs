import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

const browser = await chromium.launch();
const page = await browser.newPage();

async function renderPng(size, filename, { maskable = false } = {}) {
  const pad = maskable ? Math.round(size * 0.18) : Math.round(size * 0.07);
  const inner = size - pad * 2;
  const radius = Math.round(inner * 0.28);
  const emoji = Math.round(inner * 0.52);
  const ring = Math.max(2, Math.round(size * 0.012));

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  html,body{margin:0;width:${size}px;height:${size}px;background:#090c11;overflow:hidden}
  .wrap{width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center}
  .mark{
    width:${inner}px;height:${inner}px;border-radius:${radius}px;
    background:linear-gradient(140deg,#FFA800,#d96500);
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 0 0 ${ring}px rgba(255,168,0,.12);
  }
  .arm{font-size:${emoji}px;line-height:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,.25))}
</style></head><body>
  <div class="wrap"><div class="mark"><span class="arm">🦾</span></div></div>
</body></html>`;

  await page.setViewportSize({ width: size, height: size });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(250);
  const out = path.join(dir, filename);
  await page.screenshot({ path: out, type: 'png' });
  console.log('wrote', filename, size);
  return out;
}

/** ICO multi-tamanho simples (Windows shortcut) a partir de PNGs 32/48/256. */
function pngToIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const entries = [];
  let offset = 6 + count * 16;
  const parts = [header];

  for (const png of pngBuffers) {
    // lê width/height do IHDR
    const w = png.readUInt32BE(16);
    const h = png.readUInt32BE(20);
    const entry = Buffer.alloc(16);
    entry[0] = w >= 256 ? 0 : w;
    entry[1] = h >= 256 ? 0 : h;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += png.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

const p512 = await renderPng(512, 'ergosense-512.png');
const p512m = await renderPng(512, 'ergosense-512-maskable.png', { maskable: true });
const p192 = await renderPng(192, 'ergosense-192.png');
const p180 = await renderPng(180, 'apple-touch-icon.png');
const p48 = await renderPng(48, 'ergosense-48.png');
const p32 = await renderPng(32, 'favicon-32.png');

const ico = pngToIco([
  fs.readFileSync(path.join(dir, 'favicon-32.png')),
  fs.readFileSync(path.join(dir, 'ergosense-48.png')),
  fs.readFileSync(p192),
]);
fs.writeFileSync(path.join(dir, 'favicon.ico'), ico);
console.log('wrote favicon.ico');

// SVG com braço (mesmo do app)
fs.writeFileSync(
  path.join(dir, 'icon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="ErgoSense">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFA800"/>
      <stop offset="100%" stop-color="#d96500"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="#090c11"/>
  <rect x="36" y="36" width="440" height="440" rx="124" fill="url(#bg)"/>
  <text x="256" y="286" text-anchor="middle" dominant-baseline="middle" font-size="240"
    font-family="Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif">🦾</text>
</svg>
`,
);

// remove nomes antigos que o Windows/Chrome cachearam (cruz)
for (const old of ['pwa-192.png', 'pwa-512.png', 'pwa-512-maskable.png']) {
  const p = path.join(dir, old);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log('removed', old);
  }
}

await browser.close();
console.log('done', { p512, p512m, p180, p32, p48 });
