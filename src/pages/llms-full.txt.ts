import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '../site.config';
import { latest } from '../lib/data';

// Full-text companion to /llms.txt: the latest recorded reading plus every guide body, generated from the same sources the pages render.
export const GET: APIRoute = async () => {
  const guides = (await getCollection('guides')).sort((a, b) => a.id.localeCompare(b.id));
  const b = latest.btc;
  const guideText = guides
    .map((g) => `## ${g.data.h1}\nURL: ${site.url}/guides/${g.id}/\nUpdated: ${g.data.updated}\nData as of: ${g.data.data_asof}\n\nQuestion: ${g.data.question}\nAnswer: ${g.data.answer}\n\n${(g.body ?? '').trim()}\n\nSources: ${g.data.sources.map((s) => s.url).join(', ')}`)
    .join('\n\n');
  const body = `# ${site.name} — full text\n\n> ${site.entity}\n\n# Latest recorded reading\n\nRecorded: ${b.asOf} (UTC). Block ${b.tipHeight}. Next-block fee ${b.fees.fastest} sat/vB. Mempool ${b.mempool.vsize} vB pending. Sources: mempool.space REST API, Binance public market data, Ethereum JSON-RPC eth_feeHistory. Method: ${site.url}/methodology/\nNot financial, tax or legal advice.\n\n# Guides\n\n${guideText}\n`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};