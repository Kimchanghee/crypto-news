import Link from 'next/link';
import type { GeneratedArticle } from '@/lib/types';
import { defaultLocale, type Locale } from '@/i18n';
import { useTranslations } from 'next-intl';

function calcReadingTime(text: string): number {
  if (!text) return 1;
  return Math.max(1, Math.round(text.split(/\s+/).length / 200));
}

export function ArticleCard({ article, locale, large = false }: { article: GeneratedArticle; locale: Locale; large?: boolean }) {
  const t = useTranslations();
  const i: any = article.i18n[locale] ?? article.i18n[defaultLocale] ?? {};
  const summary = i.summary || i.excerpt || '';
  const readingTime = i.readingTime || calcReadingTime(i.body || i.bodyHtml || '');
  // Always show image; fallback to category SVG
  const img = article.imageUrl || `/images/category-${article.category || 'breaking'}.svg`;

  return (
    <Link href={`/${locale}/article/${article.slug}`} className="card" style={{ display: 'block', textDecoration: 'none', color: 'var(--ink)', padding: 0, overflow: 'hidden' }}>
      <div style={{ position: 'relative', width: '100%', aspectRatio: large ? '16/9' : '3/2', overflow: 'hidden', background: 'var(--soft)' }}>
        <img src={img} alt={i.title || ''} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
      <div style={{ padding: large ? 24 : 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <span className="tag">{article.category}</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{readingTime} min</span>
        </div>
        <h3 style={{ fontSize: large ? 24 : 18, fontWeight: 600, margin: '4px 0 8px', lineHeight: 1.3 }}>{i.title}</h3>
        {summary && <p style={{ fontSize: 14, color: '#444', lineHeight: 1.55 }}>{summary}</p>}
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)' }}>{article.sourceName}</div>
      </div>
    </Link>
  );
}
