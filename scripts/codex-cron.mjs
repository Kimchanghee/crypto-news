#!/usr/bin/env node
/** Codex v3 — 매우 짧은 프롬프트, 빠른 응답 */
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const ART_DIR = path.join(ROOT, 'data', 'articles');
const SEED_PATH = path.join(ROOT, 'data', 'seed.json');
const MAX_ARTICLES = Number(process.env.MAX_ARTICLES || '3');

async function loadChannel() {
  const txt = await fs.readFile(path.join(ROOT, 'channel.config.ts'), 'utf8');
  const idM = txt.match(/id:\s*'([^']+)'/);
  const nameM = txt.match(/name:\s*'([^']+)'/);
  const srcRe = /\{\s*url:\s*'([^']+)',\s*category:\s*'([^']+)'/g;
  const sources = [];
  let m;
  while ((m = srcRe.exec(txt))) sources.push({ url: m[1], category: m[2] });
  return { id: idM?.[1] || 'X', name: nameM?.[1] || '', sources };
}
function sha1(s) { return crypto.createHash('sha1').update(s).digest('hex'); }
function canonicalUrl(u) { try { const x=new URL(u);x.hash='';['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid'].forEach(k=>x.searchParams.delete(k));return x.toString();} catch{return u;} }
function titleFp(t='') { return sha1(t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()); }

async function fetchRss(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 codex' } });
  if (!r.ok) throw new Error(`RSS ${url} ${r.status}`);
  const xml = await r.text();
  const items = [];
  const re = /<item[^>]*>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const pick = (tag) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(block);
      if (!r) return '';
      return r[1].trim().replace(/<!\[CDATA\[/, '').replace(/\]\]>/, '').trim();
    };
    items.push({
      title: pick('title'),
      link: pick('link'),
      description: pick('description').replace(/<[^>]+>/g,'').slice(0,300),
      sourceName: pick('source') || new URL(url).hostname.replace(/^www\./,''),
    });
  }
  return items;
}

async function loadDedupKeys() {
  await fs.mkdir(ART_DIR, { recursive: true });
  const files = await fs.readdir(ART_DIR);
  const keys = new Set();
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const j = JSON.parse(await fs.readFile(path.join(ART_DIR, f), 'utf8'));
      (j.dedupKeys||[]).forEach(k => keys.add(k));
    } catch {}
  }
  try {
    const seed = JSON.parse(await fs.readFile(SEED_PATH, 'utf8'));
    for (const a of seed) {
      if (a.canonicalUrl) keys.add(sha1(a.canonicalUrl));
      if (a.titleFingerprint) keys.add(a.titleFingerprint);
    }
  } catch {}
  return keys;
}

function makeSlug(title) {
  return title.toLowerCase().replace(/[^\p{L}\p{N}\s-]+/gu,'').trim().replace(/\s+/g,'-').slice(0, 60) + '-' + Math.floor(Math.random()*900000+100000);
}

async function runCodex(prompt, timeoutMs = 240_000) {
  // read-only sandbox = much faster (no permission checks/file ops)
  const args = ['exec', '--json', '--sandbox', 'read-only', '--skip-git-repo-check', '--model', 'gpt-5.5', '--ignore-rules', prompt];
  return new Promise((resolve, reject) => {
    const child = spawn('codex', args, { cwd: ROOT });
    let out = '', err = '';
    child.stdout.on('data', d => { out += d.toString(); });
    child.stderr.on('data', d => { err += d.toString(); });
    const to = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('codex timeout '+timeoutMs+'ms. stdout head: '+out.slice(0,400))); }, timeoutMs);
    child.on('close', code => {
      clearTimeout(to);
      if (code !== 0) return reject(new Error(`codex exit ${code}. err: ${err.slice(0,300)}. out: ${out.slice(0,300)}`));
      resolve(out);
    });
  });
}

