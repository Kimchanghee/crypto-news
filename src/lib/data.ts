import latestJson from '../data/latest.json';
import { TYPICAL_TX, feeSats, satsToUsd, ethCost, backlogBlocks, congestionLabel, halvingInfo } from './calc.mjs';

export const latest = latestJson as any;

export interface Reading {
  t: string; height: number;
  fees: { fastest: number; halfHour: number; hour: number; economy: number; minimum: number };
  mempoolVsize: number; mempoolCount: number; diffChange: number; hashrateEHs: number;
  btcUsd: number | null; ethUsd: number | null; ethBaseGwei: number | null;
}
export interface DayLog { date: string; asOf: string; readings: Reading[] }

const logModules = import.meta.glob('../data/log/*.json', { eager: true, import: 'default' });
export const days: DayLog[] = Object.values(logModules as Record<string, DayLog>).sort((a, b) => b.date.localeCompare(a.date));

export function fmtUtc(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) + ' UTC';
}
export function fmtDay(isoDay: string): string {
  return new Date(isoDay + 'T00:00:00Z').toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
export function ageHours(iso: string, now = Date.now()): number {
  return (now - new Date(iso).getTime()) / 3.6e6;
}

export const TIERS = [
  { key: 'fastest', label: 'Next block', note: 'aims for the next ~10 minutes' },
  { key: 'halfHour', label: 'Within ~30 min', note: 'about three blocks' },
  { key: 'hour', label: 'Within ~1 hour', note: 'about six blocks' },
  { key: 'economy', label: 'Economy', note: 'no time target' },
  { key: 'minimum', label: 'Minimum relay', note: 'may wait a long time' },
] as const;

/** Everything the daily report needs, computed once from the snapshot. */
export function report() {
  const b = latest.btc;
  const price = latest.prices?.BTCUSDT ?? null;
  const ethPrice = latest.prices?.ETHUSDT ?? null;
  const rows = TIERS.map((t) => {
    const rate = b.fees[t.key] as number;
    return {
      ...t,
      rate,
      costs: TYPICAL_TX.slice(0, 3).map((tx) => {
        const sats = feeSats(tx.vsize, rate);
        return { sats, usd: price ? satsToUsd(sats, price) : null };
      }),
    };
  });
  const backlog = backlogBlocks(b.mempool.vsize);
  const sea = congestionLabel(backlog);
  const halving = halvingInfo(b.tipHeight);
  const halvingEta = new Date(new Date(b.asOf).getTime() + halving.remainingBlocks * 600_000);
  const eth = latest.eth;
  const ethGwei = eth ? eth.baseFeeGwei + eth.priorityP50Gwei : null;
  const ethTransferEth = ethGwei != null ? ethCost(21000, ethGwei) : null;
  const ethTransferUsd = ethTransferEth != null && ethPrice ? ethTransferEth * ethPrice : null;
  const segwitNext = rows[0].costs[0];
  return { b, price, ethPrice, rows, backlog, sea, halving, halvingEta, eth, ethGwei, ethTransferEth, ethTransferUsd, segwitNext, txs: TYPICAL_TX.slice(0, 3) };
}
