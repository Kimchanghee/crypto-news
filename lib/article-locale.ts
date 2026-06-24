import type { Locale } from '@/i18n';
import { defaultLocale, locales } from '@/i18n';
import type { ArticleI18n, GeneratedArticle } from '@/lib/types';

export function hasArticleLocale(article: GeneratedArticle, locale: Locale): boolean {
  if (locale === defaultLocale) return true;
  const i18n = (article.i18n || {})[locale];
  return Boolean(i18n?.title && (i18n.summary || i18n.excerpt) && (i18n.body || i18n.bodyHtml));
}

export function articleI18n(article: GeneratedArticle, locale: Locale): Partial<ArticleI18n> {
  if (hasArticleLocale(article, locale)) return article.i18n[locale] || {};
  if (locale === defaultLocale) return article.i18n[defaultLocale] || {};
  return {};
}

export function filterArticlesForLocale<T extends GeneratedArticle>(articles: T[], locale: Locale): T[] {
  if (locale === defaultLocale) return articles;
  return articles.filter((article) => hasArticleLocale(article, locale));
}

export function articleLocales(article: GeneratedArticle): Locale[] {
  return locales.filter((locale) => hasArticleLocale(article, locale));
}
