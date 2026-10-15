import type { APIRoute } from 'astro';
import { allPages } from '../lib/pages';

export const GET: APIRoute = async () => {
  const pages = await allPages();
  const last = pages.map((p) => p.lastmod).sort().at(-1);
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>https://dailycryptonews.online/sitemap-0.xml</loc><lastmod>${last}</lastmod></sitemap>\n</sitemapindex>\n`;
  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
