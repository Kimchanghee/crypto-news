import { db } from '@/lib/db';
import { channel } from '@/channel.config';
import { defaultLocale } from '@/i18n';
import { SITE_URL } from '@/lib/seo';

export const revalidate = 300;

export async function GET() {
  const articles = await db.listLatest(channel.id, 12);
  const latest = articles.map((a) => {
    const i: any = (a.i18n as any)[defaultLocale] ?? Object.values(a.i18n as any)[0] ?? {};
    return `- ${i.title || a.slug}: ${encodeURI(`${SITE_URL}/${defaultLocale}/article/${a.slug}`)}`;
  }).join('\n');

  const body = `# ${channel.name}

${(channel as any).description || (channel as any).tagline || ''}

## Canonical Sections
- Home: ${SITE_URL}/${defaultLocale}
- Sitemap: ${SITE_URL}/sitemap.xml
- News sitemap: ${SITE_URL}/news-sitemap.xml
- RSS: ${SITE_URL}/${defaultLocale}/rss.xml

## Latest Articles
${latest}
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300'
    }
  });
}
