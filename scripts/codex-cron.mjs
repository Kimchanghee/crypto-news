#!/usr/bin/env node
/** Codex CLI 콘텐츠 생성 v2 — 단순화 + timeout 600초 */
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
  return { id: idM?.[1] || 'UNKNOWN', name: nameM?.[1] || '', sources };
}

function sha1(s) { return crypto.createHash('sha1').update(s).digest('hex'); }
function canonicalUrl(u) {
  try { const x = new URL(u); x.hash=''; ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid'].forEach(k=>x.searchParams.delete(k)); return x.toString(); }
  catch { return u; }
}
function titleFp(t='') { return sha1(t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()); }

async function fetchRss(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 codex-cron' } });
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
      description: pick('description').replace(/<[^>]+>/g,'').slice(0,500),
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
  // also seed.json
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
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu,'')
    .trim()
    .replace(/\s+/g,'-')
    .slice(0, 60) + '-' + Math.floor(Math.random()*900000+100000);
}

async function runCodex(prompt, timeoutMs = 600_000) {
  const args = ['exec', '--json', '--sandbox', 'workspace-write', '--skip-git-repo-check', '--ignore-rules', prompt];
  return new Promise((resolve, reject) => {
    const child = spawn('codex', args, { cwd: ROOT });
    let out = '', err = '';
    child.stdout.on('data', d => out += d.toString());
    child.stderr.on('data', d => err += d.toString());
    const to = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('codex timeout '+timeoutMs+'ms')); }, timeoutMs);
    child.on('close', code => {
      clearTimeout(to);
      if (code !== 0) return reject(new Error(`codex exit ${code}: ${err.slice(0,400)}`));
      resolve(out);
    });
  });
}

function parseLastJson(stdout) {
  const lines = stdout.split('\n').filter(Boolean);
  // Try to find any JSON in the output (look for {...})
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const obj = JSON.parse(lines[i]);
      const t = obj?.message?.content || obj?.text || obj?.content;
      if (typeof t === 'string') {
        // Extract JSON from possibly markdown
        const m = t.match(/\{[\s\S]+\}/);
        if (m) {
          try { return JSON.parse(m[0]); } catch {}
        }
      }
    } catch {}
  }
  // Fallback: try to find raw JSON object in entire stdout
  const allJson = stdout.match(/\{\s*"title"[\s\S]+?"body"[\s\S]+?\}/);
  if (allJson) {
    try { return JSON.parse(allJson[0]); } catch {}
  }
  throw new Error('JSON parse fail. stdout head: ' + stdout.slice(0,400));
}

async function generateOne(channel, item) {
  const slug = makeSlug(item.title);
  const id = sha1(canonicalUrl(item.link)).slice(0, 12);

  // Simplified prompt: Korean only, no image, no 11-lang
  const prompt = `당신은 ${channel.name} 뉴스 에디터. 아래 원문을 SEO 친화적 한국어 600단어 분량으로 자연스럽게 재작성하세요.

원문:
- title: ${item.title}
- description: ${item.description}
- source: ${item.sourceName}

작업:
- 원문의 핵심 사실 유지
- 매끄러운 한국어 톤
- 첫 문단은 80자 내외 핵심 요약
- 본문 600단어
- 마지막에 다음 JSON만 출력 (코드블록 없이, 줄바꿈 없이 한 줄):
{"title":"...","excerpt":"...","body":"..."}`;

  console.log(`[codex] ${item.title.slice(0,60)}...`);
  const stdout = await runCodex(prompt, 600_000);
  const data = parseLastJson(stdout);

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
    i18n: { ko: { title: data.title, excerpt: data.excerpt, body: data.body } },
  };

  await fs.mkdir(ART_DIR, { recursive: true });
  await fs.writeFile(path.join(ART_DIR, `${id}.json`), JSON.stringify(article, null, 2));
  console.log(`  ✓ data/articles/${id}.json`);
  return article;
}

async function rebuildSeed() {
  const files = (await fs.readdir(ART_DIR)).filter(f => f.endsWith('.json')).sort();
  const all = [];
  for (const f of files) {
    try { all.push(JSON.parse(await fs.readFile(path.join(ART_DIR, f), 'utf8'))); } catch {}
  }
  // Merge with existing seed.json (preserve non-bot articles)
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
  console.log(`소스: ${channel.sources.length}개`);
  const seen = await loadDedupKeys();
  console.log(`기존 dedup 키: ${seen.size}개`);

  const candidates = [];
  for (const src of channel.sources) {
    try {
      const items = await fetchRss(src.url);
      for (const it of items) {
        const k1 = sha1(canonicalUrl(it.link));
        const k2 = titleFp(it.title);
        const k3 = sha1((it.sourceName||'') + '|' + (it.title||'').toLowerCase());
        if (seen.has(k1) || seen.has(k2) || seen.has(k3)) continue;
        candidates.push(it);
      }
    } catch (e) { console.warn(`RSS ${src.url}: ${e.message}`); }
  }
  console.log(`신규 후보: ${candidates.length}개`);

  const picked = candidates.slice(0, MAX_ARTICLES);
  let ok = 0;
  for (const it of picked) {
    try { await generateOne(channel, it); ok++; }
    catch (e) { console.error(`기사 실패: ${e.message}`); }
  }
  if (ok > 0) await rebuildSeed();
  console.log(`완료: ${ok}/${picked}`);
}

main().catch(e => { console.error(e); process.exit(1); });
