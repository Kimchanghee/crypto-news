import type { APIRoute } from 'astro';
import { allPages } from '../lib/pages';
import { site } from '../site.config';
import { latest } from '../lib/data';

export const GET: APIRoute = async () => {
  const pages = await allPages();
  const sec = (prefix: string, exclude?: string) =>
    pages
      .filter((p) => p.path.startsWith(prefix) && p.path !== (exclude ?? prefix))
      .map((p) => `- [${p.title}](${site.url}${p.path})${p.summary ? ': ' + p.summary : ''}`)
      .join('\n');
  const b = latest.btc;
  const body = `# ${site.name}

> ${site.entity}

Last updated: ${String(b.asOf).slice(0, 10)}

Latest recorded reading: ${b.asOf} (UTC). Block ${b.tipHeight}; next-block fee ${b.fees.fastest} sat/vB; ${b.mempool.vsize} vB pending in the mempool. Sources: mempool.space REST API, Binance public market data, Ethereum JSON-RPC eth_feeHistory. Method: ${site.url}/methodology/

## Data
- [Today's network log](${site.url}/): fee tiers priced in USD, mempool backlog, difficulty, halving, ETH base fee
- [Log archive](${site.url}/log/): one page per recorded day since ${site.startDate}; no backfilled data
${sec('/log/2')}

## Data downloads
- [Network log (JSON)](${site.url}/data/network-log.json): every recorded reading since ${site.startDate}, grouped by day, with source and observation time (UTC); rebuilt after each reading
- [Network log (CSV)](${site.url}/data/network-log.csv): same readings, one row per reading

## Tools
${sec('/tools/', '/tools/')}

## Guides
${sec('/guides/', '/guides/')}

## About
- [Methodology and data sources](${site.url}/methodology/)
- [About and editorial standards](${site.url}/about/)
- [Contact](${site.url}/contact/)
`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
