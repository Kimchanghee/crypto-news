/**
 * External cron handler. Triggered by GitHub Actions every 5 minutes.
 * Authenticates with `CRON_SECRET` (Authorization: Bearer …).
 *
 * Pipeline:
 *   1. Pull RSS sources for this channel
 *   2. 3-key dedup against persistent store (URL canonical + title fingerprint + source+title)
 *   3. Cap to MAX_ARTICLES_PER_RUN new items
 *   4. Rewrite + translate via Anthropic
 *   5. Persist + record dedup keys
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dedupeByTitle, fetchAllSources, dedupKeys } from '@/lib/rss';
import { rewriteAndTranslate } from '@/lib/anthropic';
import { channel } from '@/channel.config';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_PER_RUN = parseInt(process.env.MAX_ARTICLES_PER_RUN ?? '5', 10);

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const fetched = await fetchAllSources(channel.id);
  const fresh: typeof fetched = [];

  // First pass: in-batch dedup
  for (const item of dedupeByTitle(fetched)) {
    // Second pass: persistent dedup against KV (3 independent keys)
    if (await db.hasSeen(item.id)) continue;
    const keys = dedupKeys(item);
    let dup = false;
    for (const k of keys) {
      if (await db.hasSeenKey(k)) { dup = true; break; }
    }
    if (dup) continue;
    fresh.push(item);
    if (fresh.length >= MAX_PER_RUN) break;
  }

  const created: { id: string; slug: string; title: string }[] = [];
  for (const item of fresh) {
    try {
      const article = await rewriteAndTranslate(item);
      await db.putArticle(article);
      await db.markSeen([item]);
      await db.markSeenKeys(dedupKeys(item));
      created.push({ id: article.id, slug: article.slug, title: article.i18n.ko?.title ?? item.rawTitle });
    } catch (err) {
      console.error('[cron] failed', item.id, (err as Error).message);
    }
  }

  return NextResponse.json({
    ok: true,
    channel: channel.id,
    fetched: fetched.length,
    fresh: fresh.length,
    created
  });
}

export async function POST(req: Request) {
  const { secret } = await req.json().catch(() => ({}));
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  return GET(new Request(req.url, { headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? ''}` } }));
}
