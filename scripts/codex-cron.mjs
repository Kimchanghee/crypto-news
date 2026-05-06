#!/usr/bin/env node
/**
 * Codex v10 — 뉴스 구조 + SEO 최적화 + 11개 언어 동시 번역
 * 변경점:
 *  - codex 1회 호출로 11개 언어 (ko,en,ja,zh,es,pt,de,fr,ar,hi,id) 모두 생성
 *  - 한국어 본문은 SEO/AEO 최적화 뉴스 구조: 리드(5W1H) + 본문 2-3 단락 + 출처 인용
 *  - title 50-80자 (SEO 키워드 풍부), excerpt 150-200자 (meta description)
 *  - 그 외 10개 언어는 한국어 기사 충실 번역 (현지어 어순/관용 적용)
 *  - 출력: i18n.{locale}.{title, excerpt, body}
 */
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const ART_DIR = path.join(ROOT, 'data', 'articles');
const SEED_PATH = path.join(ROOT, 'data', 'seed.json');
const MAX_ARTICLES = Number(process.env.MAX_ARTICLES || '2');
const LOCALES = ['ko','en','ja','zh','es','pt','de','fr','ar','hi','id'];

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
      description: pick('description').replace(/<[^>]+>/g,'').slice(0, 800),
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

async function runCodex(prompt, timeoutMs = 240_000) {
  const args = [
    'exec',
    '--json',
    '--sandbox', 'read-only',
    '--skip-git-repo-check',
    '--ignore-rules',
    prompt,
  ];
  return new Promise((resolve, reject) => {
    const child = spawn('codex', args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    child.stdout.on('data', d => { out += d.toString(); });
    child.stderr.on('data', d => { err += d.toString(); });
    const to = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`codex timeout ${timeoutMs}ms. stdout(${out.length}b)`));
    }, timeoutMs);
    child.on('error', e => { clearTimeout(to); reject(new Error('spawn: '+e.message)); });
    child.on('close', code => {
      clearTimeout(to);
      console.log(`[codex] code=${code} stdout=${out.length}b stderr=${err.length}b`);
      if (code !== 0) return reject(new Error(`exit ${code}. err: ${err.slice(0,300)}`));
      resolve(out);
    });
  });
}

function parseJson(stdout) {
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
  console.log(`[parser] msgs=${messages.length} last=${messages[messages.length-1]?.length}b`);
  for (let i = messages.length - 1; i >= 0; i--) {
    const text = messages[i].trim();
    try { return JSON.parse(text); } catch {}
    const m1 = text.match(/```(?:json)?\s*([\s\S]+?)```/);
    if (m1) { try { return JSON.parse(m1[1].trim()); } catch {} }
    // Find outermost JSON object
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { return JSON.parse(text.slice(start, end+1)); } catch {}
    }
  }
  throw new Error('JSON parse fail. last text head: ' + (messages[messages.length-1]||'').slice(0,400));
}

function buildPrompt(channel, item) {
  // 뉴스 구조 + SEO 가이드라인을 명확히 지시
  return [
    `당신은 다국어 ${channel.name} 뉴스 에디터입니다. 검색 노출(SEO/GEO) + AI 답변 노출(AEO)에 최적화된 뉴스 기사 1개를 11개 언어로 작성하세요.`,
    ``,
    `=== 원문 ===`,
    `제목: ${item.title.slice(0, 250)}`,
    `요약: ${item.description.slice(0, 600)}`,
    `출처: ${item.sourceName}`,
    ``,
    `=== 작성 규칙 ===`,
    `1. 제목(title): 50-80자, 핵심 키워드 앞쪽 배치, 클릭률 높은 톤, 과장·낚시 금지`,
    `2. 요약(excerpt): 150-200자, meta description용. 누가/무엇을/언제/왜를 한 줄로 압축`,
    `3. 본문(body): 400-700자. 다음 뉴스 구조 엄수:`,
    `   - 첫 단락(리드): 5W1H 핵심 사실 1-2문장`,
    `   - 둘째 단락: 배경·맥락·관련 수치`,
    `   - 셋째 단락: 영향·전망·관계자 코멘트(원문에 있다면)`,
    `   - 마지막 줄: "출처: ${item.sourceName}" 형태 인용`,
    `4. 사실 그대로(원문 정보만 사용), 추측·과장 금지`,
    `5. 11개 언어 모두 동일 사실, 자연스러운 현지어 어순·관용`,
    `6. 한국어가 원천이며 다른 언어는 한국어 본문을 충실 번역`,
    ``,
    `=== 출력 ===`,
    `반드시 다음 JSON 한 개만 출력. 마크다운 코드블록·설명 금지.`,
    `{`,
    LOCALES.map(l => `  "${l}": {"title":"...","excerpt":"...","body":"..."}`).join(',\n'),
    `}`,
  ].join('\n');
}

async function generateOne(channel, item) {
  const slug = makeSlug(item.title);
  const id = sha1(canonicalUrl(item.link)).slice(0, 12);
  const prompt = buildPrompt(channel, item);

  console.log(`[codex] start: ${item.title.slice(0,60)}...`);
  const stdout = await runCodex(prompt, 240_000);
  const data = parseJson(stdout);

  // Validate i18n
  const i18n = {};
  for (const lc of LOCALES) {
    const obj = data[lc];
    if (obj && typeof obj.title === 'string' && typeof obj.excerpt === 'string' && typeof obj.body === 'string') {
      i18n[lc] = { title: obj.title, excerpt: obj.excerpt, body: obj.body };
    }
  }
  if (!i18n.ko) {
    throw new Error('ko translation missing. got locales: '+Object.keys(data).join(','));
  }

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
    i18n,
  };

  await fs.mkdir(ART_DIR, { recursive: true });
  await fs.writeFile(path.join(ART_DIR, `${id}.json`), JSON.stringify(article, null, 2));
  console.log(`[codex] OK ${id}.json — locales=${Object.keys(i18n).length}/${LOCALES.length}`);
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
  console.log(`seed: ${Math.min(all.length,60)}/${all.length}`);
}

async function main() {
  console.log('=== codex-cron v10 (11-locale + news structure + SEO) ===');
  const channel = await loadChannel();
  console.log(`channel: ${channel.name} (${channel.id})  sources: ${channel.sources.length}`);

  const seen = await loadExistingDedupKeys();
  console.log(`dedup: ${seen.size}`);

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
    } catch (e) { console.error(`fail: ${e.message}`); }
  }

  if (ok > 0) await rebuildSeed();
  console.log(`done: ${ok}/${picked.length}`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
