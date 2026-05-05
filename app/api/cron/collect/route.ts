/**
 * Vercel Cron handler. Runs every 5 minutes (see vercel.json).
 * Authenticates with `CRON_SECRET` (Vercel sets `Authorization: Bearer $CRON_SECRET` automatically).
 *
 * Pipeline:
 *   1. Pull RSS sources for this channel
 *   2. Drop items already seen (KV) + same-title duplicates
 *   3. Cap to 5 new items per run (cost guardrail)
 *   4. For each item → call Anthropic to rewrite + translate to 11 locales
 *   5. Persist to KV
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dedupeByTitle, fetchAllSources } from '@/lib/rss';
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
  for (const item of dedupeByTitle(fetched)) {
    if (await db.hasSeen(item.id)) continue;
    fresh.push(item);
    if (fresh.length >= MAX_PER_RUN) break;
  }

  const created: { id: string; slug: string; title: string }[] = [];
  for (const item of fresh) {
    try {
      const article = await rewriteAndTranslate(item);
      await db.putArticle(article);
      await db.markSeen([item]);
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

/** Manual POST trigger (for /api/cron/collect with body { secret }) — for local dev */
export async function POST(req: Request) {
  const { secret } = await req.json().catch(() => ({}));
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  return GET(new Request(req.url, { headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? ''}` } }));
}
