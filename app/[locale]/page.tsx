import { db } from '@/lib/db';
import { ArticleCard } from '@/components/ArticleCard';
import { AffiliateShowcase } from '@/components/AffiliateShowcase';
import { channel } from '@/channel.config';
import { defaultLocale, type Locale } from '@/i18n';
import { getTranslations } from 'next-intl/server';
import { itemListJsonLd } from '@/lib/seo';

export const revalidate = 60;

function catLabel(slug: string, locale: Locale): string {
  const c = ((channel as any).categories || []).find((x: any) => x.slug === slug);
  return c?.name?.[locale] ?? c?.name?.[defaultLocale] ?? slug;
}

const MKT = [
  { nm: '비트코인', pr: '$103,420', d: 'up', ch: '+1.24%' },
  { nm: '나스닥', pr: '18,642', d: 'up', ch: '+0.41%' },
  { nm: 'S&P 500', pr: '5,430', d: 'up', ch: '+0.33%' },
  { nm: '코스피', pr: '2,704', d: 'dn', ch: '-0.22%' },
  { nm: '원/달러', pr: '1,386.4', d: 'up', ch: '+0.22%' },
];

export default async function Home({ params: { locale } }: { params: { locale: Locale } }) {
  const t = await getTranslations({ locale });
  const articles = await db.listLatest(channel.id, 24);
  const [hero, ...rest] = articles;
  const secondary = rest.slice(0, 4);
  const gridArticles = rest.slice(4);
  const ranked = rest.slice(0, 5);

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd(articles.slice(0, 20), locale, `${(channel as any).name} latest news`)) }} />

      <section className="np-lead">
        <div>
          {hero ? <ArticleCard article={hero} locale={locale} large /> : <div className="card">{t('common.loading')}</div>}
        </div>
        <div className="side">
          <div className="np-sidehead">{t('nav.latest')}</div>
          <div className="np-slist">
            {secondary.map((a) => {
              const i: any = a.i18n[locale] ?? a.i18n[defaultLocale] ?? {};
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
          <div className="np-widget np-rank">
            <span className="wh">{locale === 'ko' ? '많이 본 뉴스' : 'Most read'}</span>
            {ranked.map((a, idx) => {
              const i: any = a.i18n[locale] ?? a.i18n[defaultLocale] ?? {};
              return (
                <a key={a.id} href={`/${locale}/article/${a.slug}`}>
                  <span className="n">{idx + 1}</span><h4>{i.title}</h4>
                </a>
              );
            })}
          </div>
          <div className="np-widget np-mkt">
            <span className="wh">{locale === 'ko' ? '시장 지표' : 'Markets'}</span>
            {MKT.map((m) => (
              <div className="mrow" key={m.nm}>
                <span className="nm">{m.nm}</span>
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

      <section className="reader-workflow-panel" aria-label="Reader workflow" style={{ marginTop: 36 }}>
        <div>
          <p className="affiliate-eyebrow">{locale === 'ko' ? '둘러보기' : 'Explore'}</p>
          <h2 style={{ fontSize: 20, margin: '0 0 6px' }}>{(channel as any).name}</h2>
        </div>
        <div className="reader-workflow-links">
          <a href={`/${locale}`} className="tag">{(channel as any).name}</a>
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
