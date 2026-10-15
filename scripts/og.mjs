// Build-time Open Graph images (1200x630 PNG) rendered from SVG with resvg.
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'og');
await mkdir(outDir, { recursive: true });
await writeFile(path.join(root, 'public', 'ads.txt'), 'google.com, pub-4490818204529253, DIRECT, f08c47fec0942fa0\n');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function wrap(text, max) {
  const words = text.split(/\s+/); const lines = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > max) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; }
  if (cur.trim()) lines.push(cur.trim());
  return lines.slice(0, 4);
}
function svg(kicker, title) {
  const lines = wrap(title, 30);
  const rules = Array.from({ length: 12 }, (_, i) => `<line x1="0" x2="1200" y1="${90 + i * 48}" y2="${90 + i * 48}" stroke="#c3cfd9" stroke-width="1.5"/>`).join('');
  const t = lines.map((l, i) => `<text x="210" y="${235 + i * 74}" font-family="Georgia, 'Times New Roman', serif" font-size="62" font-weight="700" fill="#1c2530">${esc(l)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f4efe3"/>${rules}
  <rect x="180" y="0" width="3" height="630" fill="#a8322a"/>
  <rect x="0" y="0" width="1200" height="70" fill="#f4efe3"/><line x1="0" x2="1200" y1="70" y2="70" stroke="#1c2530" stroke-width="4"/><line x1="0" x2="1200" y1="78" y2="78" stroke="#1c2530" stroke-width="1.5"/>
  <text x="40" y="48" font-family="Consolas, 'Courier New', monospace" font-size="26" letter-spacing="3" fill="#1c2530">DAILY CRYPTO NEWS · NETWORK LOG</text>
  <text x="40" y="170" font-family="Consolas, 'Courier New', monospace" font-size="24" fill="#a8322a">${esc(kicker.toUpperCase())}</text>
  ${t}
  <text x="210" y="590" font-family="Consolas, 'Courier New', monospace" font-size="24" fill="#46505c">dailycryptonews.online</text>
</svg>`;
}
const pages = [
  ['default', 'Log', 'Bitcoin & Ethereum network log'],
  ['home', 'Today', 'What does it cost to send Bitcoin today?'],
  ['guides', 'Guides', 'Plain-English guides to network data'],
  ['log', 'Archive', 'Daily network log entries, recorded not reconstructed'],
  ['fee-estimator', 'Tool', 'Bitcoin fee estimator: size and cost in USD'],
  ['countdown', 'Tool', 'Halving and difficulty countdowns'],
];
const gdir = path.join(root, 'src', 'content', 'guides');
for (const f of await readdir(gdir)) {
  if (!f.endsWith('.md')) continue;
  const src = await readFile(path.join(gdir, f), 'utf8');
  const h1 = /\nh1:\s*"([^"]+)"/.exec(src)?.[1];
  const kicker = /\nkicker:\s*"([^"]+)"/.exec(src)?.[1] ?? 'Guide';
  if (h1) pages.push([`guide-${f.replace(/\.md$/, '')}`, kicker, h1]);
}
for (const [slug, kicker, title] of pages) {
  const png = new Resvg(svg(kicker, title), { fitTo: { mode: 'width', value: 1200 }, font: { loadSystemFonts: true } }).render().asPng();
  await writeFile(path.join(outDir, `${slug}.png`), png);
}
console.log(`og: wrote ${pages.length} images`);
