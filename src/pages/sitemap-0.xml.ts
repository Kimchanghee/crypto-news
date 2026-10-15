import type { APIRoute } from 'astro';
import { allPages } from '../lib/pages';

export const GET: APIRoute = async () => {
  const pages = await allPages();
  const urls = pages.map((p) => `  <url><loc>https://dailycryptonews.online${p.path}</loc><lastmod>${p.lastmod}</lastmod></url>`).join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
