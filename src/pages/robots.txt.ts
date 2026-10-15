import type { APIRoute } from 'astro';

export const GET: APIRoute = () =>
  new Response(
    `# Daily Crypto News: all crawlers welcome, including AI crawlers.\nUser-agent: *\nAllow: /\n\nSitemap: https://dailycryptonews.online/sitemap-index.xml\n`,
    { headers: { 'content-type': 'text/plain; charset=utf-8' } },
  );
