import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { ArticleCard } from '@/components/ArticleCard';
import { AffiliateShowcase } from '@/components/AffiliateShowcase';
import { AdSlot } from '@/components/AdSlot';
import { channel } from '@/channel.config';
import { defaultLocale, type Locale } from '@/i18n';
import { itemListJsonLd } from '@/lib/seo';
import { channelLabel, getChannelLocale } from '@/lib/channel-locale';

export const revalidate = 120;

export async function generateMetadata({ params }: { params: { locale: Locale; slug: string } }) {
  const cat = channel.categories.find((c) => c.slug === params.slug);
  if (!cat) return {};
  const name = cat.name[params.locale] ?? cat.name[defaultLocale] ?? params.slug;
  const site = getChannelLocale(params.locale);
  return {
    title: name,
    description: `${site.name} ${name}: ${site.description}`,
    keywords: [...site.keywords, name, params.slug],
    alternates: {
      canonical: `/${params.locale}/category/${params.slug}`,
      languages: Object.fromEntries(Object.keys(cat.name).map((l) => [l, `/${l}/category/${params.slug}`]))
    },
    openGraph: {
      title: `${name} — ${site.name}`,
      description: `${site.name} ${name}: ${site.description}`,
      type: 'website'
    },
    robots: { index: true, follow: true }
  };
}

export default async function CategoryPage({ params }: { params: { locale: Locale; slug: string } }) {
  const cat = channel.categories.find((c) => c.slug === params.slug);
  if (!cat) notFound();
  let items = await db.listByCategory(channel.id, params.slug, 60);
  if (items.length === 0) {
    items = await db.listLatest(channel.id, 60);
  }
  const name = cat.name[params.locale] ?? cat.name[defaultLocale] ?? params.slug;
  const site = getChannelLocale(params.locale);
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd(items.slice(0, 30), params.locale, `${site.name} ${name}`)) }}
      />
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>{name}</h1>
      <p style={{ color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 18px' }}>
        {site.name}: {channelLabel('categoryIntro', params.locale)}
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 20px' }}>
        <AdSlot network="adsterra" />
      </div>
      <div data-category-monetization style={{ margin: '18px 0 22px' }}>
        <AffiliateShowcase locale={params.locale} placement="article" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginTop: 16 }}>
        {items.flatMap((a, idx) => {
          const card = <ArticleCard key={a.id} article={a} locale={params.locale} />;
          return idx > 0 && idx % 8 === 0
            ? [<div key={`ad-${idx}`} style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', margin: '6px 0' }}><AdSlot network="adsterra" /></div>, card]
            : [card];
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0 4px' }}>
        <AdSlot network="adsterra" />
      </div>
    </div>
  );
}
