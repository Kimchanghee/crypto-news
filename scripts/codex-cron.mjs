#!/usr/bin/env node
/**
 * Codex CLI 기반 콘텐츠 자동 생성 스크립트.
 * GitHub Actions(.github/workflows/content.yml)에서 실행됨.
 *
 * 흐름:
 *   1) channel.config.ts 의 RSS 소스 fetch
 *   2) 3-key dedup (URL canonical / title fp / source+title fp) — data/articles/*.json 의 파일명/메타로 비교
 *   3) 새 기사 N개(MAX_ARTICLES) 선정
 *   4) 각 기사마다 'codex exec --json --sandbox workspace-write' 호출 →
 *        - 11개 로케일 번역
 *        - 800단어 한국어 본문
 *        - 1200x630 썸네일 PNG 를 public/images/{slug}.png 로 저장 (codex 의 image_gen 툴 사용)
 *   5) data/articles/{id}.json 저장 + data/seed.json 재구성
 *   6) (commit/push 는 워크플로 단계에서 처리)
 */
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const execFileP = promisify(execFile);
const ROOT = process.cwd();
const ART_DIR = path.join(ROOT, 'data', 'articles');
const IMG_DIR = path.join(ROOT, 'public', 'images');
const SEED_PATH = path.join(ROOT, 'data', 'seed.json');
const MAX_ARTICLES = Number(process.env.MAX_ARTICLES || '3');
const LOCALES = ['ko','en','ja','zh','es','de','fr','pt','vi','ar','id'];

// 동적 채널 config 로드 (Next.js TS 직접 import 어려워서 텍스트 파싱)
async function loadChannel() {
  const txt = await fs.readFile(path.join(ROOT, 'channel.config.ts'), 'utf8');
  const idM = txt.match(/id:\s*'([^']+)'/);
  const nameM = txt.match(/name:\s*'([^']+)'/);
  const srcRe = /\{\s*url:\s*'([^']+)',\s*category:\s*'([^']+)'(?:,\s*weight:\s*(\d+))?/g;
  const sources = [];
  let m;
  while ((m = srcRe.exec(txt))) sources.push({ url: m[1], category: m[2], weight: Number(m[3]||1) });
  return { id: idM?.[1] || 'UNKNOWN', name: nameM?.[1] || '', sources };
}

function sha1(s) { return crypto.createHash('sha1').update(s).digest('hex'); }
function canonicalUrl(u) {
  try { const x = new URL(u); x.hash=''; ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid'].forEach(k=>x.searchParams.delete(k)); return x.toString(); }
  catch { return u; }
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

async function runCodex(prompt, opts = {}) {
  const args = [
    'exec',
    '--json',
    '--sandbox', opts.sandbox || 'workspace-write',
    '--skip-git-repo-check',
    '--ignore-rules',
    prompt,
  ];
  return new Promise((resolve, reject) => {
    const child = spawn('codex', args, { cwd: ROOT });
    let out = '', err = '';
    child.stdout.on('data', d => out += d.toString());
    child.stderr.on('data', d => err += d.toString());
    const to = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('codex timeout')); }, opts.timeout || 180_000);
    child.on('close', code => {
      clearTimeout(to);
      if (code !== 0) return reject(new Error(`codex exit ${code}: ${err.slice(0,500)}`));
      resolve({ stdout: out, stderr: err });
    });
  });
}

// JSON Lines 출력에서 마지막 assistant 메시지의 텍스트 추출 + JSON 파싱
function parseCodexJson(stdout) {
  const lines = stdout.split('\n').filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const obj = JSON.parse(lines[i]);
      const t = obj?.message?.content || obj?.text || obj?.content;
      if (typeof t === 'string') {
        // JSON 코드블록 안에서 추출
        const m = t.match(/```(?:json)?\s*([\s\S]+?)```/) || [null, t];
        try { return JSON.parse(m[1].trim()); } catch {}
      }
    } catch {}
  }
  throw new Error('codex JSON 파싱 실패');
}

