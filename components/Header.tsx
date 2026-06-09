import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LocaleSwitcher } from './LocaleSwitcher';
import { channel } from '@/channel.config';
import { defaultLocale, type Locale } from '@/i18n';

const TICKER = [
  { nm: '비트코인', pr: '$103,420', d: 'up', ch: '▲ 1.24%' },
  { nm: '나스닥', pr: '18,642', d: 'up', ch: '▲ 0.41%' },
  { nm: 'S&P 500', pr: '5,430', d: 'up', ch: '▲ 0.33%' },
  { nm: '코스피', pr: '2,704', d: 'dn', ch: '▼ 0.22%' },
  { nm: '원/달러', pr: '1,386.4', d: 'up', ch: '▲ 3.10' },
  { nm: '금', pr: '$2,418', d: 'up', ch: '▲ 0.55%' },
];

export function Header({ locale }: { locale: Locale }) {
  const t = useTranslations();
  const cats: any[] = (channel as any).categories || [];
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
          <span className="tk" key={x.nm}>
            <span className="nm">{x.nm}</span>
            <span className="pr">{x.pr}</span>
            <span className={x.d === 'up' ? 'up' : 'dn'}>{x.ch}</span>
          </span>
        ))}
      </div></div>
      <div className="np-mast">
        <Link href={`/${locale}`} style={{ textDecoration: 'none' }}>
          <div className="logo">{(channel as any).name}<span className="dot">.</span></div>
        </Link>
        {(channel as any).tagline ? (
          <div style={{ marginTop: 9, fontSize: 13, color: 'var(--muted)' }}>{(channel as any).tagline}</div>
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
