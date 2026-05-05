/**
 * Vercel KV-backed persistence with two graceful fallbacks:
 *   1) seed JSON shipped in the repo (data/seed.json) — used when KV is empty
 *      so the site shows curated content from day one.
 *   2) in-memory map for `next dev` without KV credentials.
 */
import { kv } from '@vercel/kv';
import type { GeneratedArticle, SourceItem } from './types';

const HAS_KV = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;

const memArticles = new Map<string, GeneratedArticle>();
const memSeen = new Set<string>();

const KEY_ARTICLE = (id: string) => `article:${id}`;
const KEY_BY_SLUG = (slug: string) => `slug:${slug}`;
const KEY_INDEX = (channelId: string) => `index:${channelId}`;
const KEY_SEEN = (id: string) => `seen:${id}`;

/** Three-key dedup signature. */
const KEY_SEEN_KEYS = (k: string) => `seenkey:${k}`;

let _seedCache: GeneratedArticle[] | null = null;
async function loadSeeds(): Promise<GeneratedArticle[]> {
  if (_seedCache) return _seedCache;
  try {
    const mod = await import('@/data/seed.json');
    _seedCache = (mod as any).default ?? (mod as any);
  } catch {
    _seedCache = [];
  }
  return _seedCache!;
}

export const db = {
  async hasSeen(id: string): Promise<boolean> {
    if (!HAS_KV) return memSeen.has(id);
    return (await kv.get(KEY_SEEN(id))) !== null;
  },
  /** Has this dedup key (URL hash, title hash, or source+title hash) been seen? */
  async hasSeenKey(key: string): Promise<boolean> {
    if (!HAS_KV) return memSeen.has(key);
    return (await kv.get(KEY_SEEN_KEYS(key))) !== null;
  },
  async markSeen(items: SourceItem[]): Promise<void> {
    if (!HAS_KV) {
      items.forEach((i) => memSeen.add(i.id));
      return;
    }
    await Promise.all(items.map((i) => kv.set(KEY_SEEN(i.id), 1, { ex: 60 * 60 * 24 * 60 })));
  },
  async markSeenKeys(keys: string[]): Promise<void> {
    if (!HAS_KV) {
      keys.forEach((k) => memSeen.add(k));
      return;
    }
    await Promise.all(keys.map((k) => kv.set(KEY_SEEN_KEYS(k), 1, { ex: 60 * 60 * 24 * 60 })));
  },
  async putArticle(a: GeneratedArticle): Promise<void> {
    if (!HAS_KV) {
      memArticles.set(a.id, a);
      return;
    }
    await kv.set(KEY_ARTICLE(a.id), a);
    await kv.set(KEY_BY_SLUG(a.slug), a.id);
    await kv.lpush(KEY_INDEX(a.channelId), a.id);
    await kv.ltrim(KEY_INDEX(a.channelId), 0, 4999);
  },
  async getBySlug(slug: string): Promise<GeneratedArticle | null> {
    if (!HAS_KV) {
      const mem = Array.from(memArticles.values()).find((a) => a.slug === slug);
      if (mem) return mem;
      const seeds = await loadSeeds();
      return seeds.find((a) => a.slug === slug) ?? null;
    }
    const id = await kv.get<string>(KEY_BY_SLUG(slug));
    if (id) {
      const a = await kv.get<GeneratedArticle>(KEY_ARTICLE(id));
      if (a) return a;
    }
    // KV miss → try seeds
    const seeds = await loadSeeds();
    return seeds.find((a) => a.slug === slug) ?? null;
  },
  async listLatest(channelId: string, limit = 30): Promise<GeneratedArticle[]> {
    let arts: GeneratedArticle[] = [];
    if (HAS_KV) {
      const ids = await kv.lrange<string>(KEY_INDEX(channelId), 0, limit - 1);
      if (ids?.length) {
        const fetched = await Promise.all(ids.map((id) => kv.get<GeneratedArticle>(KEY_ARTICLE(id))));
        arts = fetched.filter(Boolean) as GeneratedArticle[];
      }
    } else {
      arts = Array.from(memArticles.values())
        .filter((a) => a.channelId === channelId)
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    }
    if (arts.length < limit) {
      // Augment with seeds (avoid duplicate ids)
      const seen = new Set(arts.map((a) => a.id));
      const seeds = await loadSeeds();
      const seedExtra = seeds.filter((a) => a.channelId === channelId && !seen.has(a.id));
      arts = arts.concat(seedExtra)
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
        .slice(0, limit);
    }
    return arts;
  },
  async listByCategory(channelId: string, category: string, limit = 30): Promise<GeneratedArticle[]> {
    const all = await db.listLatest(channelId, 200);
    return all.filter((a) => a.category === category).slice(0, limit);
  }
};
