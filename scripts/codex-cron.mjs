#!/usr/bin/env node
/** Codex v9 — stdin closed + correct NDJSON parser */
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const ART_DIR = path.join(ROOT, 'data', 'articles');
const SEED_PATH = path.join(ROOT, 'data', 'seed.json');
const MAX_ARTICLES = Number(process.env.MAX_ARTICLES || '2');

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
  try { const x = new URL(u); x.hash=''; ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid'].forEach(k=>x.searchParams.delete(k)); return x.toString(); } catch { return u; }
}
function titleFp(t='') { return sha1(t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()); }

async function fetchRss(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (codex-cron)' } });
  if (!r.ok) throw new Error(`RSS ${url} ${r.status}`);
  const xml = await r.text();
  const items = [];
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const pick = (tag) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(block);
      if (!r) return '';
      let v = r[1].trim();
      v = v.replace(/<!\[CDATA\[/, '').replace(/\]\]>/, '').trim();
      return v;
    };
    items.push({
      title: pick('title'),
      link: pick('link'),
      description: pick('description').replace(/<[^>]+>/g,'').slice(0, 600),
      pubDate: pick('pubDate'),
      sourceName: pick('source') || new URL(url).hostname.replace(/^www\./,''),
    });
  }
  return items;
}

async function loadExistingDedupKeys() {
  await fs.mkdir(ART_DIR, { recursive: true });
  const files = await fs.readdir(ART_DIR);
  const keys = new Set();
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const j = JSON.parse(await fs.readFile(path.join(ART_DIR, f), 'utf8'));
      (j.dedupKeys || []).forEach(k => keys.add(k));
      if (j.canonicalUrl) keys.add(sha1(j.canonicalUrl));
      if (j.titleFingerprint) keys.add(j.titleFingerprint);
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

async function runCodex(prompt, timeoutMs = 180_000) {
  const args = [
    'exec',
    '--json',
    '--sandbox', 'read-only',
    '--skip-git-repo-check',
    '--ignore-rules',
    prompt,
  ];
  return new Promise((resolve, reject) => {
    console.log('[codex] spawn args:', JSON.stringify(args.slice(0, -1)));
    const child = spawn('codex', args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    child.stdout.on('data', d => {
      const s = d.toString();
      out += s;
      if (out.length < 600) console.log('[codex stdout]', s.slice(0, 250));
    });
    child.stderr.on('data', d => {
      const s = d.toString();
      err += s;
      if (err.length < 500) console.log('[codex stderr]', s.slice(0, 200));
    });
    const to = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`codex timeout ${timeoutMs}ms.\nstdout(${out.length}b): ${out.slice(0,500)}\nstderr(${err.length}b): ${err.slice(0,500)}`));
    }, timeoutMs);
    child.on('error', e => { clearTimeout(to); reject(new Error('codex spawn error: '+e.message)); });
    child.on('close', code => {
      clearTimeout(to);
      console.log(`[codex] exited code=${code} stdout=${out.length}b stderr=${err.length}b`);
      if (code !== 0) return reject(new Error(`codex exit ${code}.\nstderr: ${err.slice(0,500)}\nstdout: ${out.slice(0,500)}`));
      resolve(out);
    });
  });
}

function parseJson(stdout) {
  // codex CLI emits NDJSON (one JSON per line):
  // {"type":"thread.started","thread_id":"..."}
  // {"type":"turn.started"}
  // {"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"..."}}
  // {"type":"turn.completed","usage":{...}}
  const lines = stdout.split('\n').filter(Boolean);
  const messages = [];
  for (const ln of lines) {
    try {
      const obj = JSON.parse(ln);
      if (obj.type === 'item.completed' && obj.item && obj.item.type === 'agent_message' && typeof obj.item.text === 'string') {
        messages.push(obj.item.text);
      }
    } catch {}
  }
  console.log('[parser] agent_messages:', messages.length, 'last len:', messages[messages.length-1]?.length);
  // Try last assistant message first
  for (let i = messages.length - 1; i >= 0; i--) {
    const text = messages[i].trim();
    // Try parsing whole text as JSON
    try { return JSON.parse(text); } catch {}
    // Strip code-fence ```json ... ```
    const m1 = text.match(/```(?:json)?\s*([\s\S]+?)```/);
    if (m1) {
      try { return JSON.parse(m1[1].trim()); } catch {}
    }
    // Extract JSON object containing both "title" and "excerpt"
    const m2 = text.match(/\{[\s\S]*?"title"[\s\S]*?"excerpt"[\s\S]*?\}/);
    if (m2) {
      try { return JSON.parse(m2[0]); } catch {}
    }
  }
  throw new Error('JSON parse fail. messages='+messages.length+' last text head: '+(messages[messages.length-1]||'').slice(0,300));
}

async function generateOne(channel, item) {
  const slug = makeSlug(item.title);
  const id = sha1(canonicalUrl(item.link)).slice(0, 12);

  const prompt = `다음 영문 기사 헤드라인을 한국어로 자연스럽게 다시 쓰고 200자 요약을 만들어 JSON 한 줄로만 답하세요.\n원문: "${item.title.slice(0,150)}"\n설명: "${item.description.slice(0,300)}"\n출력형식: {"title":"...","excerpt":"..."}`;

  console.log(`[codex] start: ${item.title.slice(0,60)}...`);
  const stdout = await runCodex(prompt, 180_000);
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
      sha1((item.sourceName||'') + '|' + item.title.toLowerCase()),
    ],
    imageUrl: '',
    i18n: { ko: { title: data.title, excerpt: data.excerpt, body: item.description } },
  };

  await fs.mkdir(ART_DIR, { recursive: true });
  await fs.writeFile(path.join(ART_DIR, `${id}.json`), JSON.stringify(article, null, 2));
  console.log(`[codex] OK data/articles/${id}.json`);
  return article;
}

async function rebuildSeed() {
  const files = (await fs.readdir(ART_DIR)).filter(f => f.endsWith('.json'));
  const all = [];
  for (const f of files) {
    try { all.push(JSON.parse(await fs.readFile(path.join(ART_DIR, f), 'utf8'))); } catch {}
  }
  all.sort((a,b) => (b.publishedAt||'').localeCompare(a.publishedAt||''));
  await fs.writeFile(SEED_PATH, JSON.stringify(all.slice(0, 60), null, 2));
  console.log(`seed.json rebuilt: ${Math.min(all.length, 60)}/${all.length}`);
}

async function main() {
  console.log('=== codex-cron v9 (NDJSON parser fix) ===');
  const channel = await loadChannel();
  console.log(`channel: ${channel.name} (${channel.id})  sources: ${channel.sources.length}`);

  const seen = await loadExistingDedupKeys();
  console.log(`dedup keys: ${seen.size}`);

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
    } catch (e) { console.warn(`RSS skip ${src.url}: ${e.message}`); }
  }
  console.log(`candidates: ${candidates.length}`);

  const picked = candidates.slice(0, MAX_ARTICLES);
  let ok = 0;
  for (const it of picked) {
    try {
      await generateOne(channel, it);
      ok++;
    } catch (e) {
      console.error(`fail: ${e.message}`);
    }
  }

  if (ok > 0) await rebuildSeed();
  console.log(`done: ${ok}/${picked.length}`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
