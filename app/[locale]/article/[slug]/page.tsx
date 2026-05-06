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
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: { locale: Locale; slug: string } }) {
  const a = await db.getBySlug(params.slug);
  if (!a) return {};
  return articleMetadata(a, params.locale);
}

// Convert plain text body to safe HTML paragraphs
function bodyToHtml(text: string): string {
  if (!text) return '';
  return text.split(/\n\n+|\n/).filter(Boolean)
    .map(p => `<p>${p.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>`)
    .join('\n');
}

function calcReadingTime(text: string): number {
  if (!text) return 1;
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export default async function ArticlePage({ params }: { params: { locale: Locale; slug: string } }) {
  const a = await db.getBySlug(params.slug);
  if (!a) notFound();
  const i: any = a.i18n[params.locale] ?? a.i18n[defaultLocale] ?? {};
  const t = await getTranslations({ locale: params.locale });

  // Backwards-compat: support both old schema (summary/bodyHtml/readingTime/faq)
  // and new v10 schema (excerpt/body)
  const summary = i.summary || i.excerpt || '';
  const bodyHtml = i.bodyHtml || bodyToHtml(i.body || '');
  const readingTime = i.readingTime || calcReadingTime(i.body || i.bodyHtml || '');
  const faqs = Array.isArray(i.faq) ? i.faq : [];
  const title = i.title || '';
  const channelImg = `/images/category-${a.category || 'breaking'}.svg`;
  const heroImg = a.imageUrl || channelImg;

  const related = (await db.listLatest(channel.id, 30))
    .filter((r) => r.id !== a.id && r.category === a.category)
    .slice(0, 3);

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleJsonLd(a, params.locale)) }} />
      {faqs.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(i)) }} />
      )}

      <header style={{ maxWidth: 920, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <span className="tag">{a.category}</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{readingTime}{t('article.minutes', { count: readingTime }).replace(/\d+/g,'')}</span>
        </div>
        <h1 style={{ fontSize: 38, fontWeight: 700, lineHeight: 1.2, margin: '0 0 12px', letterSpacing: '-0.01em' }}>{title}</h1>
        <p style={{ fontSize: 15, color: 'var(--muted)' }}>
          {t('article.published')}: {new Date(a.publishedAt).toLocaleDateString(params.locale)} · {t('article.source')}: <a href={a.sourceUrl} rel="noopener nofollow" target="_blank">{a.sourceName}</a>
        </p>
        <figure style={{ margin: '20px 0 0' }}>
          <img
            src={heroImg}
            alt={title}
            style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 12, display: 'block', background: 'var(--soft)' }}
            decoding="async"
          />
        </figure>
        {summary && (
          <div style={{ marginTop: 16, padding: 16, background: 'var(--soft)', borderRadius: 8 }}>
            <strong style={{ fontFamily: 'Poppins', fontSize: 13 }}>{t('article.summary')}: </strong>
            <span>{summary}</span>
          </div>
        )}
      </header>

      <div className="divider" />

      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <AdSlot network="adsterra" zoneId={process.env.NEXT_PUBLIC_ADSTERRA_BANNER_KEY} format="banner" size={{ w: 728, h: 90 }} />

        <div className="prose-paper" style={{ marginTop: 18 }} dangerouslySetInnerHTML={{ __html: bodyHtml }} />

        <div style={{ marginTop: 24 }}>
          <AffiliateShowcase locale={params.locale} placement="article" />
        </div>

        <div style={{ margin: '24px 0' }}>
          <AdSlot network="mgid" zoneId={process.env.NEXT_PUBLIC_MGID_WIDGET_ID} />
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
