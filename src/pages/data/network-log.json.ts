import type { APIRoute } from 'astro';
import { site } from '../../site.config';
import { days } from '../../lib/data';

// Machine-readable copy of the recorded daily network log. Built from src/data/log/*.json only; readings are copied verbatim (t = observation time, UTC).
export const GET: APIRoute = () => {
  const asc = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const body = {
    name: `${site.name} Bitcoin and Ethereum network log`,
    url: `${site.url}/data/network-log.json`,
    csv: `${site.url}/data/network-log.csv`,
    methodology: `${site.url}/methodology/`,
    description: 'Recorded readings only: no backfilled or estimated values. Missing days or readings mean the source was unreachable. Not investment advice.',
    timeZone: 'UTC',
    lastObservation: asc.at(-1)?.asOf ?? null,
    units: { fees: 'sat/vB', mempoolVsize: 'vB', diffChange: 'percent (estimated change at next retarget)', hashrateEHs: 'EH/s', btcUsd: 'USD (Binance BTCUSDT spot)', ethUsd: 'USD (Binance ETHUSDT spot)', ethBaseGwei: 'gwei' },
    days: asc.map((d: any) => ({ date: d.date, asOf: d.asOf, source: d.source, sourceUrl: d.sourceUrl, readings: d.readings })),
  };
  return new Response(JSON.stringify(body, null, 2) + '\n', { headers: { 'content-type': 'application/json; charset=utf-8' } });
};
