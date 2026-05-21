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

async function readLatestArticleSlug() {
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
        latest = { slug, score, file };
      }
    } catch {
      // ignore malformed article file
    }
  }

  if (!latest) {
    throw new Error(`No valid articles found in ${ARTICLES_DIR}`);
  }

  log(`Latest article from ${latest.file} -> slug=${latest.slug}`);
  return latest.slug;
}

async function fetchText(pathname) {
  const url = new URL(pathname, BASE_URL).toString();
  const timeoutSec = String(Math.ceil(REQUEST_TIMEOUT_MS / 1000));
  const marker = '__CODE__';
  const args = [
    '--noproxy', '*',
    '-sS',
    '-L',
    '--max-time', timeoutSec,
    '-w', `\n${marker}%{http_code}`,
    url
  ];

  try {
    const { stdout } = await execFileAsync('curl', args, { maxBuffer: 10 * 1024 * 1024 });
    const idx = stdout.lastIndexOf(`\n${marker}`);
    if (idx === -1) {
      throw new Error(`Could not parse curl status marker for ${url}`);
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

async function waitForServerReady() {
  const deadline = Date.now() + START_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const probe = await fetchText('/ko');
      if (probe.status === 200) {
        log('Server is ready');
        return;
      }
    } catch {
      // retry
    }

    await sleep(2000);
  }

  throw new Error(`Server did not become ready within ${START_TIMEOUT_MS}ms`);
}

async function run() {
  const latestSlug = await readLatestArticleSlug();
  const encodedSlug = encodeURIComponent(latestSlug);

  const checks = [
    { path: '/ko', expectedStatus: [200], markers: ['<html'] },
    { path: '/en', expectedStatus: [200], markers: ['<html'] },
    { path: '/robots.txt', expectedStatus: [200], markers: ['Sitemap:', '/sitemap.xml'] },
    { path: '/sitemap.xml', expectedStatus: [200], markers: ['<urlset', 'xhtml:link'] },
    { path: '/news-sitemap.xml', expectedStatus: [200], markers: ['<news:news', '<news:title>'] },
    { path: '/llms.txt', expectedStatus: [200], markers: ['http'] },
    {
      path: `/ko/article/${encodedSlug}`,
      expectedStatus: [200],
      markers: ['application/ld+json', 'NewsArticle']
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
    await waitForServerReady();

    for (const check of checks) {
      const res = await fetchText(check.path);
      assertStatus(check.path, res.status, check.expectedStatus);
      assertIncludes(check.path, res.text, check.markers);
      log(`PASS ${check.path} (${res.status})`);
    }

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
