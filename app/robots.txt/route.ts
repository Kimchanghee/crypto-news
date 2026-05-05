import { channel } from '@/channel.config';

export function GET() {
  const SITE_URL = process.env.SITE_URL || `https://${channel.domain}`;
  const body = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
