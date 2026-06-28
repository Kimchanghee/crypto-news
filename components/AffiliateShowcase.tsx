import { channel } from '@/channel.config';
import type { Locale } from '@/i18n';
import { AdSlot } from '@/components/AdSlot';
import { CoupangBanner } from '@/components/CoupangBanner';
import { channelLabel, getChannelLocale } from '@/lib/channel-locale';

type Placement = 'sidebar' | 'article-lead' | 'article';

type Props = {
  locale: Locale;
  placement?: Placement;
};

type Offer = {
  id: 'coupang';
  label: string;
  href?: string;
  badge: string;
  note: string;
};

const AFFILIATE_COPY: Record<Locale, {
  eyebrow: string;
  sidebarTitle: string;
  articleTitle: string;
  sidebarDescription: string;
  articleDescription: string;
  cta: string;
  disclosure: string;
  badge: string;
  note: string;
}> = {
  ko: {
    eyebrow: '제휴 추천',
    sidebarTitle: '독자 관심도가 높은 추천 링크',
    articleTitle: '이 기사와 함께 많이 보는 추천 링크',
    sidebarDescription: '일반 배너보다 구매 의도가 높은 방문자를 겨냥한 제휴 링크입니다.',
    articleDescription: '기사 흐름을 해치지 않으면서 구매 전환 가능성이 높은 링크만 골랐습니다.',
    cta: '바로 보기',
    disclosure: '제휴 링크가 포함될 수 있으며, 구매 시 수수료를 받을 수 있습니다.',
    badge: '국내 전환용',
    note: '국내 배송과 즉시 구매 성향이 강한 방문자용'
  },
  en: {
    eyebrow: 'Partner picks',
    sidebarTitle: 'High-intent links for engaged readers',
    articleTitle: 'Relevant partner links for this story',
    sidebarDescription: 'These placements target visitors closer to a purchase decision than standard display ads.',
    articleDescription: 'A lightweight commerce block designed to add monetization without breaking reading flow.',
    cta: 'View offer',
    disclosure: 'This module may include affiliate links that earn a commission from qualifying purchases.',
    badge: 'KR conversion',
    note: 'Good fit for Korea-based visitors ready to buy.'
  },
  ja: {
    eyebrow: '提携リンク',
    sidebarTitle: '関心の高い読者向けリンク',
    articleTitle: 'この記事と一緒に確認したい提携リンク',
    sidebarDescription: '購入意向の高い読者に向けた提携リンクです。',
    articleDescription: '読みやすさを保ちながら収益化を補うリンクです。',
    cta: '見る',
    disclosure: 'この欄には、購入時に手数料が発生する提携リンクが含まれる場合があります。',
    badge: '韓国向け',
    note: '韓国配送や即時購入を検討する読者に適しています。'
  },
  zh: {
    eyebrow: '合作推荐',
    sidebarTitle: '面向高意向读者的推荐链接',
    articleTitle: '与本文相关的合作链接',
    sidebarDescription: '这些链接适合接近购买决策的读者。',
    articleDescription: '在不打断阅读的情况下补充商业化入口。',
    cta: '查看',
    disclosure: '本模块可能包含联盟链接，符合条件的购买可能产生佣金。',
    badge: '韩国转化',
    note: '适合在韩国购物或准备购买的读者。'
  },
  es: {
    eyebrow: 'Enlaces afiliados',
    sidebarTitle: 'Enlaces para lectores con alta intención',
    articleTitle: 'Enlaces relevantes para esta historia',
    sidebarDescription: 'Ubicaciones pensadas para lectores más cercanos a una decisión de compra.',
    articleDescription: 'Un bloque comercial ligero que no interrumpe la lectura.',
    cta: 'Ver oferta',
    disclosure: 'Este módulo puede incluir enlaces afiliados que generan comisión por compras elegibles.',
    badge: 'Conversión KR',
    note: 'Útil para lectores en Corea listos para comprar.'
  },
  pt: {
    eyebrow: 'Links afiliados',
    sidebarTitle: 'Links para leitores com alta intenção',
    articleTitle: 'Links relevantes para esta notícia',
    sidebarDescription: 'Posições voltadas a leitores mais próximos da compra.',
    articleDescription: 'Um bloco comercial leve que não quebra o fluxo de leitura.',
    cta: 'Ver oferta',
    disclosure: 'Este módulo pode incluir links afiliados que geram comissão em compras qualificadas.',
    badge: 'Conversão KR',
    note: 'Adequado para leitores na Coreia prontos para comprar.'
  },
  de: {
    eyebrow: 'Partnerlinks',
    sidebarTitle: 'Links für Leser mit hoher Kaufabsicht',
    articleTitle: 'Passende Partnerlinks zu diesem Beitrag',
    sidebarDescription: 'Platzierungen für Leser, die näher an einer Kaufentscheidung sind.',
    articleDescription: 'Ein schlanker Commerce-Block, der den Lesefluss nicht stört.',
    cta: 'Angebot ansehen',
    disclosure: 'Dieses Modul kann Affiliate-Links enthalten, die bei qualifizierten Käufen Provisionen auslösen.',
    badge: 'KR-Conversions',
    note: 'Geeignet für kaufbereite Leser in Korea.'
  },
  fr: {
    eyebrow: 'Liens partenaires',
    sidebarTitle: 'Liens pour lecteurs à forte intention',
    articleTitle: 'Liens partenaires liés à cet article',
    sidebarDescription: 'Des emplacements pour les lecteurs proches d’une décision d’achat.',
    articleDescription: 'Un bloc commercial léger qui respecte le fil de lecture.',
    cta: 'Voir l’offre',
    disclosure: 'Ce module peut contenir des liens affiliés générant une commission sur les achats éligibles.',
    badge: 'Conversion KR',
    note: 'Adapté aux lecteurs en Corée prêts à acheter.'
  },
  ar: {
    eyebrow: 'روابط شريكة',
    sidebarTitle: 'روابط للقراء ذوي نية شراء مرتفعة',
    articleTitle: 'روابط شريكة مرتبطة بهذه القصة',
    sidebarDescription: 'مواضع تناسب القراء الأقرب إلى قرار الشراء.',
    articleDescription: 'كتلة تجارية خفيفة لا تقطع تدفق القراءة.',
    cta: 'عرض العرض',
    disclosure: 'قد يحتوي هذا القسم على روابط تابعة تمنح عمولة عند الشراء المؤهل.',
    badge: 'تحويل كوريا',
    note: 'مناسب للقراء في كوريا المستعدين للشراء.'
  },
  hi: {
    eyebrow: 'पार्टनर लिंक',
    sidebarTitle: 'अधिक रुचि वाले पाठकों के लिए लिंक',
    articleTitle: 'इस लेख से जुड़े पार्टनर लिंक',
    sidebarDescription: 'ये लिंक खरीद निर्णय के करीब पाठकों के लिए हैं।',
    articleDescription: 'पढ़ने के प्रवाह को तोड़े बिना हल्का कमर्शियल ब्लॉक।',
    cta: 'ऑफर देखें',
    disclosure: 'इस मॉड्यूल में affiliate links हो सकते हैं जिनसे योग्य खरीद पर कमीशन मिल सकता है।',
    badge: 'KR conversion',
    note: 'कोरिया में खरीदने को तैयार पाठकों के लिए उपयुक्त।'
  },
  id: {
    eyebrow: 'Tautan mitra',
    sidebarTitle: 'Tautan untuk pembaca berniat tinggi',
    articleTitle: 'Tautan mitra yang relevan dengan berita ini',
    sidebarDescription: 'Penempatan untuk pembaca yang lebih dekat ke keputusan membeli.',
    articleDescription: 'Blok komersial ringan yang tidak mengganggu alur baca.',
    cta: 'Lihat penawaran',
    disclosure: 'Modul ini dapat memuat tautan afiliasi yang menghasilkan komisi dari pembelian memenuhi syarat.',
    badge: 'Konversi KR',
    note: 'Cocok untuk pembaca di Korea yang siap membeli.'
  }
};

