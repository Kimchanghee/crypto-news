#!/usr/bin/env node
/**
 * Codex v12 — RSS/article OG 이미지 추출 + 11개 언어 번역 + 뉴스 구조 + SEO
 * 각 기사:
 *  1) RSS의 enclosure/media:content + 원본 기사 페이지의 og:image 추출 → public/images/articles/{id}.{ext}
 *  2) codex CLI로 11개 언어 SEO 뉴스 번역 (v10/v11 동일)
 */
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const ART_DIR = path.join(ROOT, 'data', 'articles');
const SEED_PATH = path.join(ROOT, 'data', 'seed.json');
const IMG_DIR = path.join(ROOT, 'public', 'images', 'articles');
const MAX_ARTICLES = Number(process.env.MAX_ARTICLES || '3');
const LOCALES = ['ko','en','ja','zh','es','pt','de','fr','ar','hi','id'];
const GENERATE_ALL_LOCALES = process.env.GENERATE_ALL_LOCALES === '1';
const PROMPT_LOCALES = GENERATE_ALL_LOCALES ? LOCALES : ['ko'];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36';
const TARGET_BODY_MIN = Number(process.env.TARGET_BODY_MIN || '1000');
const TARGET_BODY_MAX = Number(process.env.TARGET_BODY_MAX || '1200');
const MAX_KO_REPAIR_RETRIES = Number(process.env.MAX_KO_REPAIR_RETRIES || '2');
const CODEX_TIMEOUT_MS = Number(process.env.CODEX_TIMEOUT_MS || '900000');
const CODEX_MODEL = 'gpt-5.5';

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
  const r = await fetch(url, { headers: { 'user-agent': UA } });
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
    // Look for image url in enclosure or media:content
    let rssImg = '';
    const enc = block.match(/<enclosure[^>]*url=["']([^"']+\.(?:jpe?g|png|webp|gif))[^"']*["'][^>]*>/i);
    if (enc) rssImg = enc[1];
    if (!rssImg) {
      const mc = block.match(/<media:content[^>]*url=["']([^"']+\.(?:jpe?g|png|webp|gif))[^"']*["'][^>]*>/i);
      if (mc) rssImg = mc[1];
    }
    if (!rssImg) {
      const mt = block.match(/<media:thumbnail[^>]*url=["']([^"']+\.(?:jpe?g|png|webp|gif))[^"']*["'][^>]*>/i);
      if (mt) rssImg = mt[1];
    }
    // <description>의 <img>는 Google News 로고 등 광고/썸네일이므로 무시
    items.push({
      title: pick('title'),
      link: pick('link'),
      description: pick('description').replace(/<[^>]+>/g,'').slice(0, 800),
      pubDate: pick('pubDate'),
      sourceName: pick('source') || new URL(url).hostname.replace(/^www\./,''),
      rssImage: rssImg,
    });
  }
  return items;
}

async function resolveArticleUrl(url) {
  // Google News의 redirect URL이면 실제 기사 URL로 따라감
  if (!/news\.google\.com/.test(url)) return url;
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 12000);
    const r = await fetch(url, { headers: { 'user-agent': UA, 'accept': 'text/html' }, signal: ctrl.signal, redirect: 'follow' });
    clearTimeout(to);
    if (!r.ok) return url;
    // 만약 fetch가 이미 redirect를 따라간 결과 URL이 google.com 아니면 그대로 사용
    if (r.url && !/news\.google\.com/.test(r.url)) return r.url;
    const html = await r.text();
    // 1) meta refresh
    let m = html.match(/<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^;]*;\s*url=([^"']+)["']/i);
    if (m && !/news\.google\.com/.test(m[1])) return m[1].replace(/&amp;/g,'&');
    // 2) data-n-au attribute (Google News)
    m = html.match(/data-n-au=["']([^"']+)["']/);
    if (m && !/news\.google\.com/.test(m[1])) return m[1].replace(/&amp;/g,'&');
    // 3) JavaScript 안의 redirect URL 패턴 (HTMLString.replace, location.replace 등)
    m = html.match(/(?:location\.replace|window\.open|href=)\s*\(?\s*["'](https?:\/\/(?!news\.google\.com)[^"']+)["']/);
    if (m) return m[1];
    // 4) <a href="https://..."> 비-google 링크
    m = html.match(/<a[^>]+href=["'](https?:\/\/(?!news\.google\.com|accounts\.google\.com|policies\.google)[^"']{30,})["']/);
    if (m) return m[1];
  } catch {}
  return url;
}

async function fetchOgImage(articleUrl) {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 15000);
    const r = await fetch(articleUrl, {
      headers: { 'user-agent': UA, 'accept': 'text/html,application/xhtml+xml' },
      signal: ctrl.signal,
      redirect: 'follow',
    });
    clearTimeout(to);
    if (!r.ok) return null;
    const html = await r.text();
    // Try og:image first, then og:image:secure_url, then twitter:image
    const candidates = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    ];
    for (const re of candidates) {
      const m = html.match(re);
      if (m && m[1]) {
        let url = m[1].trim();
        if (url.startsWith('//')) url = 'https:' + url;
        if (url.startsWith('/')) url = new URL(articleUrl).origin + url;
        return url;
      }
    }
    return null;
  } catch (e) { return null; }
}

async function downloadImage(imageUrl, destAbsPath) {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 30000);
    const r = await fetch(imageUrl, {
      headers: { 'user-agent': UA, 'accept': 'image/*' },
      signal: ctrl.signal,
      redirect: 'follow',
    });
    clearTimeout(to);
    if (!r.ok) return false;
    const ct = r.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) return false;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 1500) return false; // 너무 작으면 placeholder
    await fs.mkdir(path.dirname(destAbsPath), { recursive: true });
    await fs.writeFile(destAbsPath, buf);
    return true;
  } catch (e) { return false; }
}

