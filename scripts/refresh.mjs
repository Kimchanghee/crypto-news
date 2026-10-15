// Fetches public network data into src/data/*.json.
// On any failure the previous good section is kept with its real asOf and marked stale.
// Never interpolates or invents values.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'src', 'data');
const logDir = path.join(dataDir, 'log');
const UA = 'dailycryptonews.online data refresh (contact@dailycryptonews.online)';
const ETH_RPC = 'https://ethereum-rpc.publicnode.com';

async function getJson(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { 'user-agent': UA, accept: 'application/json', ...(init.headers || {}) }, signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}
const num = (v) => { const n = Number(v); if (!Number.isFinite(n)) throw new Error('non-numeric value ' + v); return n; };

async function readJson(p, fallback) {
  try { return JSON.parse(await readFile(p, 'utf8')); } catch { return fallback; }
}

async function fetchBtc() {
  const base = 'https://mempool.space/api';
  const [fees, mempool, diff, hr, tip] = await Promise.all([
    getJson(`${base}/v1/fees/recommended`),
    getJson(`${base}/mempool`),
    getJson(`${base}/v1/difficulty-adjustment`),
    getJson(`${base}/v1/mining/hashrate/3d`),
    fetch(`${base}/blocks/tip/height`, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(12000) }).then((r) => { if (!r.ok) throw new Error('tip ' + r.status); return r.text(); }),
  ]);
  return {
    asOf: new Date().toISOString(),
    source: 'mempool.space public REST API',
    sourceUrl: 'https://mempool.space/docs/api/rest',
    tipHeight: num(tip),
    fees: { fastest: num(fees.fastestFee), halfHour: num(fees.halfHourFee), hour: num(fees.hourFee), economy: num(fees.economyFee), minimum: num(fees.minimumFee) },
    mempool: { count: num(mempool.count), vsize: num(mempool.vsize), totalFeeSat: num(mempool.total_fee) },
    difficulty: {
      progressPercent: num(diff.progressPercent),
      estimatedChangePercent: num(diff.difficultyChange),
      estimatedRetargetDate: new Date(num(diff.estimatedRetargetDate)).toISOString(),
      remainingBlocks: num(diff.remainingBlocks),
      nextRetargetHeight: num(diff.nextRetargetHeight),
      previousRetargetPercent: num(diff.previousRetarget),
      avgBlockSeconds: num(diff.timeAvg) / 1000,
    },
    hashrate: { currentEHs: num(hr.currentHashrate) / 1e18, currentDifficulty: num(hr.currentDifficulty) },
  };
}

async function fetchPrices() {
  const tick = await getJson('https://api.binance.com/api/v3/ticker/price?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22%5D');
  const m = Object.fromEntries(tick.map((t) => [t.symbol, num(t.price)]));
  if (!m.BTCUSDT || !m.ETHUSDT) throw new Error('missing symbols');
  return {
    asOf: new Date().toISOString(),
    source: 'Binance spot public market data (USDT pairs, used as a USD proxy)',
    sourceUrl: 'https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints',
    BTCUSDT: m.BTCUSDT,
    ETHUSDT: m.ETHUSDT,
  };
}

async function fetchEth() {
  const rpc = (method, params) => getJson(ETH_RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) }).then((j) => { if (j.error) throw new Error(method + ' ' + j.error.message); return j.result; });
  const fh = await rpc('eth_feeHistory', [20, 'latest', [10, 50, 90]]);
  const base = fh.baseFeePerGas.map((h) => parseInt(h, 16) / 1e9);
  const p50 = fh.reward.map((r) => parseInt(r[1], 16) / 1e9).sort((a, b) => a - b);
  const median = p50[Math.floor(p50.length / 2)];
  const oldest = parseInt(fh.oldestBlock, 16);
  return {
    asOf: new Date().toISOString(),
    source: 'Ethereum mainnet JSON-RPC eth_feeHistory (public endpoint ethereum-rpc.publicnode.com)',
    sourceUrl: 'https://ethereum.org/en/developers/docs/apis/json-rpc/',
    latestBlock: oldest + base.length - 2,
    baseFeeGwei: base[base.length - 2],
    nextBaseFeeGwei: base[base.length - 1],
    priorityP50Gwei: median,
    blocksSampled: base.length - 1,
    gasUsedRatioAvg: fh.gasUsedRatio.reduce((a, b) => a + b, 0) / fh.gasUsedRatio.length,
  };
}

async function section(name, fn, prev) {
  try {
    const v = await fn();
    console.log(`ok   ${name}`);
    return { ...v, stale: false };
  } catch (e) {
    console.warn(`FAIL ${name}: ${e.message}${prev ? ' (keeping last good snapshot from ' + prev.asOf + ')' : ' (no previous snapshot)'}`);
    return prev ? { ...prev, stale: true } : null;
  }
}

await mkdir(logDir, { recursive: true });
const latestPath = path.join(dataDir, 'latest.json');
const prev = await readJson(latestPath, {});
const [btc, prices, eth] = await Promise.all([
  section('btc', fetchBtc, prev.btc),
  section('prices', fetchPrices, prev.prices),
  section('eth', fetchEth, prev.eth),
]);
if (!btc) { console.error('No BTC network data available and no previous snapshot.'); process.exit(1); }

const asOf = [btc, prices, eth].filter(Boolean).map((s) => s.asOf).sort().at(-1);
const latest = { asOf, source: 'See per-section source fields', sourceUrl: 'https://dailycryptonews.online/methodology/', btc, prices, eth };
await writeFile(latestPath, JSON.stringify(latest, null, 2) + '\n');

// Append a compact reading to today's (UTC) log only when fresh BTC data was fetched.
if (!btc.stale) {
  const day = btc.asOf.slice(0, 10);
  const logPath = path.join(logDir, `${day}.json`);
  const log = await readJson(logPath, { date: day, asOf: btc.asOf, source: 'mempool.space, Binance, Ethereum JSON-RPC', sourceUrl: 'https://dailycryptonews.online/methodology/', readings: [] });
  const reading = {
    t: btc.asOf,
    height: btc.tipHeight,
    fees: btc.fees,
    mempoolVsize: btc.mempool.vsize,
    mempoolCount: btc.mempool.count,
    diffChange: btc.difficulty.estimatedChangePercent,
    hashrateEHs: Math.round(btc.hashrate.currentEHs * 10) / 10,
    btcUsd: prices && !prices.stale ? prices.BTCUSDT : null,
    ethUsd: prices && !prices.stale ? prices.ETHUSDT : null,
    ethBaseGwei: eth && !eth.stale ? Math.round(eth.baseFeeGwei * 1000) / 1000 : null,
  };
  if (!log.readings.some((r) => r.t === reading.t)) log.readings.push(reading);
  log.readings = log.readings.slice(-48);
  log.asOf = reading.t;
  await writeFile(logPath, JSON.stringify(log, null, 2) + '\n');
  console.log(`log  ${day} now has ${log.readings.length} reading(s)`);
}
console.log('asOf', asOf);
