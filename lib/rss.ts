import { XMLParser } from 'fast-xml-parser';
import { createHash } from 'node:crypto';
import type { SourceItem } from './types';
import { channel } from '@/channel.config';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text'
});

/** Strip tracking params, fragments, normalize host & path. */
export function canonicalUrl(input: string): string {
  try {
    const u = new URL(input);
    // Drop fragments and noisy params
    u.hash = '';
    const drop = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid','gclid','ref','ref_src','source','from'];
    drop.forEach((p) => u.searchParams.delete(p));
    // Normalize host (lowercase, drop www.)
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
    // Trailing slash off (except root)
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) u.pathname = u.pathname.slice(0, -1);
    // Sort remaining params for determinism
    const params = Array.from(u.searchParams.entries()).sort(([a],[b]) => a.localeCompare(b));
    u.search = '';
    params.forEach(([k,v]) => u.searchParams.append(k,v));
    return u.toString();
  } catch {
    return input.trim().toLowerCase();
  }
}

/** Lowercase, strip punctuation, normalize whitespace, sort tokens. Cheap fuzzy match. */
export function titleFingerprint(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[ -⁯⸀-⹿]/g, ' ')   // unicode punctuation
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')              // non-letter/number → space
    .split(/\s+/).filter(Boolean).sort().join(' ');
}

const sha = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 16);

/** Three independent keys; if ANY matches a previous item → it's a duplicate. */
export function dedupKeys(item: { sourceUrl: string; rawTitle: string; sourceName?: string }): string[] {
  const cu = canonicalUrl(item.sourceUrl);
  const tf = titleFingerprint(item.rawTitle);
  return [
    'u:' + sha(cu),
    't:' + sha(tf),
    'st:' + sha((item.sourceName ?? '') + '|' + tf.split(' ').slice(0, 8).join(' '))
  ];
}

const stableId = (sourceUrl: string, rawTitle: string) =>
  sha(canonicalUrl(sourceUrl) + '|' + titleFingerprint(rawTitle)).slice(0, 24);

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
          sourceName: new URL(link).hostname.replace(/^www\./, ''),
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

/** Hard 3-key dedup. ANY key collision = drop. */
export function dedupeByTitle(items: SourceItem[]): SourceItem[] {
  const seen = new Set<string>();
  const out: SourceItem[] = [];
  for (const i of items) {
    const keys = dedupKeys(i);
    if (keys.some((k) => seen.has(k))) continue;
    keys.forEach((k) => seen.add(k));
    out.push(i);
  }
  return out;
}
