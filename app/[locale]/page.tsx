import { db } from '@/lib/db';
import { ArticleCard } from '@/components/ArticleCard';
import { AdSlot } from '@/components/AdSlot';
import { AffiliateShowcase } from '@/components/AffiliateShowcase';
import { channel } from '@/channel.config';
import { defaultLocale, type Locale } from '@/i18n';
import { getTranslations } from 'next-intl/server';

export const revalidate = 60;

export default async function Home({ params: { locale } }: { params: { locale: Locale } }) {
  const t = await getTranslations({ locale });
  const articles = await db.listLatest(channel.id, 24);

  // Headline cards
  const [hero, ...rest] = articles;

  // Use channel config directly (placeholders in messages files are unresolved)
  const channelName = (channel as any).name || '';
  const channelDesc = (channel as any).description || (channel as any).tagline || '';

  return (
    <div>
      {/* SEO H1 — visible to search engines */}
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.3, margin: 0, color: 'var(--ink)' }}>
          {channelName}{channelDesc ? ` — ${channelDesc}` : ''}
        </h1>
      </header>

      {/* Hero */}
      <section style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 32 }}>
        <div>
          {hero ? (
            <ArticleCard article={hero} locale={locale} large={true} />
          ) : (
            <div className="card" style={{ minHeight: 220, padding: 24 }}>
              <p style={{ color: 'var(--muted)' }}>{t('common.loading')}</p>
            </div>
          )}
        </div>
        <aside>
          <AffiliateShowcase locale={locale} placement="sidebar" />
          <div style={{ height: 16 }} />
          <AdSlot
            network="adsterra"
            zoneId={process.env.NEXT_PUBLIC_ADSTERRA_BANNER_KEY}
            format="banner"
            size={{ w: 300, h: 250 }}
          />
          <div style={{ height: 16 }} />
          <AdSlot
            network="mgid"
            zoneId={process.env.NEXT_PUBLIC_MGID_WIDGET_ID}
            size={{ w: 300, h: 600 }}
          />
        </aside>
      </section>

      {/* Latest grid */}
      <section id="latest">
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 14 }}>{t('nav.latest')}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {rest.slice(0, 5).map((a) => (
            <ArticleCard key={a.id} article={a} locale={locale} />
          ))}
        </div>

        <div style={{ margin: '20px 0' }}>
          <AdSlot
            network="adsterra"
            zoneId={process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_KEY}
            format="native"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {rest.slice(5).map((a) => (
            <ArticleCard key={a.id} article={a} locale={locale} />
          ))}
        </div>
      </section>

      <section id="categories" style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 14 }}>{t('nav.categories')}</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {channel.categories.map((c: any) => (
            <a key={c.slug} href={`/${locale}/category/${c.slug}`} className="tag">
              {c.name?.[locale] ?? c.name?.[defaultLocale] ?? c.slug}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
