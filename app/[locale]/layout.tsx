import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MGIDLoader } from '@/components/MGIDLoader';
import { AdsterraPopunder } from '@/components/AdsterraPopunder';
import { AdsterraSocialBar } from '@/components/AdsterraSocialBar';
import { locales, rtlLocales, type Locale } from '@/i18n';
import { SITE_URL, alternateLanguages, organizationJsonLd, websiteJsonLd } from '@/lib/seo';
import { getChannelLocale } from '@/lib/channel-locale';

export const dynamic = 'force-dynamic';
const GA_MEASUREMENT_ID = 'G-MYM8Z3KX52';

export async function generateMetadata({ params }: { params: { locale: Locale } }) {
  const t = await getTranslations({ locale: params.locale, namespace: 'site' });
  const site = getChannelLocale(params.locale);
  const channelName = site.name || t('name');
  return {
    title: { /* seo-title-v2 */ default: site.tagline ? `${channelName} — ${site.tagline}` : channelName, template: `%s — ${channelName}` },
    description: site.description || t('description'),
    applicationName: channelName,
    keywords: site.keywords,
    alternates: {
      canonical: `${SITE_URL}/${params.locale}`,
      languages: alternateLanguages(''),
      types: { 'application/rss+xml': `/${params.locale}/rss.xml` }
    },
    metadataBase: new URL(SITE_URL),
    manifest: '/manifest.json',
    themeColor: '#0e1116',
    icons: {
      icon: '/favicon.ico',
      apple: '/apple-touch-icon.svg',
      shortcut: '/icon-192.svg'
    },
    openGraph: {
      siteName: channelName,
      locale: params.locale,
      type: 'website',
      url: `${SITE_URL}/${params.locale}`,
      title: channelName,
      description: site.description || t('description'),
      images: [{ url: '/icon-512.svg', width: 512, height: 512, alt: channelName }]
    },
    twitter: {
      card: 'summary_large_image',
      title: channelName,
      description: site.description || t('description'),
      images: ['/icon-512.svg']
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1
      }
    }
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
    <html lang={locale} dir={isRTL ? 'rtl' : 'ltr'}>
      <head>
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}',{page_path:window.location.pathname});`,
          }}
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd(locale)) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd(locale)) }}
        />
        <NextIntlClientProvider messages={messages}>
          <Header locale={locale} />
          <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>{children}</main>
          <Footer locale={locale} />
          <MGIDLoader />
          <AdsterraPopunder />
          <AdsterraSocialBar />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
