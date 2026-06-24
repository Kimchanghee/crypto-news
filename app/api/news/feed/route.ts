/** Public JSON feed of latest articles for the dashboard / external consumers. */
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { channel } from '@/channel.config';
import { getChannelLocale } from '@/lib/channel-locale';
import { defaultLocale } from '@/i18n';

export const revalidate = 60;

export async function GET() {
  const site = getChannelLocale(defaultLocale);
  const items = await db.listLatest(channel.id, 50);
  return NextResponse.json({
    channel: channel.id,
    name: site.name,
    domain: channel.domain,
    items: items.map((a) => ({
      id: a.id, slug: a.slug, category: a.category,
      publishedAt: a.publishedAt, sourceName: a.sourceName,
      title: a.i18n.ko?.title, summary: a.i18n.ko?.summary
    }))
  });
}