function parseJson(stdout) {
  // Search ALL stdout for JSON object
  const allMatches = [...stdout.matchAll(/\{[^{}]*"title"[\s\S]*?"excerpt"[\s\S]*?\}/g)];
  for (const m of allMatches.reverse()) {
    try { return JSON.parse(m[0]); } catch {}
  }
  // Try parsing any JSON Lines
  const lines = stdout.split('\n').filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const obj = JSON.parse(lines[i]);
      const t = obj?.message?.content || obj?.text || obj?.content;
      if (typeof t === 'string') {
        const m = t.match(/\{[\s\S]+\}/);
        if (m) {
          try { return JSON.parse(m[0]); } catch {}
        }
      }
    } catch {}
  }
  throw new Error('JSON parse fail. stdout tail: ' + stdout.slice(-600));
}

async function generateOne(channel, item) {
  const slug = makeSlug(item.title);
  const id = sha1(canonicalUrl(item.link)).slice(0, 12);

  // Ultra-minimal prompt: just title + 200char excerpt
  const prompt = `Translate and rewrite this news headline+description into natural Korean. Output ONLY a single JSON object on the last line, nothing else.

Source title: ${item.title}
Source description: ${item.description}

Output schema (JSON, single line, no markdown):
{"title":"<korean title 50-80 chars>","excerpt":"<korean summary 150-200 chars>"}`;

  console.log(`[codex] ${item.title.slice(0,50)}...`);
  const t0 = Date.now();
  const stdout = await runCodex(prompt, 240_000);
  console.log(`  codex ${(Date.now()-t0)/1000}s`);
  const data = parseJson(stdout);

  const article = {
    id, slug,
    channelId: channel.id,
    category: 'breaking',
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sourceName: item.sourceName,
    sourceUrl: item.link,
    canonicalUrl: canonicalUrl(item.link),
    titleFingerprint: titleFp(item.title),
    dedupKeys: [
      sha1(canonicalUrl(item.link)),
      titleFp(item.title),
      sha1(item.sourceName + '|' + item.title.toLowerCase()),
    ],
    imageUrl: '',
    i18n: { ko: { title: data.title, excerpt: data.excerpt, body: item.description } },
  };

  await fs.mkdir(ART_DIR, { recursive: true });
  await fs.writeFile(path.join(ART_DIR, `${id}.json`), JSON.stringify(article, null, 2));
  console.log(`  ✓ ${id}.json`);
  return article;
}

async function rebuildSeed() {
  const files = (await fs.readdir(ART_DIR)).filter(f => f.endsWith('.json')).sort();
  const all = [];
  for (const f of files) {
    try { all.push(JSON.parse(await fs.readFile(path.join(ART_DIR, f), 'utf8'))); } catch {}
  }
  let existing = [];
  try { existing = JSON.parse(await fs.readFile(SEED_PATH, 'utf8')); } catch {}
  const seenIds = new Set(all.map(a => a.id));
  const merged = [...all, ...existing.filter(a => !seenIds.has(a.id))];
  merged.sort((a,b) => (b.publishedAt||'').localeCompare(a.publishedAt||''));
  await fs.writeFile(SEED_PATH, JSON.stringify(merged.slice(0, 60), null, 2));
  console.log(`seed.json: ${merged.length}`);
}

async function main() {
  const channel = await loadChannel();
  console.log(`채널: ${channel.name} (${channel.id})`);
  const seen = await loadDedupKeys();
  console.log(`dedup keys: ${seen.size}`);
  const candidates = [];
  for (const src of channel.sources) {
    try {
      const items = await fetchRss(src.url);
      for (const it of items) {
        const k1 = sha1(canonicalUrl(it.link));
        const k2 = titleFp(it.title);
        if (seen.has(k1) || seen.has(k2)) continue;
        candidates.push(it);
      }
    } catch(e) { console.warn(`RSS ${src.url}: ${e.message}`); }
  }
  console.log(`new candidates: ${candidates.length}`);
  const picked = candidates.slice(0, MAX_ARTICLES);
  let ok = 0;
  for (const it of picked) {
    try { await generateOne(channel, it); ok++; }
    catch(e) { console.error(`기사 실패: ${e.message.slice(0,400)}`); }
  }
  if (ok > 0) await rebuildSeed();
  console.log(`완료: ${ok}/${picked.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
