import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MGIDLoader } from '@/components/MGIDLoader';
import { AdsterraPopunder } from '@/components/AdsterraPopunder';
import { locales, rtlLocales, type Locale } from '@/i18n';
import { organizationJsonLd } from '@/lib/seo';
import { channel } from '@/channel.config';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { locale: Locale } }) {
  const t = await getTranslations({ locale: params.locale, namespace: 'site' });
  return {
    title: { default: t('name'), template: `%s — ${t('name')}` },
    description: t('description'),
    alternates: { canonical: `/${params.locale}`, languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])) },
    metadataBase: new URL(process.env.SITE_URL || `https://${channel.domain}`),
    icons: { icon: '/favicon.ico' },
    openGraph: { siteName: t('name'), locale: params.locale, type: 'website' }
  };
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: Locale };
}) {
  if (!locales.includes(locale)) notFound();
  const messages = await getMessages();
  const isRTL = rtlLocales.includes(locale);

  return (
    <div lang={locale} dir={isRTL ? 'rtl' : 'ltr'}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />
      <NextIntlClientProvider messages={messages}>
        <Header locale={locale} />
        <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>{children}</main>
        <Footer locale={locale} />
        <MGIDLoader />
        <AdsterraPopunder />
      </NextIntlClientProvider>
    </div>
  );
}
