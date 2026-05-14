import { db } from '@/lib/db';
import { channel } from '@/channel.config';
import { locales } from '@/i18n';
import { SITE_URL, absoluteUrl } from '@/lib/seo';

function url(locale: string, path = '') {
  return encodeURI(`${SITE_URL}/${locale}${path}`);
}

function escapeXml(s: string): string {
  return (s || '').replace(/[<>&'"]/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
  }[c] || c));
}

function alternates(lines: string[], path = '') {
  for (const lo of locales) lines.push(`<xhtml:link rel="alternate" hreflang="${lo}" href="${escapeXml(url(lo, path))}"/>`);
  lines.push(`<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(url('ko', path))}"/>`);
}

export async function GET() {
  const arts = await db.listLatest(channel.id, 5000);
  const lines: string[] = [];
  const now = new Date().toISOString();
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">');

  // Home in all locales
  for (const l of locales) {
    lines.push('<url>');
    lines.push(`<loc>${escapeXml(url(l))}</loc>`);
    lines.push(`<lastmod>${now}</lastmod>`);
    lines.push('<changefreq>hourly</changefreq>');
    lines.push('<priority>1.0</priority>');
    alternates(lines);
    lines.push('</url>');
  }

  // Categories
  for (const c of channel.categories) {
    for (const l of locales) {
      lines.push('<url>');
      lines.push(`<loc>${escapeXml(url(l, `/category/${c.slug}`))}</loc>`);
      lines.push(`<lastmod>${now}</lastmod>`);
      lines.push('<changefreq>hourly</changefreq>');
      lines.push('<priority>0.8</priority>');
      alternates(lines, `/category/${c.slug}`);
      lines.push('</url>');
    }
  }

  // Articles
  for (const a of arts) {
    for (const l of locales) {
      lines.push('<url>');
      lines.push(`<loc>${escapeXml(url(l, `/article/${a.slug}`))}</loc>`);
      lines.push(`<lastmod>${a.updatedAt}</lastmod>`);
      lines.push('<changefreq>daily</changefreq>');
      lines.push('<priority>0.7</priority>');
      alternates(lines, `/article/${a.slug}`);
      const image = absoluteUrl(a.imageUrl || `/images/category-${a.category || 'breaking'}.svg`);
      lines.push('<image:image>');
      lines.push(`<image:loc>${escapeXml(image)}</image:loc>`);
      lines.push('</image:image>');
      lines.push('</url>');
    }
  }

  lines.push('</urlset>');
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
