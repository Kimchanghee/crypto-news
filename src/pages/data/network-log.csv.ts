import type { APIRoute } from 'astro';
import { days } from '../../lib/data';

// Flat CSV of every recorded reading (one row per reading). t_utc is the observation time; source is the day's recorded source string.
const cols = ['date', 't_utc', 'height', 'fee_fastest', 'fee_half_hour', 'fee_hour', 'fee_economy', 'fee_minimum', 'mempool_vsize', 'mempool_count', 'diff_change_pct', 'hashrate_ehs', 'btc_usd', 'eth_usd', 'eth_base_gwei', 'source'];
const cell = (v: unknown) => { if (v === null || v === undefined) return ''; const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export const GET: APIRoute = () => {
  const rows = [...days].sort((a, b) => a.date.localeCompare(b.date)).flatMap((d: any) => d.readings.map((r: any) => [d.date, r.t, r.height, r.fees.fastest, r.fees.halfHour, r.fees.hour, r.fees.economy, r.fees.minimum, r.mempoolVsize, r.mempoolCount, r.diffChange, r.hashrateEHs, r.btcUsd, r.ethUsd, r.ethBaseGwei, d.source].map(cell).join(',')));
  return new Response([cols.join(','), ...rows].join('\n') + '\n', { headers: { 'content-type': 'text/csv; charset=utf-8' } });
};
