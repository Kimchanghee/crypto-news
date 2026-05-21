#!/usr/bin/env node
import { execFile, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const HOST = process.env.E2E_HOST || '127.0.0.1';
const PORT = Number(process.env.E2E_PORT || 3100);
const BASE_URL = `http://${HOST}:${PORT}`;
const START_TIMEOUT_MS = Number(process.env.E2E_START_TIMEOUT_MS || 120000);
const REQUEST_TIMEOUT_MS = Number(process.env.E2E_REQUEST_TIMEOUT_MS || 20000);
const READY_LOG_EVERY = Number(process.env.E2E_READY_LOG_EVERY || 5);
const ARTICLES_DIR = path.join(process.cwd(), 'data', 'articles');
const LOCAL_NO_PROXY = '127.0.0.1,localhost,::1';
const execFileAsync = promisify(execFile);

function sanitizeProxyEnv() {
  const proxyKeys = [
    'HTTP_PROXY',
    'HTTPS_PROXY',
    'ALL_PROXY',
    'http_proxy',
    'https_proxy',
    'all_proxy'
  ];
  for (const key of proxyKeys) delete process.env[key];
  process.env.NO_PROXY = LOCAL_NO_PROXY;
  process.env.no_proxy = LOCAL_NO_PROXY;
}

sanitizeProxyEnv();

function log(message) {
  console.log(`[e2e-smoke] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tail(text, maxLen = 4000) {
  if (!text) return '';
  return text.length <= maxLen ? text : text.slice(text.length - maxLen);
}

async function readLatestArticle() {
  const files = await fs.readdir(ARTICLES_DIR);
  let latest = null;

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    try {
      const fullPath = path.join(ARTICLES_DIR, file);
      const raw = await fs.readFile(fullPath, 'utf8');
      const item = JSON.parse(raw);
      if (!item || typeof item !== 'object') continue;

      const slug = typeof item.slug === 'string' && item.slug.trim().length > 0
        ? item.slug.trim()
        : typeof item.id === 'string'
          ? item.id
          : null;
      if (!slug) continue;

      const ts = Date.parse(item.publishedAt || item.updatedAt || '');
      const score = Number.isFinite(ts) ? ts : 0;

      if (!latest || score > latest.score) {
        latest = { slug, score, file, item };
      }
    } catch {
      // ignore malformed article file
    }
  }

  if (!latest) {
    throw new Error(`No valid articles found in ${ARTICLES_DIR}`);
  }

  log(`Latest article from ${latest.file} -> slug=${latest.slug}`);
  return latest;
}

async function fetchText(pathname) {
  const url = new URL(pathname, BASE_URL).toString();
  const timeoutSec = String(Math.ceil(REQUEST_TIMEOUT_MS / 1000));
  const marker = '__CODE__';
  const args = [
    '--proxy', '',
    '--noproxy', '*',
    '--ipv4',
    '-sS',
    '-L',
    '--connect-timeout', '5',
    '--max-time', timeoutSec,
    '-w', `\n${marker}%{http_code}`,
    url
  ];

  try {
    const { stdout, stderr } = await execFileAsync('curl', args, { maxBuffer: 10 * 1024 * 1024 });
    const idx = stdout.lastIndexOf(`\n${marker}`);
    if (idx === -1) {
      throw new Error(`Could not parse curl status marker for ${url}; stderr=${tail(stderr || '', 300)}`);
    }
    const text = stdout.slice(0, idx);
    const status = Number(stdout.slice(idx + marker.length + 1).trim());
    if (!Number.isFinite(status)) {
      throw new Error(`Invalid HTTP status from curl for ${url}`);
    }
    return { url, status, text };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`curl request failed for ${url}: ${detail}`);
  }
}

function assertStatus(pathname, status, expected) {
  if (!expected.includes(status)) {
    throw new Error(`Unexpected status for ${pathname}: got ${status}, expected one of [${expected.join(', ')}]`);
  }
}

function assertIncludes(pathname, text, needles) {
  for (const needle of needles) {
    if (!text.includes(needle)) {
      const preview = tail(text.replace(/\s+/g, ' '), 500);
      throw new Error(`Missing marker in ${pathname}: ${needle}\nResponse tail: ${preview}`);
    }
  }
}

function assertArticleQuality(article) {
  const item = article?.item ?? {};
  const ko = item?.i18n?.ko ?? {};
  const body = typeof ko.body === 'string' ? ko.body.trim() : '';
  const keywordCount = Array.isArray(ko.keywords) ? ko.keywords.length : 0;
  const faqCount = Array.isArray(ko.faq) ? ko.faq.length : 0;

  if (!body) {
    throw new Error('Latest article is missing i18n.ko.body');
  }
  if (body.length < 1000 || body.length > 1200) {
    throw new Error(`Latest article body length out of range: ${body.length} (expected 1000-1200)`);
  }
  if (!item.sourceName || !item.sourceUrl) {
    throw new Error('Latest article is missing source attribution (sourceName/sourceUrl)');
  }
  if (keywordCount < 3) {
    throw new Error(`Latest article has too few keywords: ${keywordCount} (expected >= 3)`);
  }
  if (faqCount < 2) {
    throw new Error(`Latest article has too few FAQ entries: ${faqCount} (expected >= 2)`);
  }
}

async function waitForServerReady(isServerExited) {
  const deadline = Date.now() + START_TIMEOUT_MS;
  let attempts = 0;
  let lastError = '';

  while (Date.now() < deadline) {
    attempts += 1;
    if (isServerExited()) {
      throw new Error('Next server exited before readiness checks completed');
    }
    try {
      const probe = await fetchText('/robots.txt');
      if (probe.status === 200) {
        log(`Server is ready after ${attempts} probe(s)`);
        return;
      }
      lastError = `HTTP ${probe.status} for /robots.txt`;
      if (attempts % READY_LOG_EVERY === 0) {
        log(`Waiting for readiness (attempt ${attempts}): ${lastError}`);
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'unknown request error';
      if (attempts % READY_LOG_EVERY === 0) {
        log(`Waiting for readiness (attempt ${attempts}): ${lastError}`);
      }
    }

    await sleep(2000);
  }

  throw new Error(`Server did not become ready within ${START_TIMEOUT_MS}ms. Last probe result: ${lastError || 'n/a'}`);
}

async function run() {
  const latestArticle = await readLatestArticle();
  const latestSlug = latestArticle.slug;

  const checks = [
    { path: '/robots.txt', expectedStatus: [200], markers: ['Sitemap:', '/sitemap.xml'] },
    { path: '/sitemap.xml', expectedStatus: [200], markers: ['<urlset', '<loc>'] },
    { path: '/news-sitemap.xml', expectedStatus: [200], markers: ['<news:news', '<news:title>'] },
    { path: '/llms.txt', expectedStatus: [200], markers: ['Sitemap:', 'http'] },
    {
      path: '/api/news/feed',
      expectedStatus: [200],
      markers: ['"items"', '"slug"', '"publishedAt"']
    }
  ];

  const nextCliPath = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');
  if (!existsSync(nextCliPath)) {
    throw new Error(`Next CLI not found at ${nextCliPath}. Install dependencies before running e2e:smoke.`);
  }

  let serverOutput = '';
  const startArgs = [nextCliPath, 'start', '-p', String(PORT), '-H', HOST];
  log(`Starting server: ${process.execPath} ${startArgs.join(' ')}`);
  const server = spawn(process.execPath, startArgs, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      NO_PROXY: LOCAL_NO_PROXY,
      no_proxy: LOCAL_NO_PROXY,
      HTTP_PROXY: '',
      HTTPS_PROXY: '',
      ALL_PROXY: '',
      http_proxy: '',
      https_proxy: '',
      all_proxy: ''
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const capture = (chunk) => {
    const text = chunk.toString();
    serverOutput += text;
    if (serverOutput.length > 16000) serverOutput = serverOutput.slice(-16000);
    process.stdout.write(text);
  };

  server.stdout.on('data', capture);
  server.stderr.on('data', capture);
  let serverExited = false;
  server.on('exit', (code, signal) => {
    serverExited = true;
    log(`Next server exited (code=${String(code)}, signal=${String(signal)})`);
  });

  const shutdown = () => {
    if (!server.killed) {
      server.kill('SIGTERM');
    }
  };

  process.on('SIGINT', () => {
    shutdown();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    shutdown();
    process.exit(143);
  });

  try {
    await waitForServerReady(() => serverExited);

    for (const check of checks) {
      const res = await fetchText(check.path);
      assertStatus(check.path, res.status, check.expectedStatus);
      assertIncludes(check.path, res.text, check.markers);
      log(`PASS ${check.path} (${res.status})`);
    }

    assertArticleQuality(latestArticle);
    log(`PASS latest article quality (slug=${latestSlug})`);

    log('All smoke checks passed');
  } catch (error) {
    log('Smoke test failed');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('--- next server output (tail) ---');
    console.error(tail(serverOutput));
    process.exitCode = 1;
  } finally {
    shutdown();
    await Promise.race([
      new Promise((resolve) => server.once('exit', resolve)),
      sleep(5000)
    ]);
  }

  if (process.exitCode && process.exitCode !== 0) {
    process.exit(process.exitCode);
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
