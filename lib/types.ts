import type { Locale } from '@/i18n';
export type SourceItem = { id: string; sourceUrl: string; rawTitle: string; publishedAt: string; sourceName: string; category: string; channelId: string; };
export type GeneratedArticle = { id: string; slug: string; channelId: string; category: string; publishedAt: string; updatedAt: string; sourceName: string; sourceUrl: string; i18n: Partial<Record<Locale, ArticleI18n>>; imageUrl?: string; };
export type ArticleI18n = {
  title: string;
  excerpt?: string;
  metaDescription?: string;
  summary?: string;
  body?: string;
  bodyHtml?: string;
  faq?: { q: string; a: string }[];
  readingTime?: number;
  keywords?: string[];
};
