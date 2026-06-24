import type { Metadata } from 'next';
import type { GeneratedArticle } from './types';
import type { Locale } from '@/i18n';
import { locales, defaultLocale } from '@/i18n';
import { channel } from '@/channel.config';
import { getChannelLocale } from '@/lib/channel-locale';

const rawSiteUrl = process.env.SITE_URL || `https://${(channel as any).domain || ''}`;
export const SITE_URL = rawSiteUrl.replace(/\/+$/, '');
export const INDEXNOW_KEY = 'e5f4a1c9d3b748e6a12c4f0b9d87e35a';

export function absoluteUrl(path = ''): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

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

function siteKeywords(locale: Locale, extra: string[] = []): string[] {
  return Array.from(new Set([...getChannelLocale(locale).keywords, ...extra].filter(Boolean)));
}

function siteImage(): string {
  return absoluteUrl('/icon-512.svg');
}

export function articleMetadata(a: GeneratedArticle, locale: Locale): Metadata {
  const i = pickI18n(a, locale);
  const site = getChannelLocale(locale);
  const url = `${SITE_URL}/${locale}/article/${a.slug}`;
  const title = i.title || a.slug;
  const desc = pickMetaDescription(i);
  const image = absoluteUrl(a.imageUrl || `/images/category-${a.category || 'breaking'}.svg`);
  return {
    title: title, // layout template adds the localized site name
    description: desc,
    keywords: siteKeywords(locale, Array.isArray(i.keywords) ? i.keywords : [a.category, a.sourceName]),
    alternates: {
      canonical: url,
      languages: alternateLanguages(`/article/${a.slug}`)
    },
    openGraph: {
      type: 'article',
      url,
      title,
      description: desc,
      siteName: site.name,
      locale,
      publishedTime: a.publishedAt,
      modifiedTime: a.updatedAt,
      authors: [site.name],
      images: [{ url: image, width: 1200, height: 630, alt: title }]
    },
    twitter: { card: 'summary_large_image', title, description: desc, images: [image] },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1
      }
    }
  };
}

export function newsArticleJsonLd(a: GeneratedArticle, locale: Locale) {
  const i = pickI18n(a, locale);
  const site = getChannelLocale(locale);
  const url = `${SITE_URL}/${locale}/article/${a.slug}`;
  const title = i.title || a.slug;
  const desc = pickMetaDescription(i);
  const heroImg = absoluteUrl(a.imageUrl || `/images/category-${a.category || 'breaking'}.svg`);
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title,
    description: desc,
    inLanguage: locale,
    datePublished: a.publishedAt,
    dateModified: a.updatedAt,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: [heroImg],
    isAccessibleForFree: true,
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: site.name,
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: siteImage() }
    },
    author: { '@type': 'Organization', name: site.name },
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

export function organizationJsonLd(locale: Locale = defaultLocale) {
  const site = getChannelLocale(locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: site.name,
    url: SITE_URL,
    description: site.description,
    logo: siteImage(),
    areaServed: (channel as any).geo ? { '@type': 'Country', name: (channel as any).geo.country } : undefined
  };
}

export function websiteJsonLd(locale: Locale) {
  const site = getChannelLocale(locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: `${SITE_URL}/${locale}`,
    inLanguage: locale,
    description: site.description || site.tagline,
    publisher: organizationJsonLd(locale)
  };
}

export function itemListJsonLd(items: GeneratedArticle[], locale: Locale, name?: string) {
  const site = getChannelLocale(locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: name || site.name,
    itemListElement: items.map((a, index) => {
      const i = pickI18n(a, locale);
      return {
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE_URL}/${locale}/article/${a.slug}`,
        name: i.title || a.slug
      };
    })
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url)
    }))
  };
}
