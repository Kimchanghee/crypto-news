import { db } from '@/lib/db';
import { channel } from '@/channel.config';
import { defaultLocale } from '@/i18n';
import { SITE_URL } from '@/lib/seo';
import { getChannelLocale } from '@/lib/channel-locale';

export const revalidate = 300;

function escapeXml(s: string): string {
  return (s || '').replace(/[<>&'"]/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
  }[c] || c));
}

export async function GET() {
  const site = getChannelLocale(defaultLocale);
  const articles = await db.listLatest(channel.id, 1000);
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const fresh = articles.filter((a) => new Date(a.publishedAt).getTime() >= cutoff).slice(0, 1000);
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'
  ];

  for (const a of fresh) {
    const i: any = (a.i18n as any)[defaultLocale] ?? Object.values(a.i18n as any)[0] ?? {};
    lines.push('<url>');
    lines.push(`<loc>${escapeXml(encodeURI(`${SITE_URL}/${defaultLocale}/article/${a.slug}`))}</loc>`);
    lines.push('<news:news>');
    lines.push(`<news:publication><news:name>${escapeXml(site.name)}</news:name><news:language>${defaultLocale}</news:language></news:publication>`);
    lines.push(`<news:publication_date>${escapeXml(a.publishedAt)}</news:publication_date>`);
    lines.push(`<news:title>${escapeXml(i.title || a.slug)}</news:title>`);
    lines.push('</news:news>');
    lines.push('</url>');
  }

  lines.push('</urlset>');
  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300'
    }
  });
}
