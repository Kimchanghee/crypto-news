import { channel } from '@/channel.config';
import { SITE_URL } from '@/lib/seo';

export function GET() {
  const host = new URL(SITE_URL).host;
  const body = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
Sitemap: ${SITE_URL}/news-sitemap.xml
Host: ${host}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
