/**
 * SEO / AEO / GEO helpers — backwards-compatible with v10 schema (excerpt/body only).
 */
import type { Metadata } from 'next';
import type { GeneratedArticle } from './types';
import type { Locale } from '@/i18n';
import { locales, defaultLocale } from '@/i18n';
import { channel } from '@/channel.config';

const SITE_URL = process.env.SITE_URL || `https://${(channel as any).domain || ''}`;

function pickI18n(a: GeneratedArticle, locale: Locale): any {
  return (a.i18n as any)[locale] ?? (a.i18n as any)[defaultLocale] ?? {};
}

function pickMetaDescription(i: any): string {
  return (i.metaDescription || i.excerpt || i.summary || '').slice(0, 200);
}

function pickKeywords(i: any, a: GeneratedArticle): string {
  if (Array.isArray(i.keywords) && i.keywords.length) return i.keywords.join(', ');
  // Fallback: derive from category + sourceName
  return [a.category, a.sourceName].filter(Boolean).join(', ');
}

export function alternateLanguages(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of locales) out[l] = `${SITE_URL}/${l}${path}`;
  out['x-default'] = `${SITE_URL}/${defaultLocale}${path}`;
  return out;
}

export function articleMetadata(a: GeneratedArticle, locale: Locale): Metadata {
  const i = pickI18n(a, locale);
  const url = `${SITE_URL}/${locale}/article/${a.slug}`;
  const title = i.title || a.slug;
  const desc = pickMetaDescription(i);
  return {
    title: `${title} — ${channel.name}`,
    description: desc,
    alternates: {
      canonical: url,
      languages: alternateLanguages(`/article/${a.slug}`)
    },
    openGraph: {
      type: 'article',
      url,
      title,
      description: desc,
      siteName: channel.name,
      locale,
      publishedTime: a.publishedAt,
      modifiedTime: a.updatedAt,
      authors: [channel.name],
      images: a.imageUrl ? [a.imageUrl] : [`${SITE_URL}/images/category-${a.category || 'breaking'}.svg`]
    },
    twitter: { card: 'summary_large_image', title, description: desc },
    robots: { index: true, follow: true }
  };
}

export function newsArticleJsonLd(a: GeneratedArticle, locale: Locale) {
  const i = pickI18n(a, locale);
  const url = `${SITE_URL}/${locale}/article/${a.slug}`;
  const title = i.title || a.slug;
  const desc = pickMetaDescription(i);
  const heroImg = a.imageUrl || `${SITE_URL}/images/category-${a.category || 'breaking'}.svg`;
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title,
    description: desc,
    inLanguage: locale,
    datePublished: a.publishedAt,
    dateModified: a.updatedAt,
    mainEntityOfPage: url,
    image: [heroImg],
    isAccessibleForFree: true,
    publisher: { '@type': 'Organization', name: channel.name, url: SITE_URL },
    author: { '@type': 'Organization', name: channel.name },
    articleSection: a.category,
    keywords: pickKeywords(i, a),
    spatialCoverage: (channel as any).geo ? { '@type': 'Place', name: (channel as any).geo.country } : undefined,
    citation: a.sourceUrl ? { '@type': 'CreativeWork', name: a.sourceName, url: a.sourceUrl } : undefined
  };
}

export function faqJsonLd(i: any) {
  const faqs = Array.isArray(i?.faq) ? i.faq : [];
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f: any) => ({
      '@type': 'Question',
      name: f?.q,
      acceptedAnswer: { '@type': 'Answer', text: f?.a }
    }))
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: channel.name,
    url: SITE_URL,
    description: (channel as any).description || '',
    areaServed: (channel as any).geo ? { '@type': 'Country', name: (channel as any).geo.country } : undefined
  };
}
