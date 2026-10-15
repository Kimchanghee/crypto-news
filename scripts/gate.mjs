// Publish gate: runs over the built dist/ and fails (exit 1) if any page breaks the rules.
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const SITE = 'https://dailycryptonews.online';
const LANG = 'en';

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'").replace(/&nbsp;/g, ' ');
const textOf = (html) => decode(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const norm = (s) => decode(String(s)).replace(/\s+/g, ' ').trim();
// Display width: Hangul/CJK count as 2 (Latin-equivalent width), others 1.
const width = (s) => [...s].reduce((n, ch) => n + (/[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3\u3000-\u9fff]/.test(ch) ? 2 : 1), 0);

const sitemap = await readFile(path.join(dist, 'sitemap-0.xml'), 'utf8');
const inSitemap = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
const files = await walk(dist);
const failures = [];
let checked = 0;

for (const file of files) {
  const rel = '/' + path.relative(dist, file).replace(/\\/g, '/');
  const is404 = rel === '/404.html';
  const urlPath = is404 ? '/404/' : rel.replace(/index\.html$/, '');
  const html = await readFile(file, 'utf8');
  const errs = [];
  const title = norm(/<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '');
  const desc = norm(/<meta name="description" content="([^"]*)"/i.exec(html)?.[1] ?? '');
  const tw = width(title), dw = width(desc);
  if (tw < 50 || tw > 60) errs.push(`title width ${tw} (50-60): "${title}"`);
  if (dw < 150 || dw > 160) errs.push(`description width ${dw} (150-160)`);
  const canonical = /<link rel="canonical" href="([^"]+)"/i.exec(html)?.[1];
  if (canonical !== SITE + urlPath) errs.push(`canonical ${canonical} != ${SITE + urlPath}`);
  if (/noindex/i.test(html)) errs.push('contains noindex');
  if (!/<html lang="/.test(html)) errs.push('missing lang');
  const og = /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1];
  if (!og) errs.push('missing og:image');
  else { try { await stat(path.join(dist, og.replace(SITE, ''))); } catch { errs.push('og image file missing ' + og); } }

  const main = /<main[\s\S]*?<\/main>/i.exec(html)?.[0] ?? '';
  const visible = textOf(main) + ' ' + [...html.matchAll(/<nav[\s\S]*?<\/nav>/gi)].map((m) => textOf(m[0])).join(' ');
  const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  if (ldBlocks.length < 2) errs.push('expected Organization + WebSite JSON-LD');
  for (const raw of ldBlocks) {
    let obj;
    try { obj = JSON.parse(raw); } catch (e) { errs.push('JSON-LD parse error'); continue; }
    const t = obj['@type'];
    const mustShow = [];
    if (t === 'Article' || t === 'TechArticle') { mustShow.push(obj.headline); if (!obj.dateModified) errs.push('Article without dateModified'); }
    if (t === 'Dataset' || t === 'WebApplication') mustShow.push(obj.name ? null : 'MISSING-NAME');
    if (t === 'FAQPage') for (const q of obj.mainEntity) { mustShow.push(q.name); mustShow.push(q.acceptedAnswer.text); }
    if (t === 'BreadcrumbList') for (const it of obj.itemListElement) if (!visible.includes(norm(it.name))) errs.push(`breadcrumb "${it.name}" not visible`);
    if (['Review', 'AggregateRating', 'Offer'].includes(t)) errs.push('forbidden LD type ' + t);
    for (const s of mustShow.filter(Boolean)) if (!visible.includes(norm(s))) errs.push(`LD text not visible: "${String(s).slice(0, 60)}"`);
  }
  if (!is404) {
    const answer = /<p class="answer"[^>]*id="answer"[^>]*>([\s\S]*?)<\/p>/i.exec(main)?.[1];
    if (!answer) errs.push('no direct answer paragraph (#answer)');
    else {
      const a = textOf(answer);
      const n = LANG === 'ko' ? [...a].length : a.split(/\s+/).length;
      const [lo, hi] = LANG === 'ko' ? [40, 260] : [15, 90];
      if (n < lo || n > hi) errs.push(`answer length ${n} outside ${lo}-${hi}`);
    }
    const internal = new Set([...main.matchAll(/href="(\/[^"#]*)/g)].map((m) => m[1]).filter((h) => h !== urlPath));
    if (internal.size < 2) errs.push(`only ${internal.size} internal links in main`);
    if (!inSitemap.has(SITE + urlPath)) errs.push('not in sitemap');
    if (urlPath.startsWith('/guides/') && urlPath !== '/guides/') {
      const src = /<section class="sources"[\s\S]*?<\/section>/i.exec(main)?.[0] ?? '';
      if (!/href="https?:\/\//.test(src)) errs.push('guide without external sources');
    }
  }
  const txt = textOf(html);
  for (const bad of [/lorem ipsum/i, /\bTODO\b/, /\bTBD\b/, /\bplaceholder\b/i, /\bundefined\b/, /\bNaN\b/, /\[object Object\]/]) if (bad.test(txt)) errs.push('placeholder text ' + bad);
  checked++;
  if (errs.length) failures.push([urlPath, errs]);
}
for (const req of ['robots.txt', 'sitemap-index.xml', 'llms.txt', 'ads.txt', 'rss.xml']) {
  try { await stat(path.join(dist, req)); } catch { failures.push(['/' + req, ['missing']]); }
}
const robots = await readFile(path.join(dist, 'robots.txt'), 'utf8').catch(() => '');
if (/Disallow:\s*\/\s*$/m.test(robots)) failures.push(['/robots.txt', ['disallows everything']]);
for (const loc of inSitemap) {
  const p = loc.replace(SITE, '');
  try { await stat(path.join(dist, p, 'index.html')); } catch { failures.push([p, ['in sitemap but not built']]); }
}
if (failures.length) {
  for (const [p, e] of failures) console.error(`FAIL ${p}\n  - ${e.join('\n  - ')}`);
  console.error(`\ngate: ${failures.length} failing of ${checked} pages`);
  process.exit(1);
}
console.log(`gate: PASS (${checked} pages, ${inSitemap.size} sitemap URLs)`);