async function generateOne(channel, item) {
  const slug = makeSlug(item.title);
  const id = sha1(canonicalUrl(item.link)).slice(0, 12);
  const imgPath = `public/images/${slug}.png`;

  const prompt = [
    `당신은 ${channel.name}(${channel.id}) 카테고리 뉴스 에디터입니다.`,
    `다음 원문 기사를 SEO 최적화 + ${LOCALES.length}개 언어 번역 + 1200x630 썸네일 이미지로 가공하세요.`,
    ``,
    `원문:`,
    `- title: ${item.title}`,
    `- description: ${item.description}`,
    `- source: ${item.sourceName}`,
    `- link: ${item.link}`,
    ``,
    `작업:`,
    `1) 한국어 800-단어 본문 작성 (자연스러운 톤, 사실에 근거).`,
    `2) ${LOCALES.join(', ')} 11개 언어로 title/excerpt/body 번역.`,
    `3) image_gen 툴로 1200x630 썸네일 PNG 생성, 파일을 정확히 ${imgPath} 로 저장.`,
    `   (스타일: 미니멀 뉴스 카드, 영문/숫자 위주의 단순 그래픽, 사진 사실적)`,
    `4) 작업이 끝나면 마지막 메시지로 다음 JSON만 출력 (markdown 코드블록 없이).`,
    ``,
    `JSON 스키마:`,
    `{`,
    `  "id": "${id}",`,
    `  "slug": "${slug}",`,
    `  "imageUrl": "/images/${slug}.png",`,
    `  "i18n": {`,
    LOCALES.map(l => `    "${l}": { "title": "...", "excerpt": "...", "body": "..." }`).join(',\n'),
    `  }`,
    `}`,
  ].join('\n');

  console.log(`[codex] ${item.title.slice(0,60)}...`);
  const { stdout } = await runCodex(prompt, { timeout: 240_000 });
  const data = parseCodexJson(stdout);

  const article = {
    id,
    slug,
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
    imageUrl: data.imageUrl || `/images/${slug}.png`,
    i18n: data.i18n,
  };

  await fs.mkdir(ART_DIR, { recursive: true });
  await fs.writeFile(path.join(ART_DIR, `${id}.json`), JSON.stringify(article, null, 2));
  console.log(`  ✓ data/articles/${id}.json`);
  return article;
}

async function rebuildSeed() {
  await fs.mkdir(ART_DIR, { recursive: true });
  const files = (await fs.readdir(ART_DIR)).filter(f => f.endsWith('.json')).sort();
  const all = [];
  for (const f of files) {
    try { all.push(JSON.parse(await fs.readFile(path.join(ART_DIR, f), 'utf8'))); } catch {}
  }
  // 최신 순 + 최대 60개만 시드에 포함 (사이트 첫 페이지 표시용)
  all.sort((a,b) => (b.publishedAt||'').localeCompare(a.publishedAt||''));
  const seed = all.slice(0, 60);
  await fs.writeFile(SEED_PATH, JSON.stringify(seed, null, 2));
  console.log(`seed.json 재구성: ${seed.length}/${all.length}개`);
}

async function main() {
  await fs.mkdir(IMG_DIR, { recursive: true });
  const channel = await loadChannel();
  console.log(`채널: ${channel.name} (${channel.id})`);
  console.log(`소스: ${channel.sources.length}개`);

  const seen = await loadExistingDedupKeys();
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
        candidates.push({ ...it, _src: src });
      }
    } catch (e) { console.warn(`RSS 실패 ${src.url}: ${e.message}`); }
  }
  console.log(`신규 후보: ${candidates.length}개`);

  const picked = candidates.slice(0, MAX_ARTICLES);
  let ok = 0;
  for (const it of picked) {
    try {
      await generateOne(channel, it);
      ok++;
    } catch (e) { console.error(`기사 생성 실패: ${e.message}`); }
  }

  if (ok > 0) await rebuildSeed();
  console.log(`완료: ${ok}/${picked.length}개`);
}

main().catch(e => { console.error(e); process.exit(1); });
