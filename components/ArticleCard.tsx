import Link from 'next/link';
import type { GeneratedArticle } from '@/lib/types';
import { defaultLocale, type Locale } from '@/i18n';
import { useTranslations } from 'next-intl';

export function ArticleCard({ article, locale, large = false }: { article: GeneratedArticle; locale: Locale; large?: boolean }) {
  const t = useTranslations();
  const i = article.i18n[locale] ?? article.i18n[defaultLocale]!;
  const img = article.imageUrl;

  return (
    <Link href={`/${locale}/article/${article.slug}`} className="card" style={{ display: 'block', textDecoration: 'none', color: 'var(--ink)', padding: 0, overflow: 'hidden' }}>
      {img && (
        <div style={{ position: 'relative', width: '100%', aspectRatio: large ? '16/9' : '3/2', overflow: 'hidden', background: 'var(--soft)' }}>
          <img src={img} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      )}
      <div style={{ padding: large ? 24 : 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <span className="tag">{article.category}</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{t('article.minutes', { count: i.readingTime })}</span>
        </div>
        <h3 style={{ fontSize: large ? 24 : 18, fontWeight: 600, margin: '4px 0 8px', lineHeight: 1.3 }}>{i.title}</h3>
        <p style={{ fontSize: 14, color: '#444', lineHeight: 1.55 }}>{i.summary}</p>
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)' }}>{article.sourceName}</div>
      </div>
    </Link>
  );
}
