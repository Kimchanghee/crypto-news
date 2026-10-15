// Local QA against `astro preview` (default http://localhost:4321).
// Usage: node scripts/qa.mjs [baseUrl] — writes evidence into qa/.
// Uses the shared Playwright package in ../_qa-tools; prefers PLAYWRIGHT_BROWSERS_PATH browsers,
// falls back to the system Edge/Chrome channel (no browser download).
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, '..', '_qa-tools', 'package.json'));
const { chromium } = require('playwright');
import { createServer } from 'node:http';
import { readFile as rf, stat as st } from 'node:fs/promises';
// Minimal static server over dist/ mimicking Cloudflare assets (auto-trailing-slash, 404-page).
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json' };
const distDir = path.join(root, 'dist');
const server = createServer(async (req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const tryFiles = u.endsWith('/') ? [u + 'index.html'] : [u, u + '/index.html'];
  for (const f of tryFiles) {
    try {
      const p = path.join(distDir, f);
      if ((await st(p)).isFile()) {
        if (f.endsWith('/index.html') && !u.endsWith('/')) { res.writeHead(307, { location: u + '/' }); return res.end(); }
        res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); return res.end(await rf(p));
      }
    } catch {}
  }
  res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' }); res.end(await rf(path.join(distDir, '404.html')));
});
await new Promise((r) => server.listen(0, r));
const base = process.argv[2] || `http://localhost:${server.address().port}`;
// Crawler-eye checks (no JS): status codes and head tags.
const crawl = [];
for (const p of ['/', '/tools/btc-fee-estimator/', '/guides/rbf-cpfp-stuck-transaction/', '/log/', '/sitemap-index.xml', '/sitemap-0.xml', '/robots.txt', '/llms.txt', '/ads.txt', '/rss.xml', '/this-page-does-not-exist/', ...(process.env.QA_EXTRA || '').split(',').filter(Boolean)]) {
  const r = await fetch(base + p, { redirect: 'manual' });
  const body = await r.text();
  const title = /<title>([^<]*)/.exec(body)?.[1];
  const canonical = /rel="canonical" href="([^"]+)/.exec(body)?.[1];
  const ld = [...body.matchAll(/application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => { try { return JSON.parse(m[1])['@type']; } catch { return 'PARSE-ERROR'; } });
  const h1 = (body.match(/<h1/g) || []).length;
  crawl.push({ path: p, status: r.status, bytes: body.length, title, canonical, h1, ld: ld.join(',') });
}
await mkdir(path.join(root, 'qa'), { recursive: true });
await writeFile(path.join(root, 'qa', 'crawler-check.json'), JSON.stringify(crawl, null, 2));
for (const c of crawl) console.log(`${c.status} ${c.path} h1=${c.h1} ld=[${c.ld}] title="${c.title ?? ''}"`);
const pages = (process.env.QA_PAGES || '/,/tools/btc-fee-estimator/,/guides/rbf-cpfp-stuck-transaction/').split(',');
const out = path.join(root, 'qa');
await mkdir(out, { recursive: true });

let browser;
for (const opts of [{}, { channel: 'msedge' }, { channel: 'chrome' }]) {
  try { browser = await chromium.launch(opts); console.log('browser', opts.channel || 'bundled'); break; } catch (e) { /* try next */ }
}
if (!browser) { console.error('No browser available'); process.exit(1); }
const report = [];
for (const width of [1440, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const p of pages) {
    await page.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    const res = await page.goto(base + p, { waitUntil: 'networkidle' }).catch((e) => ({ status: () => 'ERR ' + e.message }));
    await page.waitForTimeout(600);
    const m = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      cls: window.__cls,
      h1: document.querySelector('h1')?.textContent?.trim(),
    }));
    // keyboard: tab to first 3 focusables, record whether focus outline is visible
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => { const el = document.activeElement; if (!el) return null; const cs = getComputedStyle(el); return { tag: el.tagName, text: (el.textContent || '').trim().slice(0, 30), outline: cs.outlineStyle + ' ' + cs.outlineWidth }; });
    const name = `${p === '/' ? 'home' : p.replace(/^\/|\/$/g, '').replace(/\//g, '_')}-${width}.png`;
    await page.screenshot({ path: path.join(out, name), fullPage: true });
    report.push({ page: p, width, status: res?.status?.(), ...m, focus, screenshot: 'qa/' + name });
  }
  await ctx.close();
}
await browser.close();
server.close();
await writeFile(path.join(out, 'browser-qa.json'), JSON.stringify(report, null, 2));
for (const r of report) console.log(`${r.width} ${r.page} status=${r.status} overflow=${r.overflow}px cls=${r.cls.toFixed(4)} focus=${r.focus?.tag}:${r.focus?.outline}`);
