import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { defaultLocale, type Locale } from '@/i18n';
import { SITE_URL, articleMetadata, breadcrumbJsonLd, faqJsonLd, newsArticleJsonLd } from '@/lib/seo';
import { ArticleCard } from '@/components/ArticleCard';
import { AffiliateShowcase } from '@/components/AffiliateShowcase';
import { getTranslations } from 'next-intl/server';
import { channel } from '@/channel.config';

export const revalidate = 60;
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: { locale: Locale; slug: string } }) {
  const a = await db.getBySlug(params.slug);
  if (!a) return {};
  return articleMetadata(a, params.locale);
}

function bodyToHtml(text: string): string {
  if (!text) return '';
  return text.split(/\n\n+|\n/).filter(Boolean)
    .map(p => `<p>${p.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>`)
    .join('\n');
}

function calcReadingTime(text: string): number {
  if (!text) return 1;
  return Math.max(1, Math.round(text.split(/\s+/).length / 200));
}

export default async function ArticlePage({ params }: { params: { locale: Locale; slug: string } }) {
  const a = await db.getBySlug(params.slug);
  if (!a) notFound();
  const i: any = a.i18n[params.locale] ?? a.i18n[defaultLocale] ?? {};
  const t = await getTranslations({ locale: params.locale });

  const summary = i.summary || i.excerpt || '';
  const bodyHtml = i.bodyHtml || bodyToHtml(i.body || '');
  const readingTime = i.readingTime || calcReadingTime(i.body || i.bodyHtml || '');
  const faqs = Array.isArray(i.faq) ? i.faq : [];
  const title = i.title || '';
  const heroImg = a.imageUrl || `/images/category-${a.category || 'breaking'}.svg`;

  const related = (await db.listLatest(channel.id, 30))
    .filter((r) => r.id !== a.id && r.category === a.category)
    .slice(0, 3);

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleJsonLd(a, params.locale)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd([
            { name: channel.name, url: `/${params.locale}` },
            { name: a.category, url: `/${params.locale}/category/${a.category}` },
            { name: title, url: `${SITE_URL}/${params.locale}/article/${a.slug}` }
          ]))
        }}
      />
      {faqs.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(i)) }} />
      )}

      <header style={{ maxWidth: 920, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <span className="tag">{a.category}</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{readingTime} min</span>
        </div>
        <h1 style={{ fontSize: 38, fontWeight: 700, lineHeight: 1.2, margin: '0 0 12px', letterSpacing: '-0.01em' }}>{title}</h1>
        <p style={{ fontSize: 15, color: 'var(--muted)' }}>
          {t('article.published')}: <time dateTime={a.publishedAt}>{new Date(a.publishedAt).toLocaleDateString(params.locale)}</time> · {t('article.source')}: <a href={a.sourceUrl} rel="noopener nofollow" target="_blank">{a.sourceName}</a>
        </p>
        <figure style={{ margin: '20px 0 0' }}>
          <img src={heroImg} alt={title} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 12, display: 'block', background: 'var(--soft)' }} decoding="async" fetchPriority="high" />
        </figure>
        {summary && (
          <div style={{ marginTop: 16, padding: 16, background: 'var(--soft)', borderRadius: 8 }}>
            <strong style={{ fontFamily: 'Poppins', fontSize: 13 }}>{t('article.summary')}: </strong>
            <span>{summary}</span>
          </div>
        )}
        <section className="article-key-points" aria-label={params.locale === 'ko' ? '핵심 포인트' : 'Key points'}>
          <h2>{params.locale === 'ko' ? '핵심 포인트' : 'Key points'}</h2>
          <ul>
            <li>{summary || title}</li>
            <li>{params.locale === 'ko' ? '본문과 FAQ에서 맥락을 확인한 뒤 판단하세요.' : 'Use the body and FAQ context before acting on this update.'}</li>
            <li>{params.locale === 'ko' ? '카테고리 허브에서 유사 이슈를 함께 비교하세요.' : 'Compare with related issues inside the category hub.'}</li>
          </ul>
          <div className="article-action-links">
            <a href={'/' + params.locale + '/category/' + a.category}>{params.locale === 'ko' ? '카테고리 허브' : 'Category hub'}</a>
            <a href={'/' + params.locale}>{params.locale === 'ko' ? '최신 기사' : 'Latest stories'}</a>
            <a href="/sitemap.xml">Sitemap</a>
          </div>
        </section>
      </header>

      <div className="divider" />

      <div style={{ maxWidth: 760, margin: '0 auto' }}>
<div className="prose-paper" style={{ marginTop: 18 }} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        <div className="article-affiliate-after-body" style={{ marginTop: 26 }}>
          <AffiliateShowcase locale={params.locale} placement="article" />
        </div>
{faqs.length > 0 && (
          <section style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 22, marginBottom: 10 }}>{t('article.faq')}</h2>
            {faqs.map((f: any, idx: number) => (
              <details key={idx} style={{ borderTop: '1px solid var(--soft)', padding: '12px 0' }}>
                <summary style={{ fontFamily: 'Poppins', fontWeight: 500, cursor: 'pointer' }}>{f.q}</summary>
                <p style={{ marginTop: 8 }}>{f.a}</p>
              </details>
            ))}
          </section>
        )}
{related.length > 0 && (
          <section style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 22, marginBottom: 10 }}>{t('article.related')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {related.map((r) => <ArticleCard key={r.id} article={r} locale={params.locale} />)}
            </div>
          </section>
        )}
        <section className="article-next-actions" aria-label={params.locale === 'ko' ? '다음 읽기 경로' : 'Next reading path'}>
          <h2>{params.locale === 'ko' ? '다음 탐색 경로' : 'Continue your research path'}</h2>
          <p>
            {params.locale === 'ko'
              ? '관련 카테고리와 최신 허브를 함께 확인하면 체류 시간이 늘고, 정보 검증도 더 정확해집니다.'
              : 'Use category and latest hubs to deepen context and compare multiple sources in one session.'}
          </p>
          <div className="article-action-links">
            <a href={'/' + params.locale + '/category/' + a.category}>{params.locale === 'ko' ? '같은 카테고리 보기' : 'Explore this category'}</a>
            <a href={'/' + params.locale + '/rss.xml'}>RSS</a>
            <a href="/llms.txt">llms.txt</a>
          </div>
        </section>
      </div>
    </article>
  );
}
