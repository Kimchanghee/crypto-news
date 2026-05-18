import { db } from '@/lib/db';
import { ArticleCard } from '@/components/ArticleCard';
import { AffiliateShowcase } from '@/components/AffiliateShowcase';
import { channel } from '@/channel.config';
import { defaultLocale, type Locale } from '@/i18n';
import { getTranslations } from 'next-intl/server';
import { itemListJsonLd } from '@/lib/seo';

export const revalidate = 60;

export default async function Home({ params: { locale } }: { params: { locale: Locale } }) {
  const t = await getTranslations({ locale });
  const articles = await db.listLatest(channel.id, 24);
  const [hero, ...rest] = articles;
  const channelName = (channel as any).name || '';
  const channelDesc = (channel as any).description || (channel as any).tagline || '';

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd(articles.slice(0, 20), locale, `${channel.name} latest news`)) }}
      />
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.3, margin: 0, color: 'var(--ink)' }}>
          {channelName}{channelDesc ? ` — ${channelDesc}` : ''}
        </h1>
      </header>

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
        <aside className="card" style={{ padding: 18, alignSelf: 'start' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>{t('nav.categories')}</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {channel.categories.map((c: any) => (
              <a key={c.slug} href={'/' + locale + '/category/' + c.slug} className="tag">
                {c.name?.[locale] ?? c.name?.[defaultLocale] ?? c.slug}
              </a>
            ))}
          </div>
          <div className="affiliate-home-sidebar" style={{ marginTop: 16 }}>
            <AffiliateShowcase locale={locale} placement="sidebar" />
          </div>
        </aside>
      </section>

      <section className="search-priority-panel" aria-label="Search priority pages" style={{ margin: '0 0 32px', padding: 18, border: '1px solid var(--soft)', borderRadius: 8, background: '#fff' }}>
        <p className="affiliate-eyebrow">Search priority</p>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 10 }}>{channel.name} reader paths</h2>
        <p style={{ color: '#5f5c55', marginBottom: 12 }}>
          Start with the hero story, then move through category pages and related articles. This gives readers and search crawlers clear paths beyond the first article card.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href={'/' + locale} className="tag">{channel.name}</a>
          <a href={'/' + locale + '/rss.xml'} className="tag">RSS</a>
          <a href="/sitemap.xml" className="tag">Sitemap</a>
          <a href="/news-sitemap.xml" className="tag">News sitemap</a>
          {channel.categories.slice(0, 4).map((c: any) => (
            <a key={c.slug} href={'/' + locale + '/category/' + c.slug} className="tag">
              {c.name?.[locale] ?? c.name?.[defaultLocale] ?? c.slug}
            </a>
          ))}
        </div>
      </section>

      <section id="latest">
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 14 }}>{t('nav.latest')}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {rest.slice(0, 5).map((a) => (
            <ArticleCard key={a.id} article={a} locale={locale} />
          ))}
        </div>

        <div className="affiliate-latest-break" style={{ margin: '24px 0' }}>
          <AffiliateShowcase locale={locale} placement="article" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {rest.slice(5, 13).map((a) => (
            <ArticleCard key={a.id} article={a} locale={locale} />
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {rest.slice(13).map((a) => (
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
