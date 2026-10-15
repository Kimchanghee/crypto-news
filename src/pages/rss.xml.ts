import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const GET: APIRoute = async () => {
  const guides = (await getCollection('guides')).sort((a, b) => b.data.updated.localeCompare(a.data.updated));
  const items = guides
    .map((g) => `    <item>\n      <title>${esc(g.data.h1)}</title>\n      <link>https://dailycryptonews.online/guides/${g.id}/</link>\n      <guid isPermaLink="true">https://dailycryptonews.online/guides/${g.id}/</guid>\n      <pubDate>${new Date(g.data.published + 'T00:00:00Z').toUTCString()}</pubDate>\n      <description>${esc(g.data.answer)}</description>\n    </item>`)
    .join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n    <title>Daily Crypto News guides</title>\n    <link>https://dailycryptonews.online/guides/</link>\n    <atom:link href="https://dailycryptonews.online/rss.xml" rel="self" type="application/rss+xml"/>\n    <description>Plain-English guides to Bitcoin and Ethereum network data.</description>\n    <language>en</language>\n    <lastBuildDate>${new Date(guides[0].data.updated + 'T00:00:00Z').toUTCString()}</lastBuildDate>\n${items}\n  </channel>\n</rss>\n`;
  return new Response(body, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
};
