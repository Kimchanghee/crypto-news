import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { channel } from '@/channel.config';
import type { Locale } from '@/i18n';

export function Footer({ locale }: { locale: Locale }) {
  const t = useTranslations();
  return (
    <footer style={{ marginTop: 64, borderTop: '1px solid var(--soft)', background: 'var(--paper)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 24, color: 'var(--ink)' }}>
        <div>
          <div style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: 18 }}>{channel.name}</div>
          <p style={{ marginTop: 6, color: 'var(--muted)', fontSize: 13 }}>{channel.description}</p>
        </div>
        <div>
          <div style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{t('nav.categories')}</div>
          <ul style={{ listStyle: 'none', padding: 0, fontSize: 13 }}>
            {channel.categories.map((c) => (
              <li key={c.slug}><Link href={`/${locale}/category/${c.slug}`}>{c.name[locale] ?? c.name.en ?? c.slug}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <div style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{t('footer.contact')}</div>
          <ul style={{ listStyle: 'none', padding: 0, fontSize: 13 }}>
            <li><Link href={`/${locale}/privacy`}>{t('footer.privacy')}</Link></li>
            <li><Link href={`/${locale}/terms`}>{t('footer.terms')}</Link></li>
          </ul>
        </div>
      </div>
      <div style={{ borderTop: '1px solid var(--soft)', textAlign: 'center', padding: '16px 24px', color: 'var(--muted)', fontSize: 12 }}>
        {t('footer.copyright', { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
}
