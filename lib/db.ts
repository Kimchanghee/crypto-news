/**
 * Filesystem-backed persistence — source of truth is git-tracked data/seed.json.
 * codex-cron writes new articles to data/articles/{id}.json then rebuilds seed.json.
 * This module reads seed.json (bundled at build time by Next.js JSON import).
 */
import type { GeneratedArticle } from './types';

let _cache: GeneratedArticle[] | null = null;

async function loadAll(): Promise<GeneratedArticle[]> {
  if (_cache) return _cache;
  try {
    const mod = await import('@/data/seed.json');
    const data = (mod as any).default ?? (mod as any);
    _cache = Array.isArray(data) ? data : [];
  } catch {
    _cache = [];
  }
  return _cache!;
}

export const db = {
  async hasSeen(_id: string): Promise<boolean> { return false; },
  async markSeen(_items: any[]): Promise<void> {},
  async putArticle(_a: GeneratedArticle): Promise<void> {},

  async getBySlug(slug: string): Promise<GeneratedArticle | null> {
    const all = await loadAll();
    // Try exact match first
    let hit = all.find((a) => a.slug === slug);
    if (hit) return hit;
    // Try URL-decoded match (Next.js may pass percent-encoded)
    try {
      const decoded = decodeURIComponent(slug);
      hit = all.find((a) => a.slug === decoded);
      if (hit) return hit;
    } catch {}
    // Try matching by id suffix (slug ends with -{6digits})
    const m = slug.match(/-(\d{6})$/);
    if (m) {
      hit = all.find((a) => a.slug?.endsWith(`-${m[1]}`));
      if (hit) return hit;
    }
    // Try matching by article id (12 hex chars)
    if (/^[a-f0-9]{12}$/i.test(slug)) {
      hit = all.find((a) => a.id === slug);
      if (hit) return hit;
    }
    return null;
  },

  async getById(id: string): Promise<GeneratedArticle | null> {
    const all = await loadAll();
    return all.find((a) => a.id === id) ?? null;
  },

  async listLatest(channelId: string, limit = 30): Promise<GeneratedArticle[]> {
    const all = await loadAll();
    return all
      .filter((a) => !channelId || a.channelId === channelId)
      .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
      .slice(0, limit);
  },

  async listByCategory(channelId: string, category: string, limit = 30): Promise<GeneratedArticle[]> {
    const all = await loadAll();
    return all
      .filter((a) => (!channelId || a.channelId === channelId) && a.category === category)
      .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
      .slice(0, limit);
  },

  async listAll(limit = 200): Promise<GeneratedArticle[]> {
    const all = await loadAll();
    return all
      .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
      .slice(0, limit);
  }
};
