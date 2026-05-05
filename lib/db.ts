/**
 * Vercel KV-backed persistence with a graceful in-memory fallback (for `next dev`
 * without KV credentials). Replace with Postgres/Supabase later if scale demands.
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

export const db = {
  async hasSeen(id: string): Promise<boolean> {
    if (!HAS_KV) return memSeen.has(id);
    return (await kv.get(KEY_SEEN(id))) !== null;
  },
  async markSeen(items: SourceItem[]): Promise<void> {
    if (!HAS_KV) {
      items.forEach((i) => memSeen.add(i.id));
      return;
    }
    await Promise.all(items.map((i) => kv.set(KEY_SEEN(i.id), 1, { ex: 60 * 60 * 24 * 30 })));
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
      return Array.from(memArticles.values()).find((a) => a.slug === slug) ?? null;
    }
    const id = await kv.get<string>(KEY_BY_SLUG(slug));
    return id ? await kv.get<GeneratedArticle>(KEY_ARTICLE(id)) : null;
  },
  async listLatest(channelId: string, limit = 30): Promise<GeneratedArticle[]> {
    if (!HAS_KV) {
      return Array.from(memArticles.values())
        .filter((a) => a.channelId === channelId)
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
        .slice(0, limit);
    }
    const ids = await kv.lrange<string>(KEY_INDEX(channelId), 0, limit - 1);
    if (!ids?.length) return [];
    const arts = await Promise.all(ids.map((id) => kv.get<GeneratedArticle>(KEY_ARTICLE(id))));
    return arts.filter(Boolean) as GeneratedArticle[];
  },
  async listByCategory(channelId: string, category: string, limit = 30): Promise<GeneratedArticle[]> {
    const all = await db.listLatest(channelId, 200);
    return all.filter((a) => a.category === category).slice(0, limit);
  }
};
