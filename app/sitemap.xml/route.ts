import { db } from '@/lib/db';
import { channel } from '@/channel.config';
import { locales } from '@/i18n';

const SITE_URL = process.env.SITE_URL || `https://${channel.domain}`;

function url(locale: string, path = '') {
  return `${SITE_URL}/${locale}${path}`;
}

export async function GET() {
  const arts = await db.listLatest(channel.id, 5000);
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">');

  // Home in all locales
  for (const l of locales) {
    lines.push('<url>');
    lines.push(`<loc>${url(l)}</loc>`);
    for (const lo of locales) lines.push(`<xhtml:link rel="alternate" hreflang="${lo}" href="${url(lo)}"/>`);
    lines.push('</url>');
  }

  // Categories
  for (const c of channel.categories) {
    for (const l of locales) {
      lines.push('<url>');
      lines.push(`<loc>${url(l, `/category/${c.slug}`)}</loc>`);
      for (const lo of locales) lines.push(`<xhtml:link rel="alternate" hreflang="${lo}" href="${url(lo, `/category/${c.slug}`)}"/>`);
      lines.push('</url>');
    }
  }

  // Articles
  for (const a of arts) {
    for (const l of locales) {
      lines.push('<url>');
      lines.push(`<loc>${url(l, `/article/${a.slug}`)}</loc>`);
      lines.push(`<lastmod>${a.updatedAt}</lastmod>`);
      for (const lo of locales) lines.push(`<xhtml:link rel="alternate" hreflang="${lo}" href="${url(lo, `/article/${a.slug}`)}"/>`);
      lines.push('</url>');
    }
  }

  lines.push('</urlset>');
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
