import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LocaleSwitcher } from './LocaleSwitcher';
import { channel } from '@/channel.config';
import { defaultLocale, type Locale } from '@/i18n';
import { getChannelLocale } from '@/lib/channel-locale';

const TICKER = [
  { id: 'bitcoin', pr: '$103,420', d: 'up', ch: '▲ 1.24%' },
  { id: 'nasdaq', pr: '18,642', d: 'up', ch: '▲ 0.41%' },
  { id: 'sp500', pr: '5,430', d: 'up', ch: '▲ 0.33%' },
  { id: 'kospi', pr: '2,704', d: 'dn', ch: '▼ 0.22%' },
  { id: 'usdkrw', pr: '1,386.4', d: 'up', ch: '▲ 3.10' },
  { id: 'gold', pr: '$2,418', d: 'up', ch: '▲ 0.55%' },
];

const TICKER_NAMES: Record<string, Partial<Record<Locale, string>>> = {
  bitcoin: { ko: '비트코인', en: 'Bitcoin', ja: 'ビットコイン', zh: '比特币', es: 'Bitcoin', pt: 'Bitcoin', de: 'Bitcoin', fr: 'Bitcoin', ar: 'بيتكوين', hi: 'बिटकॉइन', id: 'Bitcoin' },
  nasdaq: { ko: '나스닥', en: 'Nasdaq', ja: 'ナスダック', zh: '纳斯达克', es: 'Nasdaq', pt: 'Nasdaq', de: 'Nasdaq', fr: 'Nasdaq', ar: 'ناسداك', hi: 'नैस्डैक', id: 'Nasdaq' },
  sp500: { ko: 'S&P 500', en: 'S&P 500', ja: 'S&P 500', zh: 'S&P 500', es: 'S&P 500', pt: 'S&P 500', de: 'S&P 500', fr: 'S&P 500', ar: 'S&P 500', hi: 'S&P 500', id: 'S&P 500' },
  kospi: { ko: '코스피', en: 'KOSPI', ja: 'KOSPI', zh: 'KOSPI', es: 'KOSPI', pt: 'KOSPI', de: 'KOSPI', fr: 'KOSPI', ar: 'كوسبي', hi: 'KOSPI', id: 'KOSPI' },
  usdkrw: { ko: '원/달러', en: 'USD/KRW', ja: 'ドル/ウォン', zh: '美元/韩元', es: 'USD/KRW', pt: 'USD/KRW', de: 'USD/KRW', fr: 'USD/KRW', ar: 'دولار/وون', hi: 'USD/KRW', id: 'USD/KRW' },
  gold: { ko: '금', en: 'Gold', ja: '金', zh: '黄金', es: 'Oro', pt: 'Ouro', de: 'Gold', fr: 'Or', ar: 'الذهب', hi: 'सोना', id: 'Emas' }
};

function tickerName(id: string, locale: Locale) {
  return TICKER_NAMES[id]?.[locale] ?? TICKER_NAMES[id]?.en ?? id;
}

export function Header({ locale }: { locale: Locale }) {
  const t = useTranslations();
  const cats: any[] = (channel as any).categories || [];
  const site = getChannelLocale(locale);
  const dateStr = new Date().toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  return (
    <>
      <div className="np-util"><div className="in">
        <span>{dateStr}</span><span className="sp" />
        <Link href={`/${locale}`}>{t('nav.home')}</Link>
        <a href={`/${locale}/rss.xml`}>RSS</a>
      </div></div>
      <div className="np-ticker"><div className="in">
        {TICKER.map((x) => (
          <span className="tk" key={x.id}>
            <span className="nm">{tickerName(x.id, locale)}</span>
            <span className="pr">{x.pr}</span>
            <span className={x.d === 'up' ? 'up' : 'dn'}>{x.ch}</span>
          </span>
        ))}
      </div></div>
      <div className="np-mast">
        <Link href={`/${locale}`} style={{ textDecoration: 'none' }}>
          <div className="logo">{site.name}<span className="dot">.</span></div>
        </Link>
        {site.tagline ? (
          <div style={{ marginTop: 9, fontSize: 13, color: 'var(--muted)' }}>{site.tagline}</div>
        ) : null}
      </div>
      <div className="np-nav"><div className="in">
        <nav className="menu">
          <Link href={`/${locale}`}>{t('nav.home')}</Link>
          {cats.map((c) => (
            <Link key={c.slug} href={`/${locale}/category/${c.slug}`} className={c.slug === 'breaking' ? 'breaking' : ''}>
              {c.name?.[locale] ?? c.name?.[defaultLocale] ?? c.slug}
            </Link>
          ))}
        </nav>
        <span className="sp" />
        <div className="tools">
          <LocaleSwitcher current={locale} />
        </div>
      </div></div>
    </>
  );
}
