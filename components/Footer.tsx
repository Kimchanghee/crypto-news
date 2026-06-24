import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { channel } from '@/channel.config';
import { defaultLocale, type Locale } from '@/i18n';
import { getChannelLocale } from '@/lib/channel-locale';

export function Footer({ locale }: { locale: Locale }) {
  const t = useTranslations();
  const cats: any[] = (channel as any).categories || [];
  const site = getChannelLocale(locale);
  const copyright = t('footer.copyright', { year: new Date().getFullYear() }).replace('{{CHANNEL_NAME}}', site.name);
  return (
    <footer className="np-footer"><div className="in">
      <div className="np-fcols">
        <div>
          <div className="flogo">{site.name}</div>
          <div className="ftag">{site.description || site.tagline}</div>
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
      <div className="np-fbar"><span>{copyright}</span><span className="sp" /></div>
    </div></footer>
  );
}
