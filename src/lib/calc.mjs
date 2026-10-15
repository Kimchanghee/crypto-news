// Pure calculation helpers shared by pages, the fee-estimator island and node:test.
// Sizes follow BIP141 weight rules (vbytes = weight / 4). Per-input/output figures are the
// commonly used estimates for standard script types (signatures assumed 72-byte DER max for ECDSA,
// 64-byte Schnorr for Taproot key-path).

/** Input sizes in vbytes */
export const INPUT_VB = { p2pkh: 148, 'p2sh-p2wpkh': 91, p2wpkh: 68, p2tr: 57.5 };
/** Output sizes in vbytes */
export const OUTPUT_VB = { p2pkh: 34, p2sh: 32, p2wpkh: 31, p2wsh: 43, p2tr: 43 };

/**
 * Estimate virtual size of a transaction.
 * @param {Record<string, number>} inputs counts per input type
 * @param {Record<string, number>} outputs counts per output type
 * @returns {number} vbytes rounded up
 */
export function estimateVsize(inputs, outputs) {
  let vb = 10; // version(4) + locktime(4) + input count(1) + output count(1)
  let segwit = false;
  for (const [type, n] of Object.entries(inputs)) {
    const count = Math.max(0, Math.floor(Number(n) || 0));
    if (!count) continue;
    if (!(type in INPUT_VB)) throw new Error('Unknown input type ' + type);
    vb += INPUT_VB[type] * count;
    if (type !== 'p2pkh') segwit = true;
  }
  for (const [type, n] of Object.entries(outputs)) {
    const count = Math.max(0, Math.floor(Number(n) || 0));
    if (!count) continue;
    if (!(type in OUTPUT_VB)) throw new Error('Unknown output type ' + type);
    vb += OUTPUT_VB[type] * count;
  }
  if (segwit) vb += 0.5; // marker + flag bytes count as 2 weight units
  return Math.ceil(vb);
}

/** Fee in satoshis for a vsize at a sat/vB rate (rounded up). */
export function feeSats(vsize, satPerVb) {
  return Math.ceil(vsize * satPerVb);
}

/** Convert sats to USD at a BTC/USD price. */
export function satsToUsd(sats, btcUsd) {
  return (sats / 1e8) * btcUsd;
}

/** Ether cost of a transaction: gas units * gwei price. */
export function ethCost(gasUnits, gweiPerGas) {
  return gasUnits * gweiPerGas * 1e-9;
}

export const HALVING_INTERVAL = 210000;
export const RETARGET_INTERVAL = 2016;

/** Next halving height, blocks remaining, and subsidy before/after. */
export function halvingInfo(tipHeight) {
  const epoch = Math.floor(tipHeight / HALVING_INTERVAL);
  const nextHeight = (epoch + 1) * HALVING_INTERVAL;
  const subsidyNow = 50 / 2 ** epoch;
  return {
    epoch,
    nextHeight,
    remainingBlocks: nextHeight - tipHeight,
    subsidyNow,
    subsidyNext: subsidyNow / 2,
  };
}

/** Pending-mempool backlog expressed in 1,000,000-vB blocks. */
export function backlogBlocks(mempoolVsize) {
  return mempoolVsize / 1_000_000;
}

/** Congestion label from backlog blocks (definition documented on /methodology/). */
export function congestionLabel(blocks) {
  if (blocks < 1) return { level: 0, label: 'Calm', note: 'Backlog fits in the next block.' };
  if (blocks < 3) return { level: 1, label: 'Light swell', note: 'Backlog clears in under about 30 minutes at normal pace.' };
  if (blocks < 10) return { level: 2, label: 'Choppy', note: 'Low-fee transactions may wait a few hours.' };
  if (blocks < 30) return { level: 3, label: 'Rough', note: 'Low-fee transactions may wait most of a day.' };
  return { level: 4, label: 'Storm', note: 'Large backlog; minimum-fee transactions can wait days or be purged.' };
}

/** Typical transactions used on the daily report. */
export const TYPICAL_TX = [
  { id: 'p2wpkh-1in-2out', label: 'Native SegWit payment (1 input, 2 outputs)', vsize: estimateVsize({ p2wpkh: 1 }, { p2wpkh: 2 }) },
  { id: 'p2tr-1in-2out', label: 'Taproot payment (1 input, 2 outputs)', vsize: estimateVsize({ p2tr: 1 }, { p2tr: 2 }) },
  { id: 'p2pkh-1in-2out', label: 'Legacy payment (1 input, 2 outputs)', vsize: estimateVsize({ p2pkh: 1 }, { p2pkh: 2 }) },
  { id: 'p2wpkh-3in-2out', label: 'Native SegWit, 3 inputs consolidated', vsize: estimateVsize({ p2wpkh: 3 }, { p2wpkh: 2 }) },
];

export function fmtUsd(n) {
  if (!Number.isFinite(n)) return '—';
  if (n < 0.01) return '<$0.01';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtInt(n) {
  return Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—';
}
