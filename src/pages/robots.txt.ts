import type { APIRoute } from 'astro';

const agents = ['Googlebot', 'Bingbot', 'Yeti', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended'];

export const GET: APIRoute = () =>
  new Response(
    `# Daily Crypto News: all crawlers welcome, including AI crawlers.\n${agents.map((a) => `User-agent: ${a}\nAllow: /\n`).join('\n')}\nUser-agent: *\nAllow: /\n\nSitemap: https://dailycryptonews.online/sitemap-index.xml\n`,
    { headers: { 'content-type': 'text/plain; charset=utf-8' } },
  );