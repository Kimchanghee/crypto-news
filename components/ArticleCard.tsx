import type { GeneratedArticle } from '@/lib/types';
import { channel } from '@/channel.config';
import { defaultLocale, type Locale } from '@/i18n';

const CHANNEL_TO_CAT: Record<string, string> = { REALESTATE: 'realestate', STOCKS: 'stocks', CRYPTO: 'crypto', MACRO: 'macro', ETF: 'etf', FX: 'fx' };

function pickCat(a: GeneratedArticle): string {
  const cat = (a.category || '').toLowerCase();
  if (cat) return cat;
  return CHANNEL_TO_CAT[(a.channelId || '').toUpperCase()] || 'news';
}
function catLabel(slug: string, locale: Locale): string {
  const c = ((channel as any).categories || []).find((x: any) => x.slug === slug);
  return c?.name?.[locale] ?? c?.name?.[defaultLocale] ?? slug;
}
function calcReadingTime(text: string): number {
  if (!text) return 1;
  return Math.max(1, Math.round(text.split(/\s+/).length / 200));
}
function rel(iso: string, locale: string): string {
  if (!iso) return '';
  try {
    const ms = Date.now() - new Date(iso).getTime();
    const m = Math.floor(ms / 60000);
    if (m < 60) return `${Math.max(1, m)}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d`;
    return new Date(iso).toLocaleDateString(locale);
  } catch { return ''; }
}

export function ArticleCard({ article, locale, large = false }: { article: GeneratedArticle; locale: Locale; large?: boolean }) {
  const i: any = article.i18n[locale] ?? article.i18n[defaultLocale] ?? {};
  const summary = i.summary || i.excerpt || '';
  const readingTime = i.readingTime || calcReadingTime(i.body || i.bodyHtml || '');
  const cat = pickCat(article);
  const img = article.imageUrl || `/images/category-${cat}.svg`;
  const r = rel(article.publishedAt, locale);
  return (
    <article itemScope itemType="https://schema.org/NewsArticle" style={{ height: '100%' }}>
      <a href={`/${locale}/article/${article.slug}`} className={`ncard${large ? ' lg' : ''}`} itemProp="url">
        <div className="ph thumb">
          <img src={img} alt={i.title || ''} loading="lazy" decoding="async" itemProp="image" />
        </div>
        <span className={`kick${cat === 'breaking' ? ' red' : ''}`} itemProp="articleSection">{catLabel(cat, locale)}</span>
        <h3 itemProp="headline">{i.title}</h3>
        {summary && <p itemProp="description">{summary}</p>}
        <div className="np-meta">
          <span className="src" itemProp="publisher" itemScope itemType="https://schema.org/Organization">
            <span itemProp="name">{article.sourceName}</span>
          </span>
          {article.publishedAt && (
            <>
              <span>·</span>
              <time dateTime={article.publishedAt} itemProp="datePublished">{r}</time>
            </>
          )}
          <span>·</span><span>{readingTime}m</span>
        </div>
      </a>
    </article>
  );
}
