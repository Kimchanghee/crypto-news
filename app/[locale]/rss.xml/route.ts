import { db } from '@/lib/db';
import { channel } from '@/channel.config';
import { defaultLocale, type Locale } from '@/i18n';
import { SITE_URL, absoluteUrl } from '@/lib/seo';

export const revalidate = 300; // 5분 캐시

function escapeXml(s: string): string {
  return (s || '').replace(/[<>&'"]/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
  }[c] || c));
}

function imageType(url: string): string {
  if (url.endsWith('.jpg') || url.endsWith('.jpeg')) return 'image/jpeg';
  if (url.endsWith('.png')) return 'image/png';
  if (url.endsWith('.webp')) return 'image/webp';
  return 'image/svg+xml';
}

export async function GET(_req: Request, { params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const articles = await db.listLatest(channel.id, 30);
  const items = articles.map((a) => {
    const i: any = (a.i18n as any)[locale] ?? (a.i18n as any)[defaultLocale] ?? {};
    const title = i.title || a.slug;
    const desc = i.metaDescription || i.excerpt || i.summary || '';
    const url = encodeURI(`${SITE_URL}/${locale}/article/${a.slug}`);
    const img = absoluteUrl(a.imageUrl || `/images/category-${a.category || 'breaking'}.svg`);
    return `<item>
  <title>${escapeXml(title)}</title>
  <link>${escapeXml(url)}</link>
  <guid isPermaLink="true">${escapeXml(url)}</guid>
  <description>${escapeXml(desc)}</description>
  <pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>
  <category>${escapeXml(a.category)}</category>
  <enclosure url="${escapeXml(img)}" type="${imageType(img)}" />
  <source url="${escapeXml(a.sourceUrl || '')}">${escapeXml(a.sourceName || '')}</source>
</item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
<title>${escapeXml(channel.name)}</title>
<link>${SITE_URL}/${locale}</link>
<atom:link href="${SITE_URL}/${locale}/rss.xml" rel="self" type="application/rss+xml" />
<description>${escapeXml((channel as any).description || '')}</description>
<language>${locale}</language>
<image><url>${SITE_URL}/icon-512.svg</url><title>${escapeXml(channel.name)}</title><link>${SITE_URL}/${locale}</link></image>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300'
    }
  });
}
