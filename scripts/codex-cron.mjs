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
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36';

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
    if (!rssImg) {
      // <description> 안에 <img src="..."> 있을 때
      const desc = pick('description');
      const img = desc.match(/<img[^>]*src=["']([^"']+\.(?:jpe?g|png|webp|gif)[^"']*)["'][^>]*>/i);
      if (img) rssImg = img[1];
    }
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
  const args = ['exec','--json','--sandbox', sandbox,'--skip-git-repo-check','--ignore-rules', prompt];
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
  return [
    `당신은 다국어 ${channel.name} 뉴스 에디터입니다. SEO/AEO/GEO에 최적화된 뉴스 기사 1개를 11개 언어로 작성하세요.`,
    ``,
    `=== 원문 ===`,
    `제목: ${item.title.slice(0, 250)}`,
    `요약: ${item.description.slice(0, 600)}`,
    `출처: ${item.sourceName}`,
    ``,
    `=== 작성 규칙 ===`,
    `1. title: 50-80자, 핵심 키워드 앞쪽 배치, 클릭률 높은 톤, 과장·낚시 금지`,
    `2. excerpt: 150-200자, meta description용. 누가/무엇을/언제/왜를 한 줄로 압축`,
    `3. body: 400-700자. 뉴스 구조: 리드(5W1H) → 배경/맥락/관련 수치 → 영향/전망 → 출처: ${item.sourceName} 인용`,
    `4. 사실 그대로(원문 정보만 사용), 추측·과장 금지`,
    `5. 11개 언어 모두 동일 사실, 자연스러운 현지어 어순`,
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

  // Step 1: fetch real image (RSS image OR original article OG image)
  console.log(`[img] start ${id}`);
  const imageUrl = await fetchAndSaveImage(item, id);

  // Step 2: 11-language translation via codex
  const tPrompt = buildTranslationPrompt(channel, item);
  console.log(`[translate] start: ${item.title.slice(0,60)}...`);
  const stdout = await runCodex(tPrompt, { sandbox: 'read-only', timeoutMs: 240_000 });
  const data = parseJson(stdout);

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
    category: (channel.id || '').toLowerCase(),
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
    imageUrl: imageUrl || '',
    i18n,
  };

  await fs.mkdir(ART_DIR, { recursive: true });
  await fs.writeFile(path.join(ART_DIR, `${id}.json`), JSON.stringify(article, null, 2));
  console.log(`[OK] ${id}.json — locales=${Object.keys(i18n).length}/${LOCALES.length} img=${!!imageUrl}`);
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
  console.log('=== codex-cron v12 (real OG images + 11-locale + SEO) ===');
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
