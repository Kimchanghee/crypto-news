import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { channel } from '@/channel.config';
import { defaultLocale, type Locale } from '@/i18n';

export function Footer({ locale }: { locale: Locale }) {
  const t = useTranslations();
  const cats: any[] = (channel as any).categories || [];
  return (
    <footer className="np-footer"><div className="in">
      <div className="np-fcols">
        <div>
          <div className="flogo">{(channel as any).name}</div>
          <div className="ftag">{(channel as any).description || (channel as any).tagline}</div>
        </div>
        <div>
          <h5>{t('nav.categories')}</h5>
          <ul>
            {cats.map((c) => (
              <li key={c.slug}><Link href={`/${locale}/category/${c.slug}`}>{c.name?.[locale] ?? c.name?.[defaultLocale] ?? c.slug}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h5>{t('footer.contact')}</h5>
          <ul>
            <li><Link href={`/${locale}/privacy`}>{t('footer.privacy')}</Link></li>
            <li><Link href={`/${locale}/terms`}>{t('footer.terms')}</Link></li>
          </ul>
        </div>
      </div>
      <div className="np-fbar"><span>{t('footer.copyright', { year: new Date().getFullYear() })}</span><span className="sp" /></div>
    </div></footer>
  );
}
