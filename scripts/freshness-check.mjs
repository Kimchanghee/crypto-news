#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ARTICLES_DIR = path.join(ROOT, 'data', 'articles');
const WINDOW_HOURS = Number(process.env.FRESH_WINDOW_HOURS || '48');
const STALE_HOURS = Number(process.env.STALE_HOURS || '36');
const MIN_FRESH_ARTICLES = Number(process.env.MIN_FRESH_ARTICLES_48H || '1');
const FAIL_ON_STALE = process.env.FAIL_ON_STALE !== '0';
const WRITE_REPORT = process.env.WRITE_FRESHNESS_REPORT === '1';

function fmtIso(d) {
  try { return new Date(d).toISOString(); } catch { return ''; }
}

async function loadArticles() {
  const files = (await fs.readdir(ARTICLES_DIR)).filter((f) => f.endsWith('.json'));
  const out = [];
  for (const f of files) {
    try {
      const obj = JSON.parse(await fs.readFile(path.join(ARTICLES_DIR, f), 'utf8'));
      out.push(obj);
    } catch {}
  }
  return out;
}

async function writeReport(lines) {
  if (!WRITE_REPORT) return;
  const reportDir = path.join(ROOT, 'reports');
  await fs.mkdir(reportDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const file = path.join(reportDir, `freshness-${stamp}.md`);
  await fs.writeFile(file, lines.join('\n') + '\n');
}

async function main() {
  const now = Date.now();
  const windowMs = WINDOW_HOURS * 60 * 60 * 1000;
  const staleMs = STALE_HOURS * 60 * 60 * 1000;
  const articles = await loadArticles();

  if (!articles.length) {
    const msg = '[freshness] no articles found in data/articles';
    console.error(msg);
    console.error('::error::No articles found. Content pipeline may be broken.');
    if (FAIL_ON_STALE) process.exit(2);
    return;
  }

  const times = articles
    .map((a) => new Date(a.publishedAt).getTime())
    .filter((v) => Number.isFinite(v));
  if (!times.length) {
    console.error('[freshness] all publishedAt values invalid');
    console.error('::error::All publishedAt values are invalid.');
    if (FAIL_ON_STALE) process.exit(2);
    return;
  }

  const latestTs = Math.max(...times);
  const latestIso = fmtIso(latestTs);
  const ageHours = (now - latestTs) / (1000 * 60 * 60);
  const freshCount = times.filter((t) => now - t <= windowMs).length;

  const staleByLatest = now - latestTs > staleMs;
  const staleByVolume = freshCount < MIN_FRESH_ARTICLES;
  const stale = staleByLatest || staleByVolume;
  const status = stale ? 'STALE' : 'OK';

  const lines = [
    '# Freshness Check',
    `- Status: ${status}`,
    `- Checked At (UTC): ${new Date(now).toISOString()}`,
    `- Latest Article: ${latestIso}`,
    `- Latest Age Hours: ${ageHours.toFixed(2)}`,
    `- Fresh Window Hours: ${WINDOW_HOURS}`,
    `- Fresh Count in Window: ${freshCount}`,
    `- Minimum Fresh Count Required: ${MIN_FRESH_ARTICLES}`,
    `- Stale Threshold Hours: ${STALE_HOURS}`,
  ];
  await writeReport(lines);

  for (const line of lines) console.log(`[freshness] ${line.replace(/^- /, '')}`);

  if (stale) {
    const reason = [
      staleByLatest ? `latest article older than ${STALE_HOURS}h` : null,
      staleByVolume ? `fresh articles (${freshCount}) below min ${MIN_FRESH_ARTICLES} in ${WINDOW_HOURS}h` : null,
    ].filter(Boolean).join(' + ');
    console.error(`::error::Freshness stale: ${reason}`);
    if (FAIL_ON_STALE) process.exit(2);
  }
}

main().catch((e) => {
  console.error('::error::freshness-check failed:', e?.message || e);
  process.exit(2);
});
