import { db } from '@/lib/db';
import { ArticleCard } from '@/components/ArticleCard';
import { AffiliateShowcase } from '@/components/AffiliateShowcase';
import { AdSlot } from '@/components/AdSlot';
import { channel } from '@/channel.config';
import { defaultLocale, type Locale } from '@/i18n';
import { getTranslations } from 'next-intl/server';
import { itemListJsonLd } from '@/lib/seo';
import { channelLabel, getChannelLocale } from '@/lib/channel-locale';
import { articleI18n, filterArticlesForLocale } from '@/lib/article-locale';

export const revalidate = 60;

function catLabel(slug: string, locale: Locale): string {
  const c = ((channel as any).categories || []).find((x: any) => x.slug === slug);
  return c?.name?.[locale] ?? c?.name?.[defaultLocale] ?? slug;
}

const MKT = [
  { id: 'bitcoin', pr: '$103,420', d: 'up', ch: '+1.24%' },
  { id: 'nasdaq', pr: '18,642', d: 'up', ch: '+0.41%' },
  { id: 'sp500', pr: '5,430', d: 'up', ch: '+0.33%' },
  { id: 'kospi', pr: '2,704', d: 'dn', ch: '-0.22%' },
  { id: 'usdkrw', pr: '1,386.4', d: 'up', ch: '+0.22%' },
];

const MARKET_NAMES: Record<string, Partial<Record<Locale, string>>> = {
  bitcoin: { ko: '비트코인', en: 'Bitcoin', ja: 'ビットコイン', zh: '比特币', es: 'Bitcoin', pt: 'Bitcoin', de: 'Bitcoin', fr: 'Bitcoin', ar: 'بيتكوين', hi: 'बिटकॉइन', id: 'Bitcoin' },
  nasdaq: { ko: '나스닥', en: 'Nasdaq', ja: 'ナスダック', zh: '纳斯达克', es: 'Nasdaq', pt: 'Nasdaq', de: 'Nasdaq', fr: 'Nasdaq', ar: 'ناسداك', hi: 'नैस्डैक', id: 'Nasdaq' },
  sp500: { ko: 'S&P 500', en: 'S&P 500', ja: 'S&P 500', zh: 'S&P 500', es: 'S&P 500', pt: 'S&P 500', de: 'S&P 500', fr: 'S&P 500', ar: 'S&P 500', hi: 'S&P 500', id: 'S&P 500' },
  kospi: { ko: '코스피', en: 'KOSPI', ja: 'KOSPI', zh: 'KOSPI', es: 'KOSPI', pt: 'KOSPI', de: 'KOSPI', fr: 'KOSPI', ar: 'كوسبي', hi: 'KOSPI', id: 'KOSPI' },
  usdkrw: { ko: '원/달러', en: 'USD/KRW', ja: 'ドル/ウォン', zh: '美元/韩元', es: 'USD/KRW', pt: 'USD/KRW', de: 'USD/KRW', fr: 'USD/KRW', ar: 'دولار/وون', hi: 'USD/KRW', id: 'USD/KRW' },
};

function marketName(id: string, locale: Locale) {
  return MARKET_NAMES[id]?.[locale] ?? MARKET_NAMES[id]?.en ?? id;
}

