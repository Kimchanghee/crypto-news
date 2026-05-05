import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LocaleSwitcher } from './LocaleSwitcher';
import { channel } from '@/channel.config';
import type { Locale } from '@/i18n';

export function Header({ locale }: { locale: Locale }) {
  const t = useTranslations();
  return (
    <header style={{ borderBottom: '1px solid var(--soft)', background: 'var(--paper)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <Link href={`/${locale}`} style={{ textDecoration: 'none', color: 'var(--ink)', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: 'Poppins', fontWeight: 700, fontSize: 22, letterSpacing: -0.4 }}>{channel.name}</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t('site.tagline')}</span>
        </Link>
        <nav style={{ display: 'flex', gap: 18, fontFamily: 'Poppins', fontSize: 14 }}>
          <Link href={`/${locale}`} style={{ color: 'var(--ink)' }}>{t('nav.home')}</Link>
          <Link href={`/${locale}#categories`} style={{ color: 'var(--ink)' }}>{t('nav.categories')}</Link>
          <Link href={`/${locale}#latest`} style={{ color: 'var(--ink)' }}>{t('nav.latest')}</Link>
          <LocaleSwitcher current={locale} />
        </nav>
      </div>
    </header>
  );
}