function getCopy(locale: Locale, placement: Placement) {
  const copy = AFFILIATE_COPY[locale] || AFFILIATE_COPY.en;
  return {
    eyebrow: copy.eyebrow,
    title: placement === 'sidebar' ? copy.sidebarTitle : copy.articleTitle,
    description: placement === 'sidebar' ? copy.sidebarDescription : copy.articleDescription,
    cta: copy.cta,
    disclosure: copy.disclosure,
    badge: copy.badge,
    note: copy.note
  };
}

function getOffers(locale: Locale, copy: ReturnType<typeof getCopy>): Offer[] {
  // Official Coupang Partners short link. Env can override per site.
  const coupangPartnerUrl = process.env.NEXT_PUBLIC_COUPANG_FALLBACK_URL || 'https://link.coupang.com/a/efySALPmDc';

  const offers: Offer[] = [
    {
      id: 'coupang',
      label: locale === 'ko' ? '쿠팡 파트너스' : 'Coupang Partners',
      href: process.env.NEXT_PUBLIC_COUPANG_PARTNERS_URL || coupangPartnerUrl,
      badge: copy.badge,
      note: copy.note
    }
  ];

  return offers.filter((offer) => Boolean(offer.href));
}

export function AffiliateShowcase({ locale, placement = 'article' }: Props) {
  const copy = getCopy(locale, placement);
  const offers = getOffers(locale, copy);
  if (offers.length === 0) return null;

  const site = getChannelLocale(locale);
  const compact = placement === 'sidebar';
  const bannerWidth = placement === 'article-lead' ? 680 : 300;
  const bannerHeight = placement === 'article-lead' ? 140 : 250;
  const bannerTemplate = placement === 'article-lead' ? 'banner' : 'carousel';
  const affiliatePlacement = placement === 'sidebar' ? 'sidebar' : placement === 'article-lead' ? 'article-lead' : 'article-bottom';
  const hasAdsterra = placement === 'article';

  return (
    <section
      className={`affiliate-module affiliate-module-placement-${placement} ${compact ? 'affiliate-module-compact' : ''}`}
      aria-label={copy.title}
      data-affiliate-module="true"
      data-affiliate-placement={affiliatePlacement}
    >
      <div className="affiliate-module-header">
        <p className="affiliate-eyebrow">{copy.eyebrow}</p>
        <h2 className="affiliate-title">{copy.title}</h2>
        <p className="affiliate-description">{copy.description}</p>
      </div>

      <div className="affiliate-media-frame">
        <CoupangBanner
          subId={`${channel.id || 'channel'}-${affiliatePlacement}`}
          width={bannerWidth}
          height={bannerHeight}
          template={bannerTemplate}
          loading={placement === 'article-lead' ? 'eager' : 'lazy'}
        />
      </div>

      <div className={`affiliate-grid ${compact ? 'affiliate-grid-compact' : ''}`}>
        {offers.map((offer) => (
          <a
            key={offer.id}
            href={offer.href}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            className="affiliate-card"
            data-affiliate-network={offer.id}
            data-affiliate-placement={affiliatePlacement}
          >
            <div className="affiliate-card-top">
              <span className="affiliate-brand">{offer.label}</span>
              <span className="affiliate-badge">{offer.badge}</span>
            </div>
            <p className="affiliate-note">{offer.note}</p>
            <span className="affiliate-cta">{copy.cta}</span>
          </a>
        ))}
      </div>


      {placement === 'article' && hasAdsterra && (
        <div className="safe-inline-adsterra-news">
          <p>{channelLabel('advertisement', locale)}</p>
          <AdSlot
            network="adsterra"
            zoneId="3e4bce1484f612934ea3087016160d51"
            format="banner"
            size={{ w: 300, h: 250 }}
            className="safe-inline-adsterra-frame"
            slotId="article-bottom-inline"
          />
        </div>
      )}

      <p className="affiliate-disclosure">
        {copy.disclosure} {site.name}
      </p>
    </section>
  );
}