export default async function Home({ params: { locale } }: { params: { locale: Locale } }) {
  const t = await getTranslations({ locale });
  const site = getChannelLocale(locale);
  const articles = filterArticlesForLocale(await db.listLatest(channel.id, 24), locale);
  const [hero, ...rest] = articles;
  const secondary = rest.slice(0, 4);
  const gridArticles = rest.slice(4);
  const ranked = rest.slice(0, 5);

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd(articles.slice(0, 20), locale, `${site.name} ${channelLabel('latestNews', locale)}`)) }} />

      <h1 data-primary-home-heading style={{ fontFamily: 'var(--serif)', fontSize: 34, lineHeight: 1.2, margin: '0 0 18px' }}>
        {site.name} {channelLabel('latestNews', locale)}
      </h1>

      <section className="np-lead">
        <div>
          {hero ? <ArticleCard article={hero} locale={locale} large /> : <div className="card">{t('common.loading')}</div>}
        </div>
        <div className="side">
          <div className="np-sidehead">{t('nav.latest')}</div>
          <div className="np-slist">
            {secondary.map((a) => {
              const i = articleI18n(a, locale);
              const cat = (a.category || '').toLowerCase();
              return (
                <a key={a.id} href={`/${locale}/article/${a.slug}`}>
                  <span className={`kick${cat === 'breaking' ? ' red' : ''}`}>{catLabel(cat, locale)}</span>
                  <h4>{i.title}</h4>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <div style={{ margin: '6px 0 22px' }}>
        <AffiliateShowcase locale={locale} placement="article" />
      </div>

      <div className="np-cols">
        <div>
          <div className="seclabel"><h2>{t('nav.latest')}</h2><span className="ln" /></div>
          <div className="np-grid">
            {gridArticles.slice(0, 6).map((a) => <ArticleCard key={a.id} article={a} locale={locale} />)}
          </div>
          <div style={{ margin: '26px 0' }}><AffiliateShowcase locale={locale} placement="article" /></div>
          {gridArticles.length > 6 && (
            <div className="np-grid">
              {gridArticles.slice(6).map((a) => <ArticleCard key={a.id} article={a} locale={locale} />)}
            </div>
          )}
        </div>

        <aside>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <AdSlot network="adsterra" zoneId="3e4bce1484f612934ea3087016160d51" />
          </div>
          <div className="np-widget np-rank">
            <span className="wh">{channelLabel('mostRead', locale)}</span>
            {ranked.map((a, idx) => {
              const i = articleI18n(a, locale);
              return (
                <a key={a.id} href={`/${locale}/article/${a.slug}`}>
                  <span className="n">{idx + 1}</span><h4>{i.title}</h4>
                </a>
              );
            })}
          </div>
          <div className="np-widget np-mkt">
            <span className="wh">{channelLabel('markets', locale)}</span>
            {MKT.map((m) => (
              <div className="mrow" key={m.id}>
                <span className="nm">{marketName(m.id, locale)}</span>
                <span className="pr">{m.pr}</span>
                <span className={m.d === 'up' ? 'up' : 'dn'}>{m.ch}</span>
              </div>
            ))}
          </div>
          <div className="np-widget">
            <span className="wh">{t('nav.categories')}</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '12px 0' }}>
              {((channel as any).categories || []).map((c: any) => (
                <a key={c.slug} href={`/${locale}/category/${c.slug}`} className="tag">{c.name?.[locale] ?? c.name?.[defaultLocale] ?? c.slug}</a>
              ))}
            </div>
          </div>
          <AffiliateShowcase locale={locale} placement="sidebar" />
        </aside>
      </div>

      <section className="reader-workflow-panel" aria-label={channelLabel('readerWorkflow', locale)} style={{ marginTop: 36 }}>
        <div>
          <p className="affiliate-eyebrow">{channelLabel('explore', locale)}</p>
          <h2 style={{ fontSize: 20, margin: '0 0 6px' }}>{site.name}</h2>
        </div>
        <div className="reader-workflow-links">
          <a href={`/${locale}`} className="tag">{site.name}</a>
          <a href={`/${locale}/rss.xml`} className="tag">RSS</a>
          <a href="/sitemap.xml" className="tag">Sitemap</a>
          {((channel as any).categories || []).map((c: any) => (
            <a key={c.slug} href={`/${locale}/category/${c.slug}`} className="tag">{c.name?.[locale] ?? c.name?.[defaultLocale] ?? c.slug}</a>
          ))}
        </div>
      </section>
    </div>
  );
}
