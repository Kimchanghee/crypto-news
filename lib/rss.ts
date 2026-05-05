import { XMLParser } from 'fast-xml-parser';
import { createHash } from 'node:crypto';
import type { SourceItem } from './types';
import { channel } from '@/channel.config';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text'
});

const stableId = (sourceUrl: string, rawTitle: string) =>
  createHash('sha1').update(normalizeForId(sourceUrl) + '' + normalizeForId(rawTitle)).digest('hex').slice(0, 24);

function normalizeForId(s: string) {
  return s.toLowerCase().replace(/[\s\W]+/g, ' ').trim();
}

async function fetchOne(url: string): Promise<any> {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ChannelBot/1.0)' }, next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`RSS ${url} → ${res.status}`);
  const text = await res.text();
  return parser.parse(text);
}

export async function fetchAllSources(channelId: string): Promise<SourceItem[]> {
  const items: SourceItem[] = [];
  for (const src of channel.rssSources) {
    try {
      const xml = await fetchOne(src.url);
      const list = xml?.rss?.channel?.item ?? xml?.feed?.entry ?? [];
      const arr = Array.isArray(list) ? list : [list];
      for (const it of arr) {
        const link = typeof it.link === 'string' ? it.link : it.link?.['@_href'] ?? it.link?.['#text'] ?? '';
        const title = typeof it.title === 'string' ? it.title : it.title?.['#text'] ?? '';
        const pub = it.pubDate ?? it.published ?? it.updated ?? new Date().toISOString();
        if (!link || !title) continue;
        items.push({
          id: stableId(link, title),
          sourceUrl: link,
          rawTitle: title,
          publishedAt: new Date(pub).toISOString(),
          sourceName: new URL(link).hostname.replace('www.', ''),
          category: src.category,
          channelId
        });
      }
    } catch (err) {
      console.warn(`[rss] ${src.url}: ${(err as Error).message}`);
    }
  }
  return items;
}

/** Hard dedup against in-memory list + a similarity-on-title heuristic. */
export function dedupeByTitle(items: SourceItem[]): SourceItem[] {
  const seen = new Set<string>();
  const out: SourceItem[] = [];
  for (const i of items) {
    const key = normalizeForId(i.rawTitle).split(' ').slice(0, 8).join(' ');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(i);
  }
  return out;
}
