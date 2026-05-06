import type { Locale } from './i18n';
export type Category = { slug: string; name: Partial<Record<Locale, string>>; };
export type RSSSource = { url: string; category: string; weight?: number; };
export const channel = {
  id: 'CRYPTO',
  name: '크립토데일리',
  tagline: '비트코인·이더리움·디파이를 매일 쉽게',
  description: '비트코인, 이더리움, 알트코인, 디파이, NFT, 규제 뉴스를 초등생도 이해할 수 있게 정리합니다.',
  domain: 'cryptodaily.live',
  accent: 'green',
  keywords: ['비트코인', '이더리움', '암호화폐', '코인', '디파이', '블록체인'],
  geo: { country: 'KR', region: 'Asia', primaryCity: 'Seoul' },
  rssSources: [
    { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', category: 'market' },
    { url: 'https://cointelegraph.com/rss', category: 'breaking' },
    { url: 'https://decrypt.co/feed', category: 'analysis' },
    { url: 'https://www.mk.co.kr/rss/40300001/', category: 'policy' },
    { url: 'https://www.hankyung.com/feed/it', category: 'analysis' }
  ] as RSSSource[],
  categories: [
    { slug: 'breaking', name: { ko: '속보', en: 'Breaking', ja: '速報', zh: '快讯', es: 'Última hora', pt: 'Última hora', de: 'Eilmeldung', fr: 'Dernières', ar: 'عاجل', hi: 'ब्रेकिंग', id: 'Terbaru' } },
    { slug: 'market',   name: { ko: '시장', en: 'Market', ja: '市場', zh: '市场', es: 'Mercado', pt: 'Mercado', de: 'Markt', fr: 'Marché', ar: 'السوق', hi: 'बाज़ार', id: 'Pasar' } },
    { slug: 'policy',   name: { ko: '규제', en: 'Regulation', ja: '規制', zh: '监管', es: 'Regulación', pt: 'Regulação', de: 'Regulierung', fr: 'Régulation', ar: 'تنظيم', hi: 'नियम', id: 'Regulasi' } },
    { slug: 'analysis', name: { ko: '분석', en: 'Analysis', ja: '分析', zh: '分析', es: 'Análisis', pt: 'Análise', de: 'Analyse', fr: 'Analyse', ar: 'تحليل', hi: 'विश्लेषण', id: 'Analisis' } }
  ] as Category[]
};
export type ChannelConfig = typeof channel;
