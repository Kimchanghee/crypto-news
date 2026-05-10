import Link from 'next/link';
import type { GeneratedArticle } from '@/lib/types';
import { defaultLocale, type Locale } from '@/i18n';
import { useTranslations } from 'next-intl';

function calcReadingTime(text: string): number {
  if (!text) return 1;
  return Math.max(1, Math.round(text.split(/\s+/).length / 200));
}

const CHANNEL_TO_CAT: Record<string, string> = {
  REALESTATE: 'realestate',
  STOCKS: 'stocks',
  CRYPTO: 'crypto',
  MACRO: 'macro',
  ETF: 'etf',
  FX: 'fx',
};

function pickCategorySlug(article: GeneratedArticle): string {
  const cat = (article.category || '').toLowerCase();
  if (['realestate','stocks','crypto','macro','etf','fx'].includes(cat)) return cat;
  const channelCat = CHANNEL_TO_CAT[(article.channelId || '').toUpperCase()];
  return channelCat || 'breaking';
}

function relativeTime(iso: string, locale: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const ms = Date.now() - d.getTime();
    const min = Math.floor(ms / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}d`;
    return d.toLocaleDateString(locale);
  } catch { return ''; }
}

export function ArticleCard({ article, locale, large = false }: { article: GeneratedArticle; locale: Locale; large?: boolean }) {
  const t = useTranslations();
  const i: any = article.i18n[locale] ?? article.i18n[defaultLocale] ?? {};
  const summary = i.summary || i.excerpt || '';
  const readingTime = i.readingTime || calcReadingTime(i.body || i.bodyHtml || '');
  const cat = pickCategorySlug(article);
  const img = article.imageUrl || `/images/category-${cat}.svg`;
  const rel = relativeTime(article.publishedAt, locale);

  return (
    <article itemScope itemType="https://schema.org/NewsArticle" style={{ height: '100%' }}>
      <Link
        href={`/${locale}/article/${article.slug}`}
        className="card"
        itemProp="url"
        style={{ display: 'block', textDecoration: 'none', color: 'var(--ink)', padding: 0, overflow: 'hidden', height: '100%' }}
      >
        <div style={{ position: 'relative', width: '100%', aspectRatio: large ? '16/9' : '3/2', overflow: 'hidden', background: 'var(--soft)' }}>
          <img
            src={img}
            alt={i.title || ''}
            loading="lazy"
            decoding="async"
            itemProp="image"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
        <div style={{ padding: large ? 24 : 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <span className="tag" itemProp="articleSection">{cat}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }} aria-label="reading time">{readingTime} min</span>
          </div>
          <h3 itemProp="headline" style={{ fontSize: large ? 24 : 18, fontWeight: 600, margin: '4px 0 8px', lineHeight: 1.3 }}>{i.title}</h3>
          {summary && <p itemProp="description" style={{ fontSize: 14, color: '#444', lineHeight: 1.55 }}>{summary}</p>}
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span itemProp="publisher" itemScope itemType="https://schema.org/Organization">
              <span itemProp="name">{article.sourceName}</span>
            </span>
            {article.publishedAt && (
              <time dateTime={article.publishedAt} itemProp="datePublished" title={new Date(article.publishedAt).toLocaleString(locale)}>
                {rel}
              </time>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
