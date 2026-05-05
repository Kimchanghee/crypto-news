import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { defaultLocale, type Locale } from '@/i18n';
import { articleMetadata, faqJsonLd, newsArticleJsonLd } from '@/lib/seo';
import { AdSlot } from '@/components/AdSlot';
import { ArticleCard } from '@/components/ArticleCard';
import { AffiliateShowcase } from '@/components/AffiliateShowcase';
import { getTranslations } from 'next-intl/server';
import { channel } from '@/channel.config';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { locale: Locale; slug: string } }) {
  const a = await db.getBySlug(params.slug);
  if (!a) return {};
  return articleMetadata(a, params.locale);
}

export default async function ArticlePage({ params }: { params: { locale: Locale; slug: string } }) {
  const a = await db.getBySlug(params.slug);
  if (!a) notFound();
  const i = a.i18n[params.locale] ?? a.i18n[defaultLocale]!;
  const t = await getTranslations({ locale: params.locale });
  const related = (await db.listLatest(channel.id, 30))
    .filter((r) => r.id !== a.id && r.category === a.category)
    .slice(0, 3);

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleJsonLd(a, params.locale)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(i)) }} />

      <header style={{ maxWidth: 920, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <span className="tag">{a.category}</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t('article.minutes', { count: i.readingTime })}</span>
        </div>
        <h1 style={{ fontSize: 38, fontWeight: 700, lineHeight: 1.2, margin: '0 0 12px', letterSpacing: '-0.01em' }}>{i.title}</h1>
        <p style={{ fontSize: 15, color: 'var(--muted)' }}>
          {t('article.published')}: {new Date(a.publishedAt).toLocaleDateString(params.locale)} · {t('article.source')}: <a href={a.sourceUrl} rel="noopener nofollow" target="_blank">{a.sourceName}</a>
        </p>
        {a.imageUrl && (
          <figure style={{ margin: '20px 0 0' }}>
            <img
              src={a.imageUrl}
              alt={i.title}
              style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 12, display: 'block', background: 'var(--soft)' }}
              decoding="async"
            />
          </figure>
        )}
        <div style={{ marginTop: 16, padding: 16, background: 'var(--soft)', borderRadius: 8 }}>
          <strong style={{ fontFamily: 'Poppins', fontSize: 13 }}>{t('article.summary')}: </strong>
          <span>{i.summary}</span>
        </div>
      </header>

      <div className="divider" />

      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <AdSlot network="adsterra" zoneId={process.env.NEXT_PUBLIC_ADSTERRA_BANNER_KEY} format="banner" size={{ w: 728, h: 90 }} />

        <div className="prose-paper" style={{ marginTop: 18 }} dangerouslySetInnerHTML={{ __html: i.bodyHtml }} />

        <div style={{ marginTop: 24 }}>
          <AffiliateShowcase locale={params.locale} placement="article" />
        </div>

        <div style={{ margin: '24px 0' }}>
          <AdSlot network="mgid" zoneId={process.env.NEXT_PUBLIC_MGID_WIDGET_ID} />
        </div>

        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 22, marginBottom: 10 }}>{t('article.faq')}</h2>
          {i.faq.map((f, idx) => (
            <details key={idx} style={{ borderTop: '1px solid var(--soft)', padding: '12px 0' }}>
              <summary style={{ fontFamily: 'Poppins', fontWeight: 500, cursor: 'pointer' }}>{f.q}</summary>
              <p style={{ marginTop: 8 }}>{f.a}</p>
            </details>
          ))}
        </section>

        <div style={{ margin: '24px 0' }}>
          <AdSlot network="adsterra" zoneId={process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_KEY} format="native" />
        </div>

        {related.length > 0 && (
          <section style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 22, marginBottom: 10 }}>{t('article.related')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {related.map((r) => <ArticleCard key={r.id} article={r} locale={params.locale} />)}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