function pickExt(imageUrl, contentType) {
  const m = imageUrl.match(/\.(jpe?g|png|webp|gif|avif)(?:[?#]|$)/i);
  if (m) return m[1].toLowerCase().replace('jpeg','jpg');
  if (contentType?.includes('png')) return 'png';
  if (contentType?.includes('webp')) return 'webp';
  if (contentType?.includes('gif')) return 'gif';
  return 'jpg';
}

async function fetchAndSaveImage(item, id) {
  // 1순위: RSS의 image, 2순위: 기사 페이지 og:image
  let candidate = item.rssImage;
  // Google News 로고/썸네일은 무시
  if (candidate && /lh3\.googleusercontent\.com|googleusercontent\.com\/proxy/.test(candidate)) {
    candidate = null;
  }
  if (!candidate) {
    const realUrl = await resolveArticleUrl(item.link);
    candidate = await fetchOgImage(realUrl);
    if (!candidate && realUrl !== item.link) {
      candidate = await fetchOgImage(item.link);
    }
  }
  if (!candidate) {
    console.log(`[img] no candidate for ${id}`);
    return null;
  }
  const ext = pickExt(candidate);
  const relPath = `public/images/articles/${id}.${ext}`;
  const absPath = path.join(ROOT, relPath);
  const ok = await downloadImage(candidate, absPath);
  if (ok) {
    const st = await fs.stat(absPath);
    console.log(`[img] OK ${relPath} (${st.size}b) <- ${candidate.slice(0,80)}`);
    return `/images/articles/${id}.${ext}`;
  }
  // 다운로드 실패 시 og:image도 fallback 시도
  if (candidate === item.rssImage) {
    const realUrl = await resolveArticleUrl(item.link);
    const og = await fetchOgImage(realUrl);
    if (og && og !== candidate) {
      const ext2 = pickExt(og);
      const relPath2 = `public/images/articles/${id}.${ext2}`;
      const absPath2 = path.join(ROOT, relPath2);
      const ok2 = await downloadImage(og, absPath2);
      if (ok2) {
        const st2 = await fs.stat(absPath2);
        console.log(`[img] OK fallback ${relPath2} (${st2.size}b)`);
        return `/images/articles/${id}.${ext2}`;
      }
    }
  }
  console.log(`[img] download failed for ${id}: ${candidate.slice(0,80)}`);
  return null;
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

async function runCodex(prompt, opts = {}) {
  const sandbox = opts.sandbox || 'read-only';
  const timeoutMs = opts.timeoutMs || 240_000;
  const args = ['exec','--json','--sandbox', sandbox,'--skip-git-repo-check','--ignore-rules'];
  if (CODEX_MODEL) args.push('--model', CODEX_MODEL);
  args.push(prompt);
  return new Promise((resolve, reject) => {
    const child = spawn('codex', args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    child.stdout.on('data', d => { out += d.toString(); });
    child.stderr.on('data', d => { err += d.toString(); });
    const to = setTimeout(() => { child.kill('SIGKILL'); reject(new Error(`codex timeout ${timeoutMs}ms`)); }, timeoutMs);
    child.on('error', e => { clearTimeout(to); reject(new Error('spawn: '+e.message)); });
    child.on('close', code => {
      clearTimeout(to);
      console.log(`[codex] code=${code} stdout=${out.length}b err=${err.length}b`);
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
  for (let i = messages.length - 1; i >= 0; i--) {
    const text = messages[i].trim();
    try { return JSON.parse(text); } catch {}
    const m1 = text.match(/```(?:json)?\s*([\s\S]+?)```/);
    if (m1) { try { return JSON.parse(m1[1].trim()); } catch {} }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { return JSON.parse(text.slice(start, end+1)); } catch {}
    }
  }
  throw new Error('JSON parse fail. last text head: ' + (messages[messages.length-1]||'').slice(0,400));
}

function buildTranslationPrompt(channel, item) {
  const localeRule = GENERATE_ALL_LOCALES
    ? '9. 11개 언어 모두 동일 사실, 자연스러운 현지어 어순'
    : '9. ko 1개 언어만 출력';
  const translationRule = GENERATE_ALL_LOCALES
    ? '10. 한국어가 원천이며 다른 언어는 한국어 본문을 충실 번역'
    : '10. 한국어 문장 가독성·정확성 최우선';
  const modeLine = GENERATE_ALL_LOCALES
    ? `당신은 ${channel.name}의 베테랑 기자입니다. 아래 사실을 바탕으로, 당신이 직접 취재해 쓴 것처럼 완전히 독립적인 뉴스 기사 1개를 SEO/AEO/GEO 극강으로 작성하세요. (11개 언어)`
    : `당신은 ${channel.name}의 베테랑 기자입니다. 아래 사실을 바탕으로, 당신이 직접 취재해 쓴 것처럼 완전히 독립적인 한국어 뉴스 기사 1개를 SEO/AEO/GEO 극강으로 작성하세요.`;
  return [
    modeLine,
    ``,
    `=== 참고 사실 (이 정보로 직접 기사를 작성합니다) ===`,
    `핵심 사실: ${item.title.slice(0, 250)}`,
    `세부 정보: ${item.description.slice(0, 600)}`,
    ``,
    `=== 작성 규칙 ===`,
    `[절대 금지] 원문·출처·~에 따르면·~가 전했다·매체명/기자명 등 출처를 가리키는 표현 일절 금지. 당신이 1차 취재한 기사처럼 단정적·자기완결적으로 서술합니다.`,
    `1. title: 50-80자, 핵심 키워드 앞쪽 배치, 과장·낚시 금지`,
    `2. excerpt: 150-210자. 누가/무엇을/언제/왜를 한 줄 요약`,
    `3. metaDescription: 140-180자. 검색 스니펫 최적화`,
    `4. summary: 220-320자. 핵심 포인트 3~4문장`,
    `5. body(한국어): 공백 제외 1000자 이상(최대 ${TARGET_BODY_MAX}자). 구성: 핵심 결론 리드 → 배경/맥락 → 구체 수치·데이터 → 시장·독자 영향 → 전망. 소제목(##) 2~3개로 스캔성 강화. 한국 독자 맥락(원화 환산·국내 규제·국내 시장 영향)을 자연스럽게 반영(GEO).`,
    `   나머지 언어는 동일 사실을 자연 번역하되 450~900자 권장`,
    `6. keywords: 핵심 키워드 6~10개 배열(string[])`,
    `7. faq: 질문/답변 3개. 사실 기반, 과장 금지`,
    `8. 신문 기사체·단정적 서술. 사실은 정확히, 불확실한 건 전망된다 수준으로만. AEO/SEO/GEO 극대화: 핵심 키워드 자연 배치, 질의응답형 단락, 한국 시장 맥락 포함.`,
    localeRule,
    translationRule,
    ``,
    `=== 출력 ===`,
    `반드시 다음 JSON 한 개만 출력. 마크다운 코드블록·설명 금지.`,
    `{`,
    PROMPT_LOCALES.map(l => `  "${l}": {"title":"...","excerpt":"...","metaDescription":"...","summary":"...","body":"...","keywords":["..."],"faq":[{"q":"...","a":"..."}]}`).join(',\n'),
    `}`,
  ].join('\n');
}

function toText(v) {
  return String(v ?? '').trim();
}

function charLen(v) {
  return Array.from(String(v ?? '').replace(/\s+/g, '')).length;
}

function bodyInRange(v) {
  const n = charLen(v);
  return n >= TARGET_BODY_MIN && n <= TARGET_BODY_MAX;
}

function cleanKeywords(raw, fallback = []) {
  const src = Array.isArray(raw)
    ? raw
    : toText(raw).split(/[,\n]/g);
  const dedup = [];
  const seen = new Set();
  for (const it of src) {
    const k = toText(it).replace(/^#+/, '');
    if (!k) continue;
    if (k.length < 2 || k.length > 40) continue;
    const key = k.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(k);
  }
  for (const it of fallback) {
    const k = toText(it);
    if (!k) continue;
    const key = k.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(k);
  }
  return dedup.slice(0, 10);
}

function cleanFaq(raw, sourceName, title) {
  const arr = Array.isArray(raw) ? raw : [];
  const out = [];
  for (const it of arr) {
    const q = toText(it?.q).slice(0, 120);
    const a = toText(it?.a).slice(0, 280);
    if (!q || !a) continue;
    out.push({ q, a });
    if (out.length >= 3) break;
  }
  if (out.length >= 2) return out;
  if (out.length === 0) {
    out.push({
      q: `${title.slice(0, 50)} 핵심 포인트는 무엇인가요?`,
      a: `핵심 배경, 주요 수치, 시장에 미치는 영향을 본문에서 순서대로 정리했습니다.`
    });
  }
  out.push({
    q: '이 기사에서 가장 먼저 확인할 수치는 무엇인가요?',
    a: '본문에 제시된 발표 시점, 당사자 발언, 가격·지표 변화를 우선 확인하는 것이 좋습니다.'
  });
  return out.slice(0, 3);
}

function normalizeLocalePayload(locale, payload, item) {
  const title = toText(payload?.title || item.title).slice(0, 180);
  const excerpt = toText(payload?.excerpt || payload?.summary).slice(0, 240);
  const metaDescription = toText(payload?.metaDescription || excerpt).slice(0, 200);
  const summary = toText(payload?.summary || excerpt).slice(0, 360);
  const body = toText(payload?.body)
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return {
    title,
    excerpt,
    metaDescription,
    summary,
    body,
    keywords: cleanKeywords(payload?.keywords, [item.category, title.slice(0, 20)]),
    faq: cleanFaq(payload?.faq, '', title),
  };
}

function buildKoRepairPrompt(channel, item, ko) {
  return [
    `당신은 ${channel.name} 한국어 뉴스 에디터입니다.`,
    `아래 초안을 사실관계를 유지한 채 SEO/AEO 기준으로 다시 작성하세요.`,
    ``,
    `=== 원문 정보 ===`,
    `핵심 사실: ${item.title.slice(0, 250)}`,
    `세부 정보: ${item.description.slice(0, 600)}`,
    ``,
    `[출처·원문 언급 금지] 매체/출처 표현 없이 직접 쓴 기사처럼 작성.`,
    ``,
    `=== 현재 초안 ===`,
    `title: ${toText(ko?.title).slice(0, 250)}`,
    `excerpt: ${toText(ko?.excerpt).slice(0, 300)}`,
    `body: ${toText(ko?.body).slice(0, 2500)}`,
    ``,
    `=== 수정 규칙 ===`,
    `1) 사실 추가/삭제 금지, 추측 금지`,
    `2) body는 공백 제외 1000자 이상(최대 ${TARGET_BODY_MAX}자)`,
    `3) 신문 기사체 유지 (리드→배경/수치→영향/전망). 출처·원문 언급 금지`,
    `4) keywords 6~10개, faq 3개`,
    ``,
    `=== 출력 ===`,
    `JSON 한 개만 출력`,
    `{"title":"...","excerpt":"...","metaDescription":"...","summary":"...","body":"...","keywords":["..."],"faq":[{"q":"...","a":"..."}]}`
  ].join('\n');
}

async function generateOne(channel, item) {
  const slug = makeSlug(item.title);
  const id = sha1(canonicalUrl(item.link)).slice(0, 12);

  // Step 1: fetch real image (RSS image OR original article OG image)
  console.log(`[img] start ${id}`);
  const imageUrl = await fetchAndSaveImage(item, id);

  // Step 2: 11-language translation via codex
  const tPrompt = buildTranslationPrompt(channel, item);
  console.log(`[translate] start: ${item.title.slice(0,60)}...`);
  const stdout = await runCodex(tPrompt, { sandbox: 'read-only', timeoutMs: CODEX_TIMEOUT_MS });
  const data = parseJson(stdout);

  const i18n = {};
  const koPayload = data?.ko || data;
  i18n.ko = normalizeLocalePayload('ko', koPayload || {}, item);
  if (!i18n.ko?.body) {
    throw new Error('ko translation missing. got locales: '+Object.keys(data).join(','));
  }

  let retries = 0;
  while (!bodyInRange(i18n.ko.body) && retries < MAX_KO_REPAIR_RETRIES) {
    retries += 1;
    console.warn(`[repair] ko body length ${charLen(i18n.ko.body)} out of range. retry=${retries}`);
    const repairPrompt = buildKoRepairPrompt(channel, item, i18n.ko);
    const repairOut = await runCodex(repairPrompt, { sandbox: 'read-only', timeoutMs: Math.min(CODEX_TIMEOUT_MS, 300_000) });
    const repaired = parseJson(repairOut);
    i18n.ko = normalizeLocalePayload('ko', repaired?.ko || repaired || {}, item);
  }

  if (!bodyInRange(i18n.ko.body)) {
    throw new Error(`ko body length out of range: ${charLen(i18n.ko.body)} (target ${TARGET_BODY_MIN}-${TARGET_BODY_MAX})`);
  }

  if (GENERATE_ALL_LOCALES) {
    for (const lc of LOCALES) {
      if (lc === 'ko') continue;
      i18n[lc] = normalizeLocalePayload(lc, data[lc] || {}, item);
    }
  }

  const article = {
    id, slug,
    channelId: channel.id,
    category: (channel.id || '').toLowerCase(),
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sourceName: '',
    sourceUrl: '',
    canonicalUrl: canonicalUrl(item.link),
    titleFingerprint: titleFp(item.title),
    dedupKeys: [
      sha1(canonicalUrl(item.link)),
      titleFp(item.title),
      sha1((item.sourceName||'') + '|' + item.title.toLowerCase()),
    ],
    imageUrl: imageUrl || '',
    i18n,
  };

  await fs.mkdir(ART_DIR, { recursive: true });
  await fs.writeFile(path.join(ART_DIR, `${id}.json`), JSON.stringify(article, null, 2));
  console.log(`[OK] ${id}.json — locales=${Object.keys(i18n).length}/${LOCALES.length} img=${!!imageUrl} koLen=${charLen(i18n.ko.body)}`);
  return article;
}

async function rebuildSeed() {
  const files = (await fs.readdir(ART_DIR)).filter(f => f.endsWith('.json'));
  const all = [];
  for (const f of files) {
    try { all.push(JSON.parse(await fs.readFile(path.join(ART_DIR, f), 'utf8'))); } catch {}
  }
  const relevant = all.filter(a => isRelevant(a.channelId, { title: (a.i18n && a.i18n.ko && a.i18n.ko.title) || '', description: (a.i18n && a.i18n.ko && (a.i18n.ko.excerpt || a.i18n.ko.summary)) || '' }));
  relevant.sort((a,b) => (b.publishedAt||'').localeCompare(a.publishedAt||''));
  await fs.writeFile(SEED_PATH, JSON.stringify(relevant.slice(0, 60), null, 2));
  console.log(`seed: ${Math.min(relevant.length,60)}/${relevant.length} (relevant of ${all.length})`);
}

// ===== 테마 관련성 필터: 채널 키워드(한+영)와 무관한 항목 제외 =====
const RELEVANCE = {
  CRYPTO: ['비트코인','이더리움','암호화폐','가상자산','코인','디파이','블록체인','스테이블코인','토큰','거래소','업비트','빗썸','nft','bitcoin','ethereum','crypto','blockchain','defi','btc','eth','altcoin','stablecoin','web3','token','solana','binance','coinbase','ripple','xrp','usdc','usdt'],
  ETF: ['etf','펀드','패시브','인덱스','상장지수','자산배분','자금유입','자금유출','자산운용','운용사','순자산','분배금','index fund','passive'],
  FX: ['외환','환율','달러','원화','엔화','유로','위안','원/달러','금값','원유','원자재','국제유가','귀금속','달러인덱스','wti','forex','currency','dollar','crude'],
  MACRO: ['거시경제','금리','기준금리','연준','연방준비','한국은행','인플레이션','물가','cpi','gdp','경제성장','경기','고용','실업률','경상수지','무역수지','수출','fed','inflation','recession'],
  STOCKS: ['주식','증시','코스피','코스닥','나스닥','다우','s&p','종목','실적','상장','시가총액','배당','반도체','공모주','ipo','상한가','하한가','삼성전자','sk하이닉스','stock','equity','earnings','nasdaq'],
  REALESTATE: ['부동산','아파트','청약','분양','분양가','시세','집값','재건축','재개발','전세','월세','전월세','매매','매물','입주','임대','주택','갭투자','분양권','property','housing'],
};
function isRelevant(channelId, item) {
  const kws = RELEVANCE[(channelId || '').toUpperCase()];
  if (!kws || !kws.length) return true;
  const hay = ((item.title || '') + ' ' + (item.description || '')).toLowerCase();
  return kws.some((k) => hay.includes(k.toLowerCase()));
}

async function main() {
  console.log('=== codex-cron v12 (real OG images + 11-locale + SEO) ===');
  console.log(`model: ${CODEX_MODEL || 'default'}`);
  const channel = await loadChannel();
  console.log(`channel: ${channel.name} (${channel.id})  sources: ${channel.sources.length}`);

  const seen = await loadExistingDedupKeys();
  console.log(`dedup: ${seen.size}`);

  const candidates = [];
  let skipped = 0;
  for (const src of channel.sources) {
    try {
      const items = await fetchRss(src.url);
      for (const it of items) {
        const k1 = sha1(canonicalUrl(it.link));
        const k2 = titleFp(it.title);
        const k3 = sha1((it.sourceName||'') + '|' + (it.title||'').toLowerCase());
        if (seen.has(k1) || seen.has(k2) || seen.has(k3)) continue;
        if (!isRelevant(channel.id, it)) { skipped++; continue; }
        candidates.push(it);
      }
    } catch (e) { console.warn(`RSS skip ${src.url}: ${e.message}`); }
  }
  console.log(`candidates: ${candidates.length} (off-topic skipped: ${skipped})`);

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
