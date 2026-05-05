/**
 * SEO / AEO / GEO helpers — JSON-LD generators and meta builders.
 */
import type { Metadata } from 'next';
import type { GeneratedArticle, ArticleI18n } from './types';
import type { Locale } from '@/i18n';
import { locales, defaultLocale } from '@/i18n';
import { channel } from '@/channel.config';

const SITE_URL = process.env.SITE_URL || `https://${channel.domain}`;

export function alternateLanguages(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of locales) out[l] = `${SITE_URL}/${l}${path}`;
  out['x-default'] = `${SITE_URL}/${defaultLocale}${path}`;
  return out;
}

export function articleMetadata(a: GeneratedArticle, locale: Locale): Metadata {
  const i = a.i18n[locale] ?? a.i18n[defaultLocale]!;
  const url = `${SITE_URL}/${locale}/article/${a.slug}`;
  return {
    title: `${i.title} — ${channel.name}`,
    description: i.metaDescription,
    alternates: {
      canonical: url,
      languages: alternateLanguages(`/article/${a.slug}`)
    },
    openGraph: {
      type: 'article',
      url,
      title: i.title,
      description: i.metaDescription,
      siteName: channel.name,
      locale,
      publishedTime: a.publishedAt,
      modifiedTime: a.updatedAt,
      authors: [channel.name]
    },
    twitter: { card: 'summary_large_image', title: i.title, description: i.metaDescription },
    robots: { index: true, follow: true }
  };
}

export function newsArticleJsonLd(a: GeneratedArticle, locale: Locale) {
  const i = a.i18n[locale] ?? a.i18n[defaultLocale]!;
  const url = `${SITE_URL}/${locale}/article/${a.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: i.title,
    description: i.metaDescription,
    inLanguage: locale,
    datePublished: a.publishedAt,
    dateModified: a.updatedAt,
    mainEntityOfPage: url,
    isAccessibleForFree: true,
    publisher: { '@type': 'Organization', name: channel.name, url: SITE_URL },
    author: { '@type': 'Organization', name: channel.name },
    articleSection: a.category,
    keywords: i.keywords.join(', '),
    spatialCoverage: { '@type': 'Place', name: channel.geo.country },
    citation: { '@type': 'CreativeWork', name: a.sourceName, url: a.sourceUrl }
  };
}

export function faqJsonLd(i: ArticleI18n) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: i.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: channel.name,
    url: SITE_URL,
    description: channel.description,
    areaServed: { '@type': 'Country', name: channel.geo.country }
  };
}
