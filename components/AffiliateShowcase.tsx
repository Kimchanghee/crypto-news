import { channel } from '@/channel.config';
import type { Locale } from '@/i18n';

type Placement = 'sidebar' | 'article';

type Props = {
  locale: Locale;
  placement?: Placement;
};

type Offer = {
  id: 'coupang' | 'aliexpress' | 'amazon';
  label: string;
  href?: string;
  badge: string;
  note: string;
};

const AMAZON_TAG = 'amazonfi00681-20';

function getCopy(locale: Locale, placement: Placement) {
  if (locale === 'ko') {
    return {
      eyebrow: '제휴 추천',
      title: placement === 'sidebar' ? '독자 관심도가 높은 추천 링크' : '이 기사와 함께 많이 보는 추천 링크',
      description:
        placement === 'sidebar'
          ? '일반 배너보다 구매 의도가 높은 방문자를 겨냥한 제휴 링크입니다.'
          : '기사 흐름을 해치지 않으면서 구매 전환 가능성이 높은 링크만 골랐습니다.',
      cta: '바로 보기',
      disclosure: '제휴 링크가 포함될 수 있으며, 구매 시 수수료를 받을 수 있습니다.'
    };
  }

  return {
    eyebrow: 'Partner picks',
    title: placement === 'sidebar' ? 'High-intent links for engaged readers' : 'Relevant partner links for this story',
    description:
      placement === 'sidebar'
        ? 'These placements target visitors closer to a purchase decision than standard display ads.'
        : 'A lightweight commerce block designed to add monetization without breaking reading flow.',
    cta: 'View offer',
    disclosure: 'This module may include affiliate links that earn a commission from qualifying purchases.'
  };
}

function getOffers(locale: Locale): Offer[] {
  const isKo = locale === 'ko';
  const keyword = channel.keywords?.[0] || channel.name;
  const amazonUrl = new URL('https://www.amazon.com/s');
  amazonUrl.searchParams.set('k', keyword);
  amazonUrl.searchParams.set('tag', AMAZON_TAG);
  amazonUrl.searchParams.set('linkCode', 'll2');
  amazonUrl.searchParams.set('language', 'en_US');

  const offers: Offer[] = [
    {
      id: 'coupang',
      label: isKo ? '쿠팡 파트너스' : 'Coupang Partners',
      href: process.env.NEXT_PUBLIC_COUPANG_PARTNERS_URL,
      badge: isKo ? '국내 전환용' : 'KR conversion',
      note: isKo ? '국내 배송과 즉시 구매 성향이 강한 방문자용' : 'Good fit for Korea-based visitors ready to buy.'
    },
    {
      id: 'aliexpress',
      label: isKo ? '알리익스프레스' : 'AliExpress',
      href: process.env.NEXT_PUBLIC_ALIEXPRESS_AFFILIATE_URL,
      badge: isKo ? '가성비 상품' : 'Budget picks',
      note: isKo ? '가성비 전자기기와 데스크 셋업 관심층에 적합' : 'Works well for price-sensitive gadget and desk-tool traffic.'
    },
    {
      id: 'amazon',
      label: isKo ? '아마존 어필리에이트' : 'Amazon Associates',
      href: process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_URL || amazonUrl.toString(),
      badge: isKo ? '글로벌 상품' : 'Global reach',
      note: isKo ? '도서, 업무 도구, 글로벌 구매 수요 대응' : 'Useful for books, work tools, and international shoppers.'
    }
  ];

  return offers.filter((offer) => Boolean(offer.href));
}

export function AffiliateShowcase({ locale, placement = 'article' }: Props) {
  const offers = getOffers(locale);
  if (offers.length === 0) return null;

  const copy = getCopy(locale, placement);
  const compact = placement === 'sidebar';

  return (
    <section className={`affiliate-module ${compact ? 'affiliate-module-compact' : ''}`} aria-label={copy.title}>
      <div className="affiliate-module-header">
        <p className="affiliate-eyebrow">{copy.eyebrow}</p>
        <h2 className="affiliate-title">{copy.title}</h2>
        <p className="affiliate-description">{copy.description}</p>
      </div>

      <div className={`affiliate-grid ${compact ? 'affiliate-grid-compact' : ''}`}>
        {offers.map((offer) => (
          <a
            key={offer.id}
            href={offer.href}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            className="affiliate-card"
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

      <p className="affiliate-disclosure">
        {copy.disclosure} {channel.name}
      </p>
    </section>
  );
}
